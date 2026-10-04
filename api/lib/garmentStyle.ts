/**
 * Hoodie style (fabric/type) choice — Autumn Hoodie, Fleeced Winter Hoodie,
 * Heavyweight Hoodie. A customer-facing pick on hoodie product pages, stored
 * on the order line item so the factory knows which blank to pull.
 *
 * The catalog is admin-managed (garment_styles table), so "is this a hoodie
 * style" is decided by name, same heuristic the 3a Zaw2ak form uses.
 */

/** Matches hoodie style names in English or Arabic ("Hoodie", "هودي"). */
export const HOODIE_STYLE_PATTERN = /hoodie|هودي/i;

export const isHoodieStyleName = (name: string) => HOODIE_STYLE_PATTERN.test(name);

/**
 * Resolves the customer-chosen hoodie style for an order line item.
 * - Non-hoodie products never carry a style choice → undefined.
 * - Absent choice (legacy clients) → undefined; the product's admin-assigned
 *   style still applies by default.
 * - A provided choice must be an existing hoodie style name — anything else
 *   is a crafted/stale request and rejected, never silently swapped.
 */
export function resolveOrderStyle(
  style: string | undefined,
  productType: string,
  hoodieStyleNames: string[],
): string | undefined {
  if (productType !== "hoodie") return undefined;
  if (style == null || style.trim() === "") return undefined;
  const trimmed = style.trim();
  const match = hoodieStyleNames.find((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (!match) throw new Error("STYLE_UNAVAILABLE");
  return match;
}
