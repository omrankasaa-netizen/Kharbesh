import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { READY_DESIGNS } from '@/lib/readyDesigns';
import { BRAND_ASSETS, INK_FILTER } from '@/lib/brandAssets';

export default function DesignShowcase() {
  const { lang } = useI18n();
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

        <div className="kh-grid-hair grid grid-cols-2 lg:grid-cols-3">
          {READY_DESIGNS.map((d) => (
            <Link to="/shop" key={d.id} className="kh-cell kh-piece group flex flex-col">
              <div className="flex items-center justify-between px-4 pt-4">
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ fontFamily: 'var(--brand-font-body)', letterSpacing: '.12em', color: 'var(--ink)', background: 'var(--lime)', padding: '3px 8px', borderRadius: 2 }}
                >
                  {lang === 'ar' ? d.world_ar : d.world_en}
                </span>
                <span className="kh-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                  {d.code}
                </span>
              </div>

              {/* Front artwork — swaps to back/neck view on hover (desktop) */}
              <div className="kh-piece-media flex-1 flex items-end px-4 pt-2 relative">
                <img
                  src={d.img}
                  alt={d.title_en}
                  loading="lazy"
                  className="kh-piece-front w-full object-contain"
                  style={{ maxHeight: 260 }}
                />
                <div className="kh-piece-back absolute inset-0 flex flex-col items-center justify-center gap-2" aria-hidden="true">
                  <img src={BRAND_ASSETS.monogramWhite} alt="" className="w-12 h-12" style={{ filter: INK_FILTER }} loading="lazy" />
                  <span className="kh-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                    {lang === 'ar' ? 'الخلف' : 'Back'}
                  </span>
                </div>
              </div>

              <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="kh-zig kh-zig-draw" style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                    {lang === 'ar' ? d.title_ar : d.title_en}
                  </span>
                  <span className="kh-mono text-[13px] shrink-0" style={{ color: 'var(--ink)' }}>
                    ${d.price}
                  </span>
                </div>
                <span className="kh-mono block mt-1 text-[11px] uppercase" style={{ color: 'var(--muted)' }}>
                  {lang === 'ar' ? 'شوف القطعة ←' : 'View piece →'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
