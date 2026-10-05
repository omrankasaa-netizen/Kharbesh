/**
 * Generic hoodie shots (front + back combined, "your design goes here" on
 * the back) — one per color × fit, embedded as base64 data URLs in per-photo
 * modules under ./hoodie-photos/. Shown on tee PDPs when the customer picks
 * a hoodie in the cross-garment selector (those designs were only
 * photographed on tees). This module is dynamically imported from
 * ProductPage so the ~300KB of photos only download when a hoodie option is
 * actually selected, never on a plain tee visit.
 *
 * Keyed by `garment_colors.nameEn` exactly as seeded in the DB (Heather Grey
 * shots = Grey, Dark Charcoal = Charcoal Blue). Fits: 'regular' | 'oversize'
 * (see src/lib/fitSizes.js).
 */
import blackRegular from './hoodie-photos/black-regular';
import blackOversize from './hoodie-photos/black-oversize';
import whiteRegular from './hoodie-photos/white-regular';
import whiteOversize from './hoodie-photos/white-oversize';
import greyRegular from './hoodie-photos/grey-regular';
import greyOversize from './hoodie-photos/grey-oversize';
import charcoalBlueRegular from './hoodie-photos/charcoal-blue-regular';
import charcoalBlueOversize from './hoodie-photos/charcoal-blue-oversize';

export const GENERIC_HOODIE_BY_COLOR_FIT = {
  Black: { regular: blackRegular, oversize: blackOversize },
  White: { regular: whiteRegular, oversize: whiteOversize },
  Grey: { regular: greyRegular, oversize: greyOversize },
  'Charcoal Blue': { regular: charcoalBlueRegular, oversize: charcoalBlueOversize },
};

/** Generic hoodie photo for a color+fit, falling back across fit so a
 *  partial matrix still renders a hoodie rather than nothing. */
export function genericHoodiePhoto(colorName, fit) {
  const byFit = GENERIC_HOODIE_BY_COLOR_FIT[colorName];
  if (byFit) return byFit[fit] || byFit.regular || byFit.oversize || null;
  return null;
}
