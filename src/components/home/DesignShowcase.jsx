import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts, useColors, resolveColor } from '@/lib/useCatalog.jsx';
import GarmentMockup, { contrastInk } from '@/components/GarmentMockup';

const SHOWCASE_COUNT = 6;

function ShowcaseCard({ product }) {
  const { lang, t } = useI18n();
  const colors = useColors();
  const name = lang === 'ar' ? (product.name_ar || product.name_en) : product.name_en;
  const coll = (product.collection_name || '').replace('Kharbesh ', '');
  const isPreorder = product.preorder_type !== 'always_on';
  const firstColorName = (product.approved_colors || [])[0];
  const color = resolveColor(firstColorName, colors);
  const hex = color?.hex || '#F0E9D6';
  const ink = contrastInk(hex);
  const img = product.images?.[0];

  return (
    <Link to={`/product/${product.id}`} className="kh-cell kh-piece group flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        {coll ? (
          <span
            className="text-[10px] font-bold uppercase"
            style={{ fontFamily: 'var(--brand-font-body)', letterSpacing: '.12em', color: 'var(--on-lime)', background: 'var(--lime)', padding: '3px 8px', borderRadius: 2 }}
          >
            {coll.toUpperCase()}
          </span>
        ) : <span />}
        {isPreorder && (
          <span className="kh-mono text-[11px]" style={{ color: 'var(--muted)' }}>
            {t.product.preorder}
          </span>
        )}
      </div>

      <div className="kh-piece-media flex-1 flex items-end justify-center px-4 pt-2 relative" style={{ background: 'var(--brand-surface)' }}>
        {img ? (
          <img
            src={img}
            alt={name}
            loading="lazy"
            className="kh-piece-front w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            style={{ maxHeight: 260 }}
          />
        ) : (
          <GarmentMockup
            type={product.product_type}
            color={hex}
            textColor={ink}
            phrase={product.phrase_ar}
            className="w-[78%] h-[78%] transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
      </div>

      <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="kh-zig kh-zig-draw" style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
            {name}
          </span>
          <span className="kh-mono text-[13px] shrink-0" style={{ color: 'var(--ink)' }}>
            ${product.price}
          </span>
        </div>
        <span className="kh-mono block mt-1 text-[11px] uppercase" style={{ color: 'var(--muted)' }}>
          {lang === 'ar' ? 'شوف القطعة ←' : 'View piece →'}
        </span>
      </div>
    </Link>
  );
}

export default function DesignShowcase() {
  const { lang } = useI18n();
  const { products, loading } = useProducts();
  const featured = products.slice(0, SHOWCASE_COUNT);

  if (!loading && featured.length === 0) return null;

  return (
    <section style={{ background: 'var(--paper)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <span className="kh-eyebrow">{lang === 'ar' ? 'تصاميم جاهزة' : 'Ready designs'}</span>
            <h2 className={`kh-section-title mt-3 ${lang === 'ar' ? 'kh-section-title-ar' : ''}`}>
              {lang === 'ar' ? 'جاهزة تتخربش' : 'Ready to Kharbesh'}
            </h2>
            <p className="mt-3 max-w-xl" style={{ color: 'var(--muted)' }}>
              {lang === 'ar'
                ? 'كل تصميم نكتة كاملة. لبسها — وخلّي غيرك يضحك، أو يستغرب.'
                : 'Every design is a full joke. Wear it — let the rest laugh, or wonder.'}
            </p>
          </div>
          <Link to="/shop" className="kh-btn-text hidden sm:inline-flex">
            {lang === 'ar' ? 'كل القطع ←' : 'View all pieces →'}
          </Link>
        </div>

        {loading ? (
          <div className="kh-grid-hair grid grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: SHOWCASE_COUNT }).map((_, i) => (
              <div key={i} className="kh-cell flex flex-col animate-pulse">
                <div className="aspect-square" style={{ background: 'var(--brand-surface)' }} />
                <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                  <div className="h-4 w-2/3 rounded-sm" style={{ background: 'var(--brand-surface)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="kh-grid-hair grid grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ShowcaseCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}
