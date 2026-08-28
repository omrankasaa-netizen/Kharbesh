import type { Context } from "hono";
import { env } from "../lib/env";
import { authenticateRequest } from "../kimi/auth";
import { exchangeDriveCode } from "../lib/googleDrive";
import { storeDriveRefreshToken } from "../queries/driveConnection";

/**
 * Callback for the founder's one-time "Connect Google Drive" consent
 * (drive.readonly, access_type=offline, prompt=consent). Separate from the
 * staff sign-in callback (api/google/auth.ts) on purpose: this one never
 * touches the session cookie, it only stores a refresh token so the
 * "Import from Drive" admin tool can read the founder's Drive going
 * forward. Requires an already-signed-in staff session — a bare Drive
 * grant with no staff check would let anyone who intercepts the redirect
 * attach their own Drive account to the store.
 */
export function createDriveOAuthCallbackHandler() {
  return async (c: Context) => {
    if (!env.googleClientId || !env.googleClientSecret) {
      return c.json({ error: "Google sign-in is not configured on this server." }, 503);
    }

    let staffUser;
    try {
      staffUser = await authenticateRequest(c.req.raw.headers);
    } catch {
      return c.redirect("/admin/login?returnTo=/admin/drive-import", 302);
    }
    if (!["staff", "admin", "super_admin"].includes(staffUser.role ?? "")) {
      return c.redirect("/admin/drive-import?driveError=not_authorized", 302);
    }

    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.redirect("/admin/drive-import?driveError=access_denied", 302);
    }
    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    let redirectUri = "";
    try {
      const decoded = JSON.parse(atob(state));
      if (typeof decoded.redirectUri === "string") redirectUri = decoded.redirectUri;
    } catch {
      return c.json({ error: "Invalid state" }, 400);
    }

    try {
      const tokenResp = await exchangeDriveCode(code, redirectUri);
      if (!tokenResp.refresh_token) {
        // Happens if the founder previously granted this scope without
        // revoking it, so Google skips the consent screen. Asking them to
        // remove Kharbesh's access at myaccount.google.com/permissions and
        // reconnect forces a fresh consent screen with a new refresh token.
        return c.redirect("/admin/drive-import?driveError=no_refresh_token", 302);
      }
      await storeDriveRefreshToken(tokenResp.refresh_token, staffUser.email);
      return c.redirect("/admin/drive-import?driveConnected=1", 302);
    } catch (err) {
      console.error("[drive-auth] Callback failed", err);
      return c.redirect("/admin/drive-import?driveError=server_error", 302);
    }
  };
}
