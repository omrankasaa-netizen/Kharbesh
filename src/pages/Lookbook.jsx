import React from 'react';
import PageHeader from '@/components/PageHeader';
import { READY_DESIGNS } from '@/lib/readyDesigns';
import { useI18n } from '@/lib/i18n';

export default function Lookbook() {
  const { lang } = useI18n();
  const tiles = READY_DESIGNS.concat(READY_DESIGNS).concat(READY_DESIGNS);
  return (
    <div className="pb-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-12">
        <PageHeader eyebrow="Lookbook" title={lang === 'ar' ? 'لوك بوك' : 'Lookbook'} sub={lang === 'ar' ? 'تصاميم خربش على الألبسة، بأسلوب تحريري.' : 'Kharbesh garments, shot editorial.'} />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-10 columns-2 lg:columns-3 gap-4">
        {tiles.map((d, i) => (
          <figure key={i} className="mb-4 break-inside-avoid kh-d-card">
            <div className="kh-d-media" style={{ aspectRatio: i % 3 === 0 ? '3/4' : '4/5' }}>
              <img src={d.img} alt={d.title_en} loading="lazy" />
            </div>
            <figcaption className="kh-d-body"><span className="kh-d-title">{lang === 'ar' ? d.title_ar : d.title_en}</span></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
