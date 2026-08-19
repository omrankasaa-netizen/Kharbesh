import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';

/* Per-world visual + copy flavor. Keyed by slug (frozen collection names are untouched —
   this only adds an icon glyph, an accent-tinted index mark, and a witty Arabizi CTA). */
const WORLD_FLAVOR = {
  politics: {
    index: '01',
    cta: 'Fout 3al balad →',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M10 42V14l18-8 10 5v9l-10-5-18 8" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M10 24v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  quotes: {
    index: '02',
    cta: 'Khod jomleh →',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M10 14c-4 3-6 7-6 12 0 5 3 8 7 8s6-3 6-6-2-5-5-5c0-4 2-7 6-9z" fill="currentColor" />
        <path d="M30 14c-4 3-6 7-6 12 0 5 3 8 7 8s6-3 6-6-2-5-5-5c0-4 2-7 6-9z" fill="currentColor" />
      </svg>
    ),
  },
  rahbaniet: {
    index: '03',
    cta: 'Sma3 el 2adim →',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="15" cy="34" r="6" stroke="currentColor" strokeWidth="2.5" />
        <path d="M21 34V10l16-4v20" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="31" cy="30" r="6" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    ),
  },
};

const DEFAULT_FLAVOR = { index: '•', cta: 'Browse the world →', icon: null };

export default function CollectionCard({ collection }) {
  const { lang } = useI18n();
  const name = lang === 'ar' ? collection.name_ar : collection.name_en;
  const desc = lang === 'ar' ? collection.description_ar : collection.description_en;
  const flavor = WORLD_FLAVOR[collection.slug] || DEFAULT_FLAVOR;
  const accent = collection.accent || 'var(--lime)';

  return (
    <Link
      to={`/collections/${collection.slug}`}
      className="kh-card-collection group"
      style={{ '--kh-world-accent': accent }}
    >
      <span className="kh-card-collection-index" aria-hidden="true">{flavor.index}</span>
      {flavor.icon && <span className="kh-card-collection-icon">{flavor.icon}</span>}
      <span className="kh-eyebrow">3ALAM KHARBESH</span>
      <h3 className="kh-h">{name}</h3>
      <p className="kh-p">{desc}</p>
      <span className="kh-link">{flavor.cta}</span>
    </Link>
  );
}
