import React from 'react';
import { BRAND_ASSETS, INK_FILTER } from '@/lib/brandAssets';

export const BrandLogo = ({ className = '', showLatin = true, tone = 'ink' }) => (
  <img
    src={BRAND_ASSETS.horizontalWhite}
    alt="Kharbesh"
    className={className}
    style={{ height: 30, width: 'auto', display: 'block', filter: tone === 'ink' ? INK_FILTER : undefined }}
  />
);

export const Scribble = ({ className = '', width = 120, tone = 'accent' }) => (
  <span
    className={`kh-zig ${className}`}
    style={{ width, display: 'inline-block', height: 10, paddingBottom: 0, backgroundSize: '100% 100%' }}
    aria-hidden="true"
  />
);

/* Three imperfect dots — the brand signature */
export const DotsMark = ({ className = '', lime = false }) => (
  <span className={`kh-dots ${lime ? 'kh-dots-lime' : ''} ${className}`} aria-hidden="true">
    <i /><i /><i />
  </span>
);

export const IconShop = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="8" height="8" /><rect x="13" y="4" width="8" height="8" /><rect x="3" y="14" width="8" height="6" /><rect x="13" y="14" width="8" height="6" />
  </svg>
);
export const IconSearch = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="6" /><line x1="20" y1="20" x2="15.5" y2="15.5" />
  </svg>
);
export const IconBag = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
export const IconHeart = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20s-7-4.6-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.4 12 20 12 20z" />
  </svg>
);
export const IconShare = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><line x1="8.2" y1="10.8" x2="15.8" y2="7.2" /><line x1="8.2" y1="13.2" x2="15.8" y2="16.8" />
  </svg>
);
export const IconCustom = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 16c2-3 4 3 6 0s4 3 6 0 3-2 6-2" /><path d="M15 6l3 3" /><path d="M17.5 3.5a1.8 1.8 0 0 1 2.6 2.6l-8 8-3.6.9.9-3.6 8.1-8z" />
  </svg>
);
export const IconNewDrop = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l2.2 5.6L20 9l-4 3.6L17.2 19 12 15.8 6.8 19 8 12.6 4 9l5.8-.4L12 3z" />
  </svg>
);
export const IconThreeDots = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2.4" /><circle cx="12" cy="12" r="2.4" /><circle cx="18" cy="12" r="2.4" /></svg>
);
