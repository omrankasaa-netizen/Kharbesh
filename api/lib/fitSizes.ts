/**
 * Garment fits — tees are sold in two cuts: "regular" and "oversize".
 *
 * The storefront always shows the customer-facing sizes S, M, L, XL, XXL.
 * The factory, however, cuts each fit in only THREE internal sizes, and
 * adjacent customer sizes map onto one physical blank:
 *
 *   customer S or M  → internal "S/M"
 *   customer L or XL → internal "L/XL"
 *   customer XXL     → internal "XXL"
 *
 * So a tee blank variant is (productType=tee, color, fit, internalSize) —
 * 2 fits × 3 internal sizes per color. Hoodies and accessories have no
 * fits: they stay on fit="regular" with their real sizes untouched.
 *
 * Keep in sync with the client mirror in src/lib/fitSizes.js.
 */

export const FITS = ["regular", "oversize"] as const;
export type Fit = (typeof FITS)[number];

export const DEFAULT_FIT: Fit = "regular";

/** Internal blank sizes a tee fit is stocked in. */
export const INTERNAL_TEE_SIZES = ["S/M", "L/XL", "XXL"] as const;
export type InternalTeeSize = (typeof INTERNAL_TEE_SIZES)[number];

/** Customer-facing size → the internal blank size it is cut from. */
export function toInternalSize(size: string): InternalTeeSize {
  switch (size.trim().toUpperCase()) {
    case "S":
    case "M":
    case "S/M":
      return "S/M";
    case "L":
    case "XL":
    case "L/XL":
      return "L/XL";
    case "XXL":
    case "2XL":
      return "XXL";
    default:
      // Unknown size — keep it as-is rather than guessing wrong; the
      // factory reads this column literally.
      return size as InternalTeeSize;
  }
}

/** Accepts anything from the client and returns a valid fit. Only tees
 *  carry a meaningful fit — every other garment type is forced to the
 *  default so downstream (inventory, factory) never sees junk values. */
export function normalizeFit(fit: unknown, productType?: string): Fit {
  if (productType !== undefined && productType !== "tee") return DEFAULT_FIT;
  return fit === "oversize" ? "oversize" : DEFAULT_FIT;
}

/** The size the factory cuts/prints for an order or factory line item:
 *  tees collapse to their internal group, everything else passes through. */
export function factorySizeFor(productType: string, size: string): string {
  return productType === "tee" ? toInternalSize(size) : size;
}
