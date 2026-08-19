import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { signSessionToken } from "../kimi/session";
import { upsertUser, resolveStaffRole } from "../queries/users";

type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

/**
 * Staff-only Google sign-in. This is intentionally separate from the
 * customer-facing Kimi OAuth flow (api/kimi/auth.ts) — it exists purely so
 * staff can authenticate into /admin/* without a Kimi account, gated by an
 * explicit email allowlist (env.adminAllowedEmails). It reuses the same
 * session cookie/JWT shape (unionId + clientId) so the rest of the app
 * (authedQuery middleware, AdminGuard, findUserByUnionId) needs no changes.
 */

async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: redirectUri,
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google token exchange failed (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<GoogleTokenResponse>;
}

async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const resp = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google userinfo fetch failed (${resp.status}): ${text}`);
  }
  return resp.json() as Promise<GoogleUserInfo>;
}

export function createGoogleOAuthCallbackHandler() {
  return async (c: Context) => {
    if (!env.googleClientId || !env.googleClientSecret) {
      return c.json(
        { error: "Google sign-in is not configured on this server." },
        503,
      );
    }

    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.redirect("/admin/login?error=access_denied", 302);
    }
    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    let redirectUri = "";
    let returnTo = "/admin/dashboard";
    try {
      const decoded = JSON.parse(atob(state));
      if (typeof decoded.redirectUri === "string") {
        redirectUri = decoded.redirectUri;
      }
      if (
        typeof decoded.returnTo === "string" &&
        decoded.returnTo.startsWith("/") &&
        !decoded.returnTo.startsWith("//")
      ) {
        returnTo = decoded.returnTo;
      }
    } catch {
      return c.json({ error: "Invalid state" }, 400);
    }

    try {
      const tokenResp = await exchangeGoogleCode(code, redirectUri);
      const profile = await fetchGoogleUserInfo(tokenResp.access_token);

      const email = profile.email?.trim().toLowerCase();
      const resolvedRole =
        email && profile.email_verified !== false
          ? await resolveStaffRole(email, `google:${profile.sub}`)
          : undefined;
      const isAllowed = !!resolvedRole;

      if (!isAllowed) {
        console.warn(
          `[google-auth] Rejected sign-in for ${email ?? "unknown email"} — not on staff allowlist.`,
        );
        return c.redirect("/admin/login?error=not_authorized", 302);
      }

      // Prefix to keep the identity space distinct from Kimi's unionId.
      const unionId = `google:${profile.sub}`;

      await upsertUser({
        unionId,
        name: profile.name ?? email,
        email,
        avatar: profile.picture,
        role: resolvedRole,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({ unionId, clientId: "google" });
      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect(returnTo, 302);
    } catch (err) {
      console.error("[google-auth] Callback failed", err);
      return c.redirect("/admin/login?error=server_error", 302);
    }
  };
}
