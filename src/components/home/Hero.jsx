import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { READY_DESIGNS } from '@/lib/readyDesigns';
import { BRAND_ASSETS } from '@/lib/brandAssets';

export default function Hero() {
  const { lang } = useI18n();
  const lead = READY_DESIGNS[5];

  const copy = lang === 'ar'
    ? {
        eyebrow: 'لبناني · يومي · بيقول',
        title: 'فكر لبناني، مصنوع ومطبوع.',
        titleAccent: 'لبناني أصلي',
        tagline: 'تيشيرتات عليها الكلام يلي بيتقال كل يوم. مطبوعة في لبنان، للّي بيفهم.',
        primary: 'شوف التصاميم',
        secondary: 'على ذوقك',
        proof1: 'مصنوع في لبنان',
        proof2: 'مطبوع في لبنان',
        proof3: 'تصاميم جرافيك',
      }
    : {
        eyebrow: 'Lebanese · daily · loud',
        title: 'Lebanese thought, produced & printed.',
        titleAccent: 'Lebneni Assli',
        tagline: 'Tees with the things people say every day. Printed in Lebanon, for the ones who get it.',
        primary: 'Shop the designs',
        secondary: 'Make it yours',
        proof1: 'Made in Lebanon',
        proof2: 'Printed in Lebanon',
        proof3: 'Graphic designs',
      };

  return (
    <section className="kh-dark relative overflow-hidden" style={{ borderBottom: '1px solid #322C25' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <span className="kh-d-eyebrow">{copy.eyebrow}</span>
            <img
              src={BRAND_ASSETS.markWhite}
              alt="Kharbesh"
              className="mt-5 w-full max-w-[540px]"
              style={{ mixBlendMode: 'screen', display: 'block' }}
            />
            <h1 className="kh-hero-title mt-4">
              {copy.title}{' '}
              <span className="kh-hero-accent">{copy.titleAccent}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg" style={{ color: '#C8BFA9' }}>{copy.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/shop" className="kh-d-btn-primary kh-btn-blob">{copy.primary}</Link>
              <Link to="/custom" className="kh-d-btn-brick kh-btn-blob kh-btn-blob-alt">{copy.secondary}</Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: '#8A8170' }}>
              <span style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' }}>{copy.proof1}</span>
              <span style={{ color: 'var(--brand-accent)' }}>•</span>
              <span style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' }}>{copy.proof2}</span>
              <span className="h-3 w-px hidden sm:inline-block" style={{ background: '#322C25' }} />
              <span style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' }}>{copy.proof3}</span>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <Link to="/shop" className="kh-d-card block">
              <div className="kh-d-media">
                <span className="kh-d-tag">{lang === 'ar' ? lead.tag_ar : lead.tag_en}</span>
                <img src={lead.img} alt={lead.title_en} className="w-full h-full object-contain" loading="lazy" />
              </div>
              <div className="kh-d-body">
                <span className="kh-d-title">{lang === 'ar' ? lead.title_ar : lead.title_en}</span>
                <span className="kh-d-cta">{lang === 'ar' ? 'تسوّق' : 'Shop'} →</span>
              </div>
            </Link>
            <img
              src={BRAND_ASSETS.iconWhiteLime}
              alt=""
              aria-hidden="true"
              className="absolute -top-8 -right-8 w-24 h-24 hidden sm:block"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
