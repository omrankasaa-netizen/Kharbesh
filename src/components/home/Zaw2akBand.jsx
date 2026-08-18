import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { DotsMark } from '@/components/Brand';

/* Anonymized phrases actually sent to 3a Zaw2ak — rotate gently,
   like studio proofs pinned to a wall. */
const PROOFS = [
  { en: '“shu sawwaneh halla2?”', ar: '«شو صوّانة هلّق؟»' },
  { en: '“ma32oul ya rajol”', ar: '«معقول يا رجل»' },
  { en: '“teta’s weather forecast”', ar: '«نشرة طقس تيتا»' },
  { en: '“min ba3d iznak ya bayy”', ar: '«من بعد إذنك يا بيّي»' },
];

export default function Zaw2akBand() {
  const { lang } = useI18n();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % PROOFS.length), 3600);
    return () => clearInterval(id);
  }, []);

  const copy = lang === 'ar'
    ? {
        eyebrow: 'ع ذوقك',
        title: 'جملتك. أقلامنا. بلا حرق للنكتة.',
        sub: 'ابعتلنا الجملة يلي عيلتك ما عم توقف تقلّها — مع قصّتها. منحوّلها لقطعة خربش مصنوعة إلك.',
        approve: 'بتشوف التصميم وتوافق عليه قبل الطباعة.',
        cta: 'خربشها على ذوقي ←',
        proofLabel: 'من رسائلكن — مثبتة بالستوديو',
      }
    : {
        eyebrow: '3a Zaw2ak',
        title: 'Your line. Our pens. Zero spoilers.',
        sub: 'Send us the phrase your family can’t stop saying — with the story behind it. We turn it into a Kharbesh piece made for you.',
        approve: 'You approve the design before we print.',
        cta: 'Kharbesh it my way →',
        proofLabel: 'From your messages — pinned in the studio',
      };

  return (
    <section className="kh-ink mt-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <span className="kh-eyebrow">{copy.eyebrow}</span>
            <h2 className="mt-4 text-3xl sm:text-4xl" style={{ fontFamily: "'Rakkas', var(--brand-font-body)", color: 'var(--paper)', lineHeight: 1.3 }}>
              {copy.title}
            </h2>
            <p className="mt-4 max-w-md text-sm sm:text-base" style={{ color: 'rgba(251,246,235,.62)' }}>{copy.sub}</p>
            <p className="kh-mono mt-5 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'rgba(251,246,235,.5)' }}>
              {copy.approve}
            </p>
            <Link to="/custom" className="kh-d-btn-brick mt-7 !text-[14px]">{copy.cta}</Link>
          </div>

          {/* Studio proof card — the one lime spark is the tape */}
          <div className="relative kh-proof" style={{ border: '1px solid rgba(251,246,235,.18)', borderRadius: 2 }}>
            <span className="kh-proof-tape" aria-hidden="true" />
            <span className="kh-mono block text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(251,246,235,.45)' }}>
              {copy.proofLabel}
            </span>
            <div className="min-h-[120px] flex items-center justify-center py-8">
              <span
                key={`${lang}-${idx}`}
                className="kh-hero-line text-2xl sm:text-4xl text-center leading-snug px-4"
                style={{ fontFamily: "'Rakkas', var(--brand-font-body)", color: 'var(--paper)' }}
                aria-live="polite"
              >
                {lang === 'ar' ? PROOFS[idx].ar : PROOFS[idx].en}
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ borderTop: '1px solid rgba(251,246,235,.12)', paddingTop: 14 }}>
              <DotsMark />
              <span className="kh-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(251,246,235,.4)' }}>
                {String(idx + 1).padStart(2, '0')} / {String(PROOFS.length).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
