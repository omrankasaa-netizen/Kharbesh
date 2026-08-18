import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { READY_DESIGNS } from '@/lib/readyDesigns';
import { BRAND_ASSETS, INK_FILTER } from '@/lib/brandAssets';

/* Rotating campaign statements — swap one line per drop.
   AR list is the primary voice; EN mirrors it. */
const CAMPAIGNS = {
  en: [
    'Wear what you were about to say.',
    'Things we say. Things we wear.',
    'Lebanese thoughts. Zero inside voices.',
    'Read it twice.',
  ],
  ar: [
    'اللي ما بينقال… بينلبس.',
    'أشياء منقولها. أشياء منلبسها.',
    'أفكار لبنانية. بلا صوت داخلي.',
    'اقراها مرتين.',
  ],
};

export default function Hero() {
  const { lang } = useI18n();
  const lead = READY_DESIGNS[5];
  const lines = CAMPAIGNS[lang] || CAMPAIGNS.en;

  const [idx, setIdx] = useState(0);
  const [view, setView] = useState('front');

  useEffect(() => {
    setIdx(0);
    const id = setInterval(() => setIdx((i) => (i + 1) % lines.length), 4200);
    return () => clearInterval(id);
  }, [lang, lines.length]);

  const copy = lang === 'ar'
    ? {
        eyebrow: 'خربش — استوديو لبناني',
        support: 'فكر لبناني، مصنوع ومطبوع.',
        accent: 'لبناني أصلي',
        tagline: 'تيشيرتات عليها الكلام يلي بيتقال كل يوم. مطبوعة في لبنان، للّي بيفهم.',
        primary: 'تسوّق الدروب ←',
        secondary: 'على ذوقك ←',
        trust: ['مصنوع في لبنان', 'مطبوع في لبنان', 'دفع آمن'],
        dropTag: 'دروب ٠١',
        front: 'أمامي',
        back: 'خلفي',
        viewPiece: 'شوف القطعة ←',
      }
    : {
        eyebrow: 'Kharbesh — a Lebanese studio',
        support: 'Lebanese thought, produced & printed.',
        accent: 'Lebneni Assli',
        tagline: 'Tees with the things people say every day. Printed in Lebanon, for the ones who get it.',
        primary: 'Shop the drop →',
        secondary: 'Make it yours →',
        trust: ['Made in Lebanon', 'Printed in Lebanon', 'Secure checkout'],
        dropTag: 'Drop 01',
        front: 'Front',
        back: 'Back',
        viewPiece: 'View piece →',
      };

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-14 sm:pb-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7">
            <span className="kh-eyebrow">{copy.eyebrow}</span>

            {/* Rotating campaign statement — the emotional headline */}
            <h1 className={`kh-hero-title mt-8 ${lang === 'ar' ? 'kh-hero-title-ar' : ''}`} aria-live="polite">
              <span key={`${lang}-${idx}`} className="kh-hero-line block">
                {lines[idx]}
              </span>
            </h1>
            <div className="mt-4 flex items-center gap-3" aria-hidden="true">
              {lines.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className="kh-campaign-dot"
                  data-on={i === idx}
                  aria-label={`Statement ${i + 1}`}
                  tabIndex={-1}
                />
              ))}
            </div>

            {/* Brand credibility — supporting, not the headline */}
            <p className="mt-6 text-base sm:text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              {copy.support}{' '}
              <span className="kh-zig" style={{ fontFamily: "'Rakkas', var(--brand-font-body)", whiteSpace: 'nowrap' }}>
                {copy.accent}
              </span>
            </p>
            <p className="mt-3 max-w-xl text-base" style={{ color: 'var(--muted)' }}>{copy.tagline}</p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/shop" className="kh-btn-mark">{copy.primary}</Link>
              <Link to="/custom" className="kh-btn-mark kh-btn-mark-brick">{copy.secondary}</Link>
            </div>

            <p className="kh-mono mt-9 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
              {copy.trust.join('  •  ')}
            </p>
          </div>

          {/* Featured piece — purchasable, front/back */}
          <div className="lg:col-span-5 relative">
            <div className="flex items-baseline justify-between mb-3">
              <span className="kh-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>
                {copy.dropTag} — {lead.code}
              </span>
              <div className="flex gap-4">
                {['front', 'back'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="kh-view-toggle"
                    data-on={view === v}
                  >
                    {v === 'front' ? copy.front : copy.back}
                  </button>
                ))}
              </div>
            </div>

            <Link
              to="/shop"
              className="kh-frame block group"
              onMouseEnter={() => setView('back')}
              onMouseLeave={() => setView('front')}
            >
              <div className="relative" style={{ aspectRatio: '4 / 4.6', background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                <span className="kh-d-tag" style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
                  {lang === 'ar' ? lead.world_ar : lead.world_en}
                </span>
                {/* Front */}
                <img
                  src={lead.img}
                  alt={lead.title_en}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-200"
                  style={{ opacity: view === 'front' ? 1 : 0 }}
                  loading="lazy"
                />
                {/* Back — neck monogram view */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-start pt-[16%] transition-opacity duration-200"
                  style={{ opacity: view === 'back' ? 1 : 0, background: 'var(--paper-2)' }}
                  aria-hidden={view !== 'back'}
                >
                  <img
                    src={BRAND_ASSETS.monogramWhite}
                    alt=""
                    className="w-16 h-16"
                    style={{ filter: INK_FILTER }}
                    loading="lazy"
                  />
                  <span className="kh-mono mt-3 text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                    {lead.code} / {lang === 'ar' ? 'طبعة الرقبة' : 'Neck print'}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-3 p-4">
                <span className="kh-zig kh-zig-draw" style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                  {lang === 'ar' ? lead.title_ar : lead.title_en}
                </span>
                <span className="kh-mono text-[12px] uppercase shrink-0" style={{ color: 'var(--ink)' }}>
                  ${lead.price} · {copy.viewPiece}
                </span>
              </div>
            </Link>

            <img
              src={BRAND_ASSETS.iconColor}
              alt=""
              aria-hidden="true"
              className="absolute -bottom-8 -left-7 w-16 h-16 sm:w-20 sm:h-20 hidden sm:block"
              style={{ transform: 'rotate(-7deg)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
