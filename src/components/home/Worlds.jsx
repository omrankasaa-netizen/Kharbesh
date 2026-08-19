import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';

/* The four Kharbesh worlds — a bento of typography-led entry cards.
   Each one carries its own accent color, its own shape, its giant Arabic
   ghost word behind the Latin name, plus ONE signature hover action. */
const WORLDS = [
  {
    key: 'salbeh',
    to: '/shop',
    name: { en: 'Salbeh', ar: 'سلبة' },
    ghost: 'سلبة',
    desc: {
      en: 'Rodoud 2asyeh la transport ba2i, dawr taweel, w el survival el youmi.',
      ar: 'ردود حادّة للأنظمة البطيئة، الطوابير، الازدحام، والبقاء اليومي.',
    },
    cta: { en: 'Enter Salbeh →', ar: 'ادخل سلبة ←' },
    action: 'act-stamp',
    accent: 'var(--brick)',
    ink: 'var(--ink)',
    shape: 'kh-world-notch kh-world-lg',
    span: 'sm:col-span-7',
  },
  {
    key: 'lebneni',
    to: '/drop',
    name: { en: 'Lebneni', ar: 'لبناني' },
    ghost: 'لبناني',
    desc: {
      en: 'Jomal mahalliyeh, 7aki 3ayle, w eshi ma byehkih ghair na7na.',
      ar: 'جمل محلية، أحاديث عائلية، وأشياء بس نحنا منقولها.',
    },
    cta: { en: 'Enter Lebneni →', ar: 'ادخل لبناني ←' },
    action: 'act-dot',
    accent: 'var(--lime)',
    ink: 'var(--on-lime)',
    shape: 'kh-world-tab',
    span: 'sm:col-span-5',
  },
  {
    key: 'sa2afeh',
    to: '/collections',
    name: { en: 'Sa2afeh', ar: 'ثقافة' },
    ghost: 'ثقافة',
    desc: {
      en: 'Sa2afeh, shi3er, masra7, mousi2a, w jomal 2eleh ma3na.',
      ar: 'ثقافة، شعر، مسرح، موسيقى، وجمل ضلّت معنا.',
    },
    cta: { en: 'Enter Sa2afeh →', ar: 'ادخل ثقافة ←' },
    action: 'act-scribble',
    accent: 'var(--plum)',
    ink: 'var(--on-lime)',
    shape: 'kh-world-tab',
    span: 'sm:col-span-5',
  },
  {
    key: 'zaw2ak',
    to: '/custom',
    name: { en: '3a Zaw2ak', ar: 'ع ذوقك' },
    ghost: 'ع ذوقك',
    desc: {
      en: 'Jomletak. 2lamna. 2it3a ma 3ind wala wa7ad gherak.',
      ar: 'جملتك. أقلامنا. قطعة ما حدا غيرك عنده ياها.',
    },
    cta: { en: 'Make it yours →', ar: 'على ذوقك ←' },
    action: 'act-route',
    accent: 'var(--amber)',
    ink: 'var(--on-lime)',
    shape: 'kh-world-notch kh-world-lg',
    span: 'sm:col-span-7',
  },
];

export default function Worlds() {
  const { t, lang } = useI18n();
  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="flex items-end justify-between gap-4 mb-10">
        <div>
          <span className="kh-eyebrow">{t.home.collectionsEyebrow}</span>
          <h2 className={`kh-section-title mt-3 ${lang === 'ar' ? 'kh-section-title-ar' : ''}`}>{t.home.collectionsTitle}</h2>
          <p className="mt-3" style={{ color: 'var(--muted)' }}>{t.home.collectionsSub}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-5">
        {WORLDS.map((w, i) => (
          <Link
            key={w.key}
            to={w.to}
            className={`kh-world kh-world-${w.action} ${w.shape} ${w.span} group`}
            style={{ '--world-accent': w.accent, '--world-ink': w.ink }}
          >
            {/* Giant Arabic ghost word — the world's real name, breathing behind */}
            <span className="kh-world-ghost" aria-hidden="true">{w.ghost}</span>

            {/* Corner sticker — visible at rest, no hover needed */}
            <span className="kh-world-tag" aria-hidden="true">
              <b>{String(i + 1).padStart(2, '0')}</b>
              {lang === 'ar' ? 'عالم' : 'World'}
            </span>

            <h3 className="kh-world-name">
              {lang === 'ar' ? w.name.ar : w.name.en}
              {w.action === 'act-dot' && <i className="kh-world-dot" aria-hidden="true" />}
            </h3>

            <p className="relative mt-3 text-sm max-w-sm" style={{ color: 'var(--muted)' }}>
              {lang === 'ar' ? w.desc.ar : w.desc.en}
            </p>

            <span className="kh-world-cta">{lang === 'ar' ? w.cta.ar : w.cta.en}</span>

            {w.action === 'act-stamp' && (
              <span className="kh-world-stamp" aria-hidden="true">
                {lang === 'ar' ? 'مردود' : 'Returned'}
              </span>
            )}
            {w.action === 'act-route' && <i className="kh-world-route" aria-hidden="true" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
