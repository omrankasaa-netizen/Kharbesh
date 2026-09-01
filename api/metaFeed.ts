import type { Context } from "hono";
import { listMetaFeedRows, type MetaFeedRow } from "./queries/catalog";

// Meta Commerce Manager (and Google Merchant Center) both consume this
// column set for a standard CSV data feed. Order matches Meta's own
// documented layout: required fields first, then the recommended apparel
// attributes. See https://developers.facebook.com/docs/marketing-api/catalog/reference/
const FEED_COLUMNS: (keyof MetaFeedRow)[] = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "sale_price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "color",
  "gender",
  "age_group",
  "item_group_id",
  "product_type",
];

/** RFC 4217/4180-style CSV field quoting: always quote (safe for commas,
 *  quotes, and the em dash we use in titles), doubling any embedded quotes. */
function csvField(value: string | null | undefined): string {
  const text = value ?? "";
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildMetaFeedCsv(rows: MetaFeedRow[]): string {
  const header = FEED_COLUMNS.join(",");
  const lines = rows.map((row) => FEED_COLUMNS.map((col) => csvField(row[col] as string | null)).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}

/** Public, unauthenticated feed endpoint for Meta Commerce Manager's
 *  scheduled data-feed fetch (and reusable for Google Merchant Center later
 *  — both read the same CSV shape). Meta re-fetches this URL on the
 *  schedule set in Commerce Manager, so it always reflects live catalog
 *  data with no manual re-upload needed. */
export function createMetaFeedHandler() {
  return async (c: Context) => {
    const rows = await listMetaFeedRows();
    const csv = buildMetaFeedCsv(rows);
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Cache-Control", "public, max-age=300");
    return c.body(csv);
  };
}
