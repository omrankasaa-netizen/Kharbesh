import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts } from '@/lib/useCatalog.jsx';

/* Editorial gallery: why each Kharbesh reads twice.
   Curated copy per product id — pairs a detail crop of the LIVE product
   photo with the two readings. Only renders when the matching product is
   still active in the catalog; falls back to the next available product
   if none of the curated ids are live, so the section never shows stale
   artwork once a design is retired. */
const ENTRIES = [
  {
    matchNameIncludes: 'fine-ancially unstable',
    phrase: { en: "I'M FINE", ar: 'تمام' },
    first: { en: 'Tatmine hadye, ma2oule bsawt wadeh.', ar: 'طمأنة هادية، مقولة بصوت واضح.' },
    second: { en: 'La7ad ma el khat el a7mar byi2ta3 el jomle nossein: financially unstable.', ar: 'لحد ما الخط الأحمر بيقطع الجملة نصين: مالياً منهار.' },
    crop: { x: '50%', y: '50%', scale: 1 },
  },
  {
    matchNameIncludes: 'massari bi amen',
    phrase: { en: 'MONEY IS SAFE', ar: 'المصاري بأمان' },
    first: { en: '3onwan mtamen, tale3 min bab el khazneh.', ar: 'عنوان مطمّن، طالع من باب الخزنة.' },
    second: { en: 'Bass mish ma3na. W ma kanet abadan.', ar: 'بس مش معنا. وما كانت أبداً.' },
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
          <span className="kh-eyebrow">{lang === 'ar' ? 'النكتة بالتفصيل' : 'El nekte, 3an 2orb'}</span>
          <h2 className={`kh-section-title mt-3 ${lang === 'ar' ? 'kh-section-title-ar' : ''}`}>
            {lang === 'ar' ? 'اقراها مرتين.' : 'Read it twice.'}
          </h2>
          <p className="mt-3" style={{ color: 'var(--muted)' }}>
            {lang === 'ar'
              ? 'كل خربشة بتبلّش من جملة. النظرة التانية — هونيك ساكنة النكتة.'
              : 'Kel kharbesha btbalesh min jomleh. El nazra el tanyeh — honik sakneh el nekte.'}
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

                <dl className="mt-5 space-y-4 flex-1">
                  <div>
                    <dt className="kh-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted-2)' }}>
                      {lang === 'ar' ? 'النظرة الأولى' : 'El nazra el awwaleh'}
                    </dt>
                    <dd className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{lang === 'ar' ? e.first.ar : e.first.en}</dd>
                  </div>
                  <div>
                    <dt className="kh-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--ink)' }}>
                      {lang === 'ar' ? 'النظرة التانية' : 'El nazra el tanyeh'}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{lang === 'ar' ? e.second.ar : e.second.en}</dd>
                  </div>
                </dl>

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
