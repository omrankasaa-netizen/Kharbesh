import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts } from '@/lib/useCatalog.jsx';
import { BRAND_ASSETS } from '@/lib/brandAssets';
import heroMain from '@/assets/designs/hero-main.jpg';

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

/* Split a headline into [lead, accentWord] -- the last word renders in lime.
   Pure presentation split, never rewrites or drops any character of the source string. */
function splitAccent(line) {
  const words = line.trim().split(/\s+/);
  if (words.length < 2) return [line, ''];
  const accent = words.pop();
  return [words.join(' ') + ' ', accent];
}

export default function Hero() {
  const { lang } = useI18n();
  const { products } = useProducts();
  const lead = products[0];
  const lines = CAMPAIGNS[lang] || CAMPAIGNS.en;

  const [idx, setIdx] = useState(0);

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
        viewPiece: 'شوف القطعة ←',
        stamp: 'بموافقة تيتا ✓',
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
        viewPiece: 'View piece →',
        stamp: 'Teta approved ✓',
      };

  return (
    <section className="kh-hero" aria-label="Kharbesh — current campaign">
      {/* The visual IS the section — everything else is embedded in it */}
      <img
        src={heroMain}
        alt={lang === 'ar' ? 'شاب لبناني بتيشيرت خربش، بيهز كتفيه' : 'A Lebanese guy in a Kharbesh tee, shrugging'}
        className="kh-hero-photo"
        fetchpriority="high"
      />
      <div className="kh-hero-scrim" aria-hidden="true" />

      {/* Embedded content — lives in the photo's negative space */}
      <div className="kh-hero-content">
        <div className="kh-hero-block">
          <span className="kh-eyebrow">{copy.eyebrow}</span>

          <h1 className={`kh-hero-title mt-6 ${lang === 'ar' ? 'kh-hero-title-ar' : ''}`} aria-live="polite">
            <span key={`${lang}-${idx}`} className="kh-hero-line block">
              {(() => {
                const [lead, accent] = splitAccent(lines[idx]);
                return accent ? (<>{lead}<span className="kh-accent-word">{accent}</span></>) : lead;
              })()}
            </span>
          </h1>
          <div className="mt-5 flex items-center gap-3" aria-hidden="true">
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

          <p className="mt-6 text-base sm:text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {copy.support}{' '}
            <span className="kh-zig" style={{ whiteSpace: 'nowrap' }}>
              {copy.accent}
            </span>
          </p>
          <p className="mt-3 text-sm sm:text-base max-w-md" style={{ color: 'var(--muted)' }}>{copy.tagline}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/shop" className="kh-btn-mark">{copy.primary}</Link>
            <Link to="/custom" className="kh-btn-mark kh-btn-mark-brick">{copy.secondary}</Link>
          </div>

          <p className="kh-mono mt-8 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
            {copy.trust.join('  •  ')}
          </p>
        </div>
      </div>

      {/* Purchasable drop chip — pinned to the photo, bottom corner */}
      {lead && (
        <Link to={`/product/${lead.id}`} className="kh-hero-chip group">
          <span className="kh-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
            {copy.dropTag}
          </span>
          <span className="flex items-baseline gap-2">
            <span style={{ fontFamily: "'Rakkas', 'IBM Plex Sans Arabic', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
              {lang === 'ar' ? (lead.name_ar || lead.name_en) : lead.name_en}
            </span>
            <span className="kh-mono text-[12px]" style={{ color: 'var(--ink)' }}>
              ${lead.price}
            </span>
          </span>
          <span className="kh-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
            {copy.viewPiece}
          </span>
        </Link>
      )}

      {/* The one loud sticker — rotated, lime, slightly unnecessary */}
      <span className="kh-hero-stamp" aria-hidden="true">{copy.stamp}</span>

      <img
        src={BRAND_ASSETS.iconColor}
        alt=""
        aria-hidden="true"
        className="kh-hero-icon"
      />
    </section>
  );
}
