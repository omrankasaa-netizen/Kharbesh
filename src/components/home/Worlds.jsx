import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';

/* The four Kharbesh worlds — typography-led entry cards.
   Each card carries its giant Arabic ghost word behind the Latin name,
   plus ONE signature hover action. Nothing else moves. */
const WORLDS = [
  {
    key: 'salbeh',
    to: '/shop',
    name: { en: 'Salbeh', ar: 'سلبة' },
    ghost: 'سلبة',
    desc: {
      en: 'Sharp replies for slow systems, long queues, traffic, and daily survival.',
      ar: 'ردود حادّة للأنظمة البطيئة، الطوابير، الازدحام، والبقاء اليومي.',
    },
    cta: { en: 'Enter Salbeh →', ar: 'ادخل سلبة ←' },
    action: 'act-stamp',
  },
  {
    key: 'lebneni',
    to: '/drop',
    name: { en: 'Lebneni', ar: 'لبناني' },
    ghost: 'لبناني',
    desc: {
      en: 'Local phrases, family lines, and the things only we say.',
      ar: 'جمل محلية، أحاديث عائلية، وأشياء بس نحنا منقولها.',
    },
    cta: { en: 'Enter Lebneni →', ar: 'ادخل لبناني ←' },
    action: 'act-dot',
  },
  {
    key: 'sa2afeh',
    to: '/collections',
    name: { en: 'Sa2afeh', ar: 'ثقافة' },
    ghost: 'ثقافة',
    desc: {
      en: 'Culture, poetry, theatre, music, and lines that stayed with us.',
      ar: 'ثقافة، شعر، مسرح، موسيقى، وجمل ضلّت معنا.',
    },
    cta: { en: 'Enter Sa2afeh →', ar: 'ادخل ثقافة ←' },
    action: 'act-scribble',
  },
  {
    key: 'zaw2ak',
    to: '/custom',
    name: { en: '3a Zaw2ak', ar: 'ع ذوقك' },
    ghost: 'ع ذوقك',
    desc: {
      en: 'Your phrase. Our pens. One piece nobody else has.',
      ar: 'جملتك. أقلامنا. قطعة ما حدا غيرك عنده ياها.',
    },
    cta: { en: 'Make it yours →', ar: 'على ذوقك ←' },
    action: 'act-route',
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

      <div className="grid sm:grid-cols-2 gap-px" style={{ background: 'var(--line)', border: '1px solid var(--line)' }}>
        {WORLDS.map((w, i) => (
          <Link key={w.key} to={w.to} className={`kh-world kh-world-${w.action} group`}>
            {/* Giant Arabic ghost word — the world's real name, breathing behind */}
            <span className="kh-world-ghost" aria-hidden="true">{w.ghost}</span>

            <div className="relative flex items-baseline justify-between">
              <span className="kh-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                {lang === 'ar' ? `عالم ٠${i + 1}` : `World 0${i + 1}`}
              </span>
              <span className="kh-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted-2)' }}>
                Kharbesh
              </span>
            </div>

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
