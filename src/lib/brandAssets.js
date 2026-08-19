// Official Kharbesh brand lockups — imported through Vite so paths resolve
// correctly on every route and every deploy target (no hardcoded absolute paths).

import markWhite from '../assets/brand/kharbesh-mark-white.png';
import stackedWhite from '../assets/brand/kharbesh-stacked-lockup-white.png';
import horizontalWhite from '../assets/brand/kharbesh-horizontal-footer-white.png';
import chestWhite from '../assets/brand/kharbesh-chest-lockup-white.png';
import monogramWhite from '../assets/brand/kharbesh-neck-monogram-white.png';
import iconMonoWhite from '../assets/brand/kharbesh-icon-mono-white.png';
import iconColor from '../assets/brand/kharbesh-icon-color.png';
import iconWhiteLime from '../assets/brand/kharbesh-icon-white-lime.png';

export const BRAND_ASSETS = {
  markWhite,
  stackedWhite,
  horizontalWhite,
  chestWhite,
  monogramWhite,
  iconMonoWhite,
  iconColor,
  iconWhiteLime,
};

/* Renders any white lockup as solid ink on light backgrounds. */
export const INK_FILTER = 'brightness(0)';
