import React from 'react';

// A clean, editorial flat garment illustration in the product's color,
// with the artwork phrase printed in fixed placement. Used as the
// finished-product image on cards and the product gallery.
export default function GarmentMockup({ type = 'tee', color = '#F0E9D6', textColor = '#141210', phrase = '', view = 'front', className = '' }) {
  const stroke = 'rgba(20,18,16,0.18)';
  const isHoodie = type === 'hoodie';
  const showText = view === 'front' && phrase;

  return (
    <svg viewBox="0 0 300 360" className={className} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Garment preview">
      {isHoodie && (
        <path d="M118,52 Q150,22 182,52 L206,40 Q150,8 94,40 Z" fill={color} stroke={stroke} strokeWidth="1.5" opacity="0.65" />
      )}
      {/* body + sleeves */}
      <path
        d="M95,58 L42,84 L66,150 L96,130 L96,322 Q96,326 100,326 L200,326 Q204,326 204,322 L204,130 L234,150 L258,84 L205,58 L178,54 Q150,78 122,54 Z"
        fill={color}
        stroke={stroke}
        strokeWidth="1.5"
      />
      {/* collar */}
      <path d="M122,54 Q150,80 178,54" fill="none" stroke={stroke} strokeWidth="1.5" />
      {isHoodie && (
        <>
          <path d="M122,54 Q150,80 178,54 L172,66 Q150,86 128,66 Z" fill="none" stroke={stroke} strokeWidth="1.5" />
          {/* pocket */}
          <rect x="100" y="232" width="100" height="58" rx="6" fill="none" stroke={stroke} strokeWidth="1.5" />
          {/* drawstrings */}
          <path d="M138,70 Q136,96 140,116" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M162,70 Q164,96 160,116" fill="none" stroke={stroke} strokeWidth="1.5" />
        </>
      )}
      {showText && (
        <text x="150" y={isHoodie ? 190 : 180} textAnchor="middle" fontSize="19" fontWeight="700" fill={textColor} fontFamily="'IBM Plex Sans Arabic', sans-serif">
          {phrase}
        </text>
      )}
      {view === 'back' && (
        <text x="150" y="180" textAnchor="middle" fontSize="15" fontWeight="700" fill={textColor} fontFamily="'IBM Plex Sans Arabic', sans-serif" opacity="0.85">
          {phrase}
        </text>
      )}
    </svg>
  );
}

// Pick a readable text color for a given garment hex.
export function contrastInk(hex) {
  const c = hex.replace('#', '');
  if (c.length < 6) return '#141210';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#141210' : '#F5EFE1';
}
