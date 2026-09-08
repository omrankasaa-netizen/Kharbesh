import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts } from '@/lib/useCatalog.jsx';

/* Editorial gallery: why each Kharbesh reads twice.
   Curated copy per product id — pairs a detail crop of the LIVE product
   photo with its phrase. Only renders when the matching product is
   still active in the catalog; falls back to the next available product
   if none of the curated ids are live, so the section never shows stale
   artwork once a design is retired.
   We deliberately don't spell out the "second reading" anymore — the joke
   speaks for itself, or it doesn't land. Over-explaining it killed it. */
const ENTRIES = [
  {
    matchNameIncludes: 'fine-ancially unstable',
    phrase: { en: "I'M FINE", ar: 'تمام' },
    crop: { x: '50%', y: '50%', scale: 1 },
  },
  {
    matchNameIncludes: 'massari bi amen',
    phrase: { en: 'MONEY IS SAFE', ar: 'المصاري بأمان' },
    crop: { x: '50%', y: '50%', scale: 1 },
  },
];

export default function ReadItTwice() {
  const { lang } = useI18n();
  const { products, loading } = useProducts();

  const items = ENTRIES.map((e) => ({
    ...e,
    product: products.find((p) => (p.name_en || '').toLowerCase().includes(e.matchNameIncludes)),
  })).filter((e) => e.product);

  if (!loading && items.length === 0) return null;

  return (
    <section style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <span className="kh-eyebrow">{lang === 'ar' ? 'النكتة بالتفصيل' : 'El nekte, min 2rib'}</span>
          <h2 className={`kh-section-title mt-3 ${lang === 'ar' ? 'kh-section-title-ar' : ''}`}>
            {lang === 'ar' ? 'اقراها مرتين.' : 'Read it twice.'}
          </h2>
          <p className="mt-3" style={{ color: 'var(--muted)' }}>
            {lang === 'ar'
              ? 'كل خربشة بتبلّش من جملة واحدة. والنكتة الحقيقية ساكنة بالنظرة الثانية — ولأ، ما رح نشرحها لك.'
              : "Every design starts with a line. The second read is where the joke lives — and no, we're not explaining it."}
          </p>
        </div>

        <div className={`mt-12 grid gap-px ${items.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`} style={{ background: 'var(--line)', border: '1px solid var(--line)' }}>
          {items.map((e, i) => (
            <article key={e.product.id} className="flex flex-col" style={{ background: 'var(--paper-2)' }}>
              {/* Detail crop of the artwork */}
              <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 3', background: 'var(--paper-3)', borderBottom: '1px solid var(--line)' }}>
                <img
                  src={e.product.images?.[0]}
                  alt={`${e.product.name_en} — detail`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ transform: `scale(${e.crop.scale})`, transformOrigin: `${e.crop.x} ${e.crop.y}` }}
                />
                <span className="kh-mono absolute top-3 left-3 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                  {lang === 'ar' ? `تفصيل ٠${i + 1}` : `Detail 0${i + 1}`}
                </span>
              </div>

              <div className="p-5 sm:p-6 flex flex-col flex-1">
                <h3 className="text-xl sm:text-2xl" style={{ fontFamily: "'Rakkas', 'IBM Plex Sans Arabic', sans-serif", color: 'var(--ink)' }}>
                  {lang === 'ar' ? e.phrase.ar : e.phrase.en}
                </h3>

                <Link to={`/product/${e.product.id}`} className="kh-btn-text mt-6 self-start !text-[13px]">
                  {lang === 'ar' ? 'شوف القطعة ←' : 'View piece →'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
