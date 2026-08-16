import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';

export default function CollectionCard({ collection }) {
  const { lang } = useI18n();
  const name = lang === 'ar' ? collection.name_ar : collection.name_en;
  const desc = lang === 'ar' ? collection.description_ar : collection.description_en;
  return (
    <Link to={`/collections/${collection.slug}`} className="kh-card-collection group">
      <span className="kh-eyebrow">KHARBESH WORLD</span>
      <h3 className="kh-h">{name}</h3>
      <p className="kh-p">{desc}</p>
      <span className="kh-link">Browse the world →</span>
    </Link>
  );
}
