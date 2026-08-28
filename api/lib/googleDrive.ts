import { env } from "./env";

/**
 * Minimal Google Drive v3 client used only by the admin "Import from Drive"
 * tool. Read-only — we only ever list folder children and download file
 * bytes. Auth is a dedicated offline-access OAuth grant (see
 * queries/driveConnection.ts), stored separately from the staff sign-in
 * session so a Drive disconnect never affects who can log into /admin.
 */

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export function driveConsentScope(): string {
  return DRIVE_SCOPE;
}

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

/** Exchanges a one-time auth code (requested with access_type=offline) for
 * tokens. Google only returns `refresh_token` when the user actually saw a
 * consent screen — the caller always passes `prompt=consent` so this is
 * reliable on every connect, including reconnects. */
export async function exchangeDriveCode(
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
    throw new Error(`Google Drive token exchange failed (${resp.status}): ${text}`);
  }
  return resp.json() as Promise<GoogleTokenResponse>;
}

/** Exchanges a stored refresh token for a short-lived access token. */
export async function refreshDriveAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
  });
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Drive token refresh failed (${resp.status}): ${text}`);
  }
  const data = (await resp.json()) as GoogleTokenResponse;
  return data.access_token;
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
};

/** Accepts a raw folder ID or any Drive folder URL/link and returns the ID. */
export function extractDriveFolderId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) return idParam[1];
  // Already looks like a bare Drive ID (no slashes/spaces).
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  throw new Error("Could not find a Google Drive folder ID in that link.");
}

async function driveApiFetch(path: string, accessToken: string): Promise<Response> {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive API request failed (${resp.status}): ${text}`);
  }
  return resp;
}

/** Lists the direct, non-trashed children of a folder (one page — 46
 * design subfolders and a handful of files each comfortably fit under the
 * default 100-item page size, and this is a manual admin action, not a
 * background job that needs to be robust to unbounded folder sizes). */
export async function listDriveChildren(
  folderId: string,
  accessToken: string,
): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType)");
  const resp = await driveApiFetch(
    `files?q=${q}&fields=${fields}&pageSize=200&orderBy=name`,
    accessToken,
  );
  const data = (await resp.json()) as { files?: DriveFile[] };
  return data.files ?? [];
}

export type DownloadedDriveFile = { buffer: Buffer; mimeType: string };

/** Downloads a Drive file's raw bytes (binary uploads only — never a native
 * Google Doc/Sheet, which this tool never touches). Reads the actual
 * served Content-Type off the response instead of trusting the metadata
 * `mimeType` from an earlier `files.list` call, saving a second API call. */
export async function downloadDriveFile(
  fileId: string,
  accessToken: string,
): Promise<DownloadedDriveFile> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive file download failed (${resp.status}): ${text}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  const mimeType = resp.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}
