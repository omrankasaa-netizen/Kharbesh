import React from 'react';
import { READY_DESIGNS } from '@/lib/readyDesigns';

export default function DesignMarquee() {
  const items = [...READY_DESIGNS, ...READY_DESIGNS];
  return (
    <div className="kh-d-marquee py-6">
      <div className="kh-design-marquee-track">
        {items.map((d, i) => (
          <div className="kh-design-tile" key={i}>
            <img src={d.img} alt={d.title_en} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}
