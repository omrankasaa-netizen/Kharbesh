import { getDb } from "./connection";
import { siteSettings } from "@db/schema";
import { eq } from "drizzle-orm";
import { refreshDriveAccessToken } from "../lib/googleDrive";

/**
 * Stores the one-time Google Drive offline-access grant (refresh token) so
 * the "Import from Drive" admin tool can list/download folder contents on
 * its own going forward, without any agent involvement or a separate
 * Google Cloud API key. Lives in `site_settings` under its own key —
 * completely separate from the staff Google sign-in session, so
 * disconnecting Drive never logs anyone out of /admin.
 */

const SETTINGS_KEY = "google_drive_connection";

type DriveConnectionValue = {
  refreshToken: string;
  connectedEmail?: string | null;
  connectedAt: string;
};

export async function getDriveConnection(): Promise<DriveConnectionValue | null> {
  const db = getDb();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, SETTINGS_KEY));
  const value = row?.value as DriveConnectionValue | undefined;
  if (!value?.refreshToken) return null;
  return value;
}

export async function isDriveConnected(): Promise<boolean> {
  return (await getDriveConnection()) !== null;
}

export async function getDriveConnectionStatus() {
  const conn = await getDriveConnection();
  return {
    connected: !!conn,
    connectedEmail: conn?.connectedEmail ?? null,
    connectedAt: conn?.connectedAt ?? null,
  };
}

export async function storeDriveRefreshToken(
  refreshToken: string,
  connectedEmail?: string | null,
): Promise<void> {
  const value: DriveConnectionValue = {
    refreshToken,
    connectedEmail: connectedEmail ?? null,
    connectedAt: new Date().toISOString(),
  };
  await getDb()
    .insert(siteSettings)
    .values({ key: SETTINGS_KEY, value })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

export async function disconnectDrive(): Promise<void> {
  await getDb().delete(siteSettings).where(eq(siteSettings.key, SETTINGS_KEY));
}

/** Exchanges the stored refresh token for a fresh access token. Throws
 * (caller surfaces "not connected") if no grant has been stored yet. */
export async function getDriveAccessToken(): Promise<string> {
  const conn = await getDriveConnection();
  if (!conn) throw new Error("DRIVE_NOT_CONNECTED");
  return refreshDriveAccessToken(conn.refreshToken);
}
