import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { READY_DESIGNS } from '@/lib/readyDesigns';

/* Editorial gallery: why each Kharbesh reads twice.
   Each entry pairs a detail crop of the artwork with the two readings. */
const ENTRIES = [
  {
    id: 'memo',
    phrase: { en: 'URGENT REQUEST', ar: 'طلب عاجل' },
    first: { en: 'A bureaucratic stamp of urgency.', ar: 'ختم رسمي بصيغة الاستعجال.' },
    second: { en: 'The urgent thing is never stated. It never is.', ar: 'الطلب العاجل ما بينكتب أبداً. هيك بيصير.' },
    crop: { x: '50%', y: '30%', scale: 2.2 },
  },
  {
    id: 'door',
    phrase: { en: 'YOUR OPINION?', ar: 'هيدا رأيك؟' },
    first: { en: 'A genuine question at the door.', ar: 'سؤال حقيقي عند الباب.' },
    second: { en: 'The door is already closed. The answer never mattered.', ar: 'الباب مسكّر من زمان. الجواب ما كان مهم.' },
    crop: { x: '50%', y: '60%', scale: 2.0 },
  },
  {
    id: 'paperboat',
    phrase: { en: 'PAPER BOAT', ar: 'قارب ورق' },
    first: { en: 'A Rahbani childhood image, folded neatly.', ar: 'صورة رحبانية من الطفولة، مطويّة بعناية.' },
    second: { en: 'Paper floats until it doesn’t. So do we.', ar: 'الورق بيطفو… لفترة. ونحن كمان.' },
    crop: { x: '50%', y: '45%', scale: 2.4 },
  },
];

export default function ReadItTwice() {
  const { lang } = useI18n();
  const items = ENTRIES.map((e) => ({ ...e, design: READY_DESIGNS.find((d) => d.id === e.id) })).filter((e) => e.design);

  return (
    <section style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <span className="kh-eyebrow">{lang === 'ar' ? 'النكتة بالتفصيل' : 'The joke, up close'}</span>
          <h2 className={`kh-section-title mt-3 ${lang === 'ar' ? 'kh-section-title-ar' : ''}`}>
            {lang === 'ar' ? 'اقراها مرتين.' : 'Read it twice.'}
          </h2>
          <p className="mt-3" style={{ color: 'var(--muted)' }}>
            {lang === 'ar'
              ? 'كل خربشة بتبلّش من جملة. النظرة التانية — هونيك ساكنة النكتة.'
              : 'Every Kharbesh starts with a phrase. The second look is where the joke lives.'}
          </p>
        </div>

        <div className="mt-12 grid gap-px lg:grid-cols-3" style={{ background: 'var(--line)', border: '1px solid var(--line)' }}>
          {items.map((e, i) => (
            <article key={e.id} className="flex flex-col" style={{ background: 'var(--paper-2)' }}>
              {/* Detail crop of the artwork */}
              <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 3', background: 'var(--paper-3)', borderBottom: '1px solid var(--line)' }}>
                <img
                  src={e.design.img}
                  alt={`${e.design.title_en} — detail`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ transform: `scale(${e.crop.scale})`, transformOrigin: `${e.crop.x} ${e.crop.y}` }}
                />
                <span className="kh-mono absolute top-3 left-3 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                  {lang === 'ar' ? `تفصيل ٠${i + 1}` : `Detail 0${i + 1}`} — {e.design.code}
                </span>
              </div>

              <div className="p-5 sm:p-6 flex flex-col flex-1">
                <h3 className="text-xl sm:text-2xl" style={{ fontFamily: "'Rakkas', var(--brand-font-body)", color: 'var(--ink)' }}>
                  {lang === 'ar' ? e.phrase.ar : e.phrase.en}
                </h3>

                <dl className="mt-5 space-y-4 flex-1">
                  <div>
                    <dt className="kh-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted-2)' }}>
                      {lang === 'ar' ? 'النظرة الأولى' : 'First look'}
                    </dt>
                    <dd className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{lang === 'ar' ? e.first.ar : e.first.en}</dd>
                  </div>
                  <div>
                    <dt className="kh-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--ink)' }}>
                      {lang === 'ar' ? 'النظرة التانية' : 'Second look'}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{lang === 'ar' ? e.second.ar : e.second.en}</dd>
                  </div>
                </dl>

                <Link to="/shop" className="kh-btn-text mt-6 self-start !text-[13px]">
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
