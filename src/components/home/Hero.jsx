import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { READY_DESIGNS } from '@/lib/readyDesigns';
import { BRAND_ASSETS, INK_FILTER } from '@/lib/brandAssets';
import { DotsMark } from '@/components/Brand';

export default function Hero() {
  const { lang } = useI18n();
  const lead = READY_DESIGNS[5];

  const copy = lang === 'ar'
    ? {
        eyebrow: 'خربش — استوديو لبناني',
        titleA: 'فكر لبناني،',
        titleB: 'مصنوع ومطبوع.',
        titleAccent: 'لبناني أصلي',
        tagline: 'تيشيرتات عليها الكلام يلي بيتقال كل يوم. مطبوعة في لبنان، للّي بيفهم.',
        primary: 'شوف التصاميم',
        secondary: 'على ذوقك',
        proof1: 'مصنوع في لبنان',
        proof2: 'مطبوع في لبنان',
        proof3: 'تصاميم جرافيك',
        fig: 'شكل ٠١ — تصميم جاهز',
      }
    : {
        eyebrow: 'Kharbesh — a Lebanese studio',
        titleA: 'Lebanese thought,',
        titleB: 'produced & printed.',
        titleAccent: 'Lebneni Assli',
        tagline: 'Tees with the things people say every day. Printed in Lebanon, for the ones who get it.',
        primary: 'Shop the designs',
        secondary: 'Make it yours',
        proof1: 'Made in Lebanon',
        proof2: 'Printed in Lebanon',
        proof3: 'Graphic designs',
        fig: 'Fig. 01 — ready design',
      };

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-14 sm:pb-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7">
            <span className="kh-eyebrow">{copy.eyebrow}</span>
            <img
              src={BRAND_ASSETS.markWhite}
              alt="خربش"
              className="mt-7 w-full max-w-[400px] sm:max-w-[460px]"
              style={{ display: 'block', filter: INK_FILTER }}
            />
            <h1 className={`kh-hero-title mt-6 ${lang === 'ar' ? 'kh-hero-title-ar' : ''}`}>
              {copy.titleA}
              <br />
              {copy.titleB}{' '}
              <span
                className="kh-zig"
                style={{
                  fontFamily: "'Rakkas', var(--brand-font-body)",
                  textTransform: 'none',
                  letterSpacing: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {copy.titleAccent}
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base sm:text-lg" style={{ color: 'var(--muted)' }}>{copy.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/shop" className="kh-btn-mark">{copy.primary}</Link>
              <Link to="/custom" className="kh-btn-mark kh-btn-mark-brick">{copy.secondary}</Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: 'var(--muted)' }}>
              <span style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>{copy.proof1}</span>
              <DotsMark lime />
              <span style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>{copy.proof2}</span>
              <DotsMark lime className="hidden sm:inline-flex" />
              <span style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>{copy.proof3}</span>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <span className="kh-mono block mb-3 text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>
              {copy.fig}
            </span>
            <Link to="/shop" className="kh-frame block group">
              <div className="relative" style={{ aspectRatio: '4 / 4.6', background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                <span className="kh-d-tag" style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
                  {lang === 'ar' ? lead.tag_ar : lead.tag_en}
                </span>
                <img src={lead.img} alt={lead.title_en} className="w-full h-full object-contain" loading="lazy" />
              </div>
              <div className="flex items-baseline justify-between gap-3 p-4">
                <span className="kh-zig kh-zig-draw" style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                  {lang === 'ar' ? lead.title_ar : lead.title_en}
                </span>
                <span className="kh-mono text-[12px] uppercase" style={{ color: 'var(--muted)' }}>KH-006</span>
              </div>
            </Link>
            <img
              src={BRAND_ASSETS.iconColor}
              alt=""
              aria-hidden="true"
              className="absolute -top-10 -right-6 w-20 h-20 sm:w-24 sm:h-24 hidden sm:block"
              style={{ transform: 'rotate(6deg)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
