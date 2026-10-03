/* Garment fits — tees and hoodies come in two cuts: regular and oversize.
   The storefront keeps showing customer sizes S, M, L, XL, XXL; the
   factory cuts each tee fit in three internal sizes (S/M, L/XL, XXL) while
   hoodies keep their real sizes — the server-side mirror of this file
   (api/lib/fitSizes.ts) owns those mappings. Keep the two in sync. */

export const FIT_OPTIONS = [
  { id: 'regular', en: 'Regular', ar: 'عادية' },
  { id: 'oversize', en: 'Oversize', ar: 'أوفرسايز' },
];

export const DEFAULT_FIT = 'regular';

/** Fits apply to tees and hoodies (accessories stay one-cut). */
export const productHasFits = (product) =>
  product?.product_type === 'tee' || product?.product_type === 'hoodie';

export const fitLabel = (fit, lang) =>
  (FIT_OPTIONS.find((f) => f.id === fit) || FIT_OPTIONS[0])[lang === 'ar' ? 'ar' : 'en'];

/** Short inline suffix for cart/checkout/order lines — "" for regular so
    legacy-looking items stay clean, "· Oversize" when it matters. */
export const fitSuffix = (fit, lang) =>
  fit === 'oversize' ? ` · ${fitLabel(fit, lang)}` : '';
