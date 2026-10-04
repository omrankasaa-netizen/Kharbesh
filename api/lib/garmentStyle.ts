/**
 * Garment style (fabric/type) choice — Autumn Hoodie, Fleeced Winter Hoodie,
 * Heavyweight Hoodie. A customer-facing pick on apparel product pages (tees
 * AND hoodies — any design can be bought on a tee or on a hoodie style),
 * stored on the order line item so the factory knows which blank to pull.
 *
 * The catalog is admin-managed (garment_styles table), so "is this a hoodie
 * style" is decided by name, same heuristic the 3a Zaw2ak form uses.
 */

/** Matches hoodie style names in English or Arabic ("Hoodie", "هودي"). */
export const HOODIE_STYLE_PATTERN = /hoodie|هودي/i;

export const isHoodieStyleName = (name: string) => HOODIE_STYLE_PATTERN.test(name);

/**
 * Resolves the customer-chosen garment style for an order line item.
 * - Accessories never carry a style choice → undefined.
 * - Absent choice (product's own garment kept) → undefined.
 * - A provided choice must be an existing style name in the catalog —
 *   anything else is a crafted/stale request and rejected, never silently
 *   swapped.
 */
export function resolveOrderStyle(
  style: string | undefined,
  productType: string,
  styleNames: string[],
): string | undefined {
  if (productType !== "hoodie" && productType !== "tee") return undefined;
  if (style == null || style.trim() === "") return undefined;
  const trimmed = style.trim();
  const match = styleNames.find((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (!match) throw new Error("STYLE_UNAVAILABLE");
  return match;
}

/**
 * The garment type the factory actually cuts for a line item: a hoodie style
 * chosen on a tee product makes the physical garment a hoodie (drives sizing
 * and blank-stock consumption).
 */
export function effectiveGarmentType(
  productType: string,
  style: string | undefined,
): "tee" | "hoodie" | "accessory" {
  if (style && isHoodieStyleName(style)) return "hoodie";
  if (productType === "hoodie") return "hoodie";
  if (productType === "accessory") return "accessory";
  return "tee";
}
