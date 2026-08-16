import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { READY_DESIGNS } from '@/lib/readyDesigns';

export default function DesignShowcase() {
  const { lang } = useI18n();
  return (
    <section className="kh-dark" style={{ background: 'var(--brand-primary)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <span className="kh-d-eyebrow">{lang === 'ar' ? 'تصاميم جاهزة' : 'Ready designs'}</span>
            <h2 className="mt-2 font-heading text-3xl sm:text-5xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-on-primary)' }}>
              {lang === 'ar' ? 'جاهزة للّبس، للّي بيفهم' : 'Ready to wear, ready to get'}
            </h2>
            <p className="mt-2 max-w-xl" style={{ color: '#A89F8C' }}>
              {lang === 'ar'
                ? 'كل تصميم نكتة كاملة. لبسها — وخلّي غيرك يضحك (أو يستغرب).'
                : 'Every design is a full joke. Wear it — let the rest laugh (or wonder).'}
            </p>
          </div>
          <Link to="/shop" className="kh-d-btn-text hidden sm:inline-flex">{lang === 'ar' ? 'تسوّق الكل' : 'Shop all'}</Link>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
          {READY_DESIGNS.map((d) => (
            <Link to="/shop" key={d.id} className="kh-d-card">
              <div className="kh-d-media">
                <span className="kh-d-tag">{lang === 'ar' ? d.tag_ar : d.tag_en}</span>
                <img src={d.img} alt={d.title_en} loading="lazy" />
              </div>
              <div className="kh-d-body">
                <span className="kh-d-title">{lang === 'ar' ? d.title_ar : d.title_en}</span>
                <span className="kh-d-cta">{lang === 'ar' ? 'تسوّق' : 'Shop'} →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
