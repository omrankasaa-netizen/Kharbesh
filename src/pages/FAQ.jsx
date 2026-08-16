import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function FAQ() {
  const { t } = useI18n();
  const [open, setOpen] = useState(0);
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-16">
      <span className="kh-eyebrow">{t.faq.title}</span>
      <h1 className="mt-2 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.faq.title}</h1>
      <div className="mt-10 divide-y divide-border border-t border-b border-border">
        {t.faq.items.map((item, i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between gap-4 py-5 text-left" aria-expanded={open === i}>
              <span className="font-heading text-lg uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{item.q}</span>
              <span className="text-2xl shrink-0">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="pb-5 text-muted-foreground">{item.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
