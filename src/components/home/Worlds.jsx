import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCollections } from '@/lib/useCatalog.jsx';

/* The Kharbesh worlds bento — driven by the admin's own Collections list,
   so a new collection shows up here the moment it's created, with no code
   change. Visual treatment (span/shape/hover-action/fallback accent) still
   cycles through the site's four signature patterns, i % 4, so the bento
   keeps its handmade rhythm no matter how many collections exist.
   A pinned "3a Zaw2ak" card always closes the row — it's not a catalog
   collection, it's the custom-order door, so it keeps its own fixed
   amber/notch treatment regardless of the cycle. */
const SPANS = ['sm:col-span-7', 'sm:col-span-5', 'sm:col-span-5', 'sm:col-span-7'];
const SHAPES = ['kh-world-notch kh-world-lg', 'kh-world-tab', 'kh-world-tab', 'kh-world-notch kh-world-lg'];
const ACTIONS = ['act-stamp', 'act-dot', 'act-scribble', 'act-route'];
const FALLBACK_ACCENTS = ['var(--brick)', 'var(--lime)', 'var(--plum)', 'var(--amber)'];
const FALLBACK_INKS = ['var(--ink)', 'var(--on-lime)', 'var(--on-lime)', 'var(--on-lime)'];

const FALLBACK_DESC = {
  en: "New kharabish, this world's mood.",
  ar: 'خربشات جديدة، بمزاج هالعالم.',
};

/* Admin collection names are entered as "Kharbesh <Name>" (or "خربش <Name>"
   in Arabic) for internal clarity — strip that prefix for the card's
   display name so the bento shows just "Politics", "أقوال", etc. */
function shortName(name) {
  if (!name) return '';
  return name.replace(/^(Kharbesh|خربش)\s+/i, '').trim();
}

/* Best-effort text contrast for an admin-picked hex accent, so the corner
   tag stays legible no matter which color they chose. */
function contrastInk(hex) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) return null;
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? 'var(--on-lime)' : 'var(--ink)';
}

export default function Worlds() {
  const { t, lang } = useI18n();
  const { collections } = useCollections();

  const worldCards = collections.map((c, i) => ({
    key: c.id,
    to: `/collections/${c.slug}`,
    name: { en: shortName(c.name_en), ar: shortName(c.name_ar) || shortName(c.name_en) },
    ghost: shortName(c.name_ar) || shortName(c.name_en),
    desc: {
      en: c.description_en || FALLBACK_DESC.en,
      ar: c.description_ar || FALLBACK_DESC.ar,
    },
    cta: {
      en: `Enter ${shortName(c.name_en)} →`,
      ar: `ادخل ${shortName(c.name_ar) || shortName(c.name_en)} ←`,
    },
    action: ACTIONS[i % 4],
    accent: c.accent || FALLBACK_ACCENTS[i % 4],
    ink: (c.accent && contrastInk(c.accent)) || FALLBACK_INKS[i % 4],
    shape: SHAPES[i % 4],
    span: SPANS[i % 4],
  }));

  const zaw2akCard = {
    key: 'zaw2ak-pinned',
    to: '/custom',
    name: { en: '3a Zaw2ak', ar: 'ع ذوقك' },
    ghost: 'ع ذوقك',
    desc: {
      en: 'Your line, our pens — a piece nobody else has. Khalas.',
      ar: 'جملتك. أقلامنا. قطعة ما حدا غيرك عنده ياها.',
    },
    cta: { en: 'Kharbesh 3a Zaw2ak →', ar: 'على ذوقك ←' },
    action: 'act-route',
    accent: 'var(--amber)',
    ink: 'var(--on-lime)',
    shape: 'kh-world-notch kh-world-lg',
    span: 'sm:col-span-7',
    pinned: true,
  };

  const cards = [...worldCards, zaw2akCard];

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
        {cards.map((w, i) => (
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
