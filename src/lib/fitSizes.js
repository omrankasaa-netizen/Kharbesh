/* Garment fits — tees come in two cuts: regular and oversize.
   The storefront keeps showing customer sizes S, M, L, XL, XXL; the
   factory cuts each fit in three internal sizes (S/M, L/XL, XXL) — the
   server-side mirror of this file (api/lib/fitSizes.ts) owns that mapping.
   Keep the two in sync. */

export const FIT_OPTIONS = [
  { id: 'regular', en: 'Regular', ar: 'عادية' },
  { id: 'oversize', en: 'Oversize', ar: 'أوفرسايز' },
];

export const DEFAULT_FIT = 'regular';

/** Fits apply to tees only. */
export const productHasFits = (product) => product?.product_type === 'tee';

export const fitLabel = (fit, lang) =>
  (FIT_OPTIONS.find((f) => f.id === fit) || FIT_OPTIONS[0])[lang === 'ar' ? 'ar' : 'en'];

/** Short inline suffix for cart/checkout/order lines — "" for regular so
    legacy-looking items stay clean, "· Oversize" when it matters. */
export const fitSuffix = (fit, lang) =>
  fit === 'oversize' ? ` · ${fitLabel(fit, lang)}` : '';
