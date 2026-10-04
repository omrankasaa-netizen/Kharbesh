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
      {isHoodie ? (
        <>
          {/* hood behind the neck */}
          <path d="M106,62 Q102,16 150,10 Q198,16 194,62 L178,54 Q150,32 122,54 Z" fill={color} stroke={stroke} strokeWidth="1.5" />
          {/* body + long sleeves */}
          <path
            d="M94,62 L46,90 L68,296 Q69,303 76,302 L96,297 L96,322 Q96,326 100,326 L200,326 Q204,326 204,322 L204,297 L224,302 Q231,303 232,296 L254,90 L206,62 L178,54 Q150,80 122,54 Z"
            fill={color}
            stroke={stroke}
            strokeWidth="1.5"
          />
          {/* underarm seams (sleeve/body split) + hood opening */}
          <path d="M96,148 L96,297 M204,148 L204,297" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M122,54 Q150,32 178,54 Q150,80 122,54 Z" fill="none" stroke={stroke} strokeWidth="1.5" />
          {/* ribbed hem + cuffs */}
          <path d="M96,310 L204,310" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M64,283 L96,277 M204,277 L236,283" fill="none" stroke={stroke} strokeWidth="1.5" />
          {/* kangaroo pocket */}
          <path d="M104,240 L196,240 L196,298 L104,298 Z" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M104,240 L122,298 M196,240 L178,298" fill="none" stroke={stroke} strokeWidth="1.5" />
          {/* drawstrings */}
          <path d="M138,72 Q135,98 139,118 M162,72 Q165,98 161,118" fill="none" stroke={stroke} strokeWidth="1.5" />
        </>
      ) : (
        <>
          {/* tee: body + short sleeves */}
          <path
            d="M95,58 L42,84 L66,150 L96,130 L96,322 Q96,326 100,326 L200,326 Q204,326 204,322 L204,130 L234,150 L258,84 L205,58 L178,54 Q150,78 122,54 Z"
            fill={color}
            stroke={stroke}
            strokeWidth="1.5"
          />
          {/* collar */}
          <path d="M122,54 Q150,80 178,54" fill="none" stroke={stroke} strokeWidth="1.5" />
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
