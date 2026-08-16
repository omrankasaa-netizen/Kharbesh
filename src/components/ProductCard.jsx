import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useColors, resolveColor } from '@/lib/useCatalog.jsx';
import GarmentMockup, { contrastInk } from '@/components/GarmentMockup';

export default function ProductCard({ product }) {
  const { lang, t } = useI18n();
  const colors = useColors();
  const name = lang === 'ar' ? (product.name_ar || product.name_en) : product.name_en;
  const firstColorName = (product.approved_colors || [])[0];
  const color = resolveColor(firstColorName, colors);
  const hex = color?.hex || '#F0E9D6';
  const ink = contrastInk(hex);
  const isPreorder = product.preorder_type !== 'always_on';
  const coll = (product.collection_name || '').replace('Kharbesh ', '');

  return (
    <Link to={`/product/${product.id}`} className="kh-card-product group" aria-label={name}>
      <div className="kh-media" style={{ background: 'var(--brand-surface)' }}>
        {coll && <span className="kh-tag">{coll.toUpperCase()}</span>}
        {isPreorder && <span className="kh-tag" style={{ left: 'auto', right: 12, background: 'var(--brand-brick)', color: '#fff' }}>{t.product.preorder}</span>}
        <GarmentMockup
          type={product.product_type}
          color={hex}
          textColor={ink}
          phrase={product.phrase_ar}
          className="w-[78%] h-[78%] transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="kh-body">
        <div className="kh-row">
          <span className="kh-title">{name}</span>
          <span className="kh-price">${product.price}</span>
        </div>
        <p className="kh-sub">{product.garment_style || ''} · {isPreorder ? t.product.preorder : t.product.ready}</p>
      </div>
    </Link>
  );
}
