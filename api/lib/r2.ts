import { createHash } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env";

/**
 * Cloudflare R2 object storage (S3-compatible). Product photos are uploaded
 * here so the database only ever stores a short public URL instead of a
 * multi-hundred-KB base64 blob — smaller rows, and images are served from
 * Cloudflare's edge cache instead of round-tripping through the app server.
 *
 * If R2 isn't configured (e.g. local dev without the env vars set), every
 * export here degrades to "not configured" so callers can fall back to the
 * original data-URL behavior with zero regression.
 */

const r2Configured =
  !!env.r2AccountId &&
  !!env.r2AccessKeyId &&
  !!env.r2SecretAccessKey &&
  !!env.r2BucketName;

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    });
  }
  return client;
}

const DATA_URL_RE = /^data:([\w./+-]+);base64,(.+)$/s;

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export function isR2Configured(): boolean {
  return r2Configured;
}

/**
 * Uploads a base64 data URL to R2 and returns its public CDN URL, or `null`
 * if R2 isn't configured, the input isn't a data URL, or the upload fails
 * for any reason — always fail soft so the caller can keep the data URL.
 */
export async function uploadDataUrlToR2(
  dataUrl: string,
  keyPrefix = "products",
): Promise<string | null> {
  if (!r2Configured) return null;

  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return null;

  const [, mime, base64] = match;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return null;
  }

  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 32);
  const key = `${keyPrefix}/${hash}.${extensionForMime(mime)}`;

  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: env.r2BucketName,
        Key: key,
        Body: buffer,
        ContentType: mime,
        // Content-addressed key — safe to cache forever at the edge.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (err) {
    console.error("[r2] Upload failed", err);
    return null;
  }

  const base = env.r2PublicBaseUrl.replace(/\/+$/, "");
  return `${base}/${key}`;
}
