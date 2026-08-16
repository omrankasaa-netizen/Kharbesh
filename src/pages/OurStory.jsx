import React from 'react';
import { useI18n } from '@/lib/i18n';
import { Scribble } from '@/components/Brand';

export default function OurStory() {
  const { t } = useI18n();
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-16">
      <span className="kh-eyebrow">{t.story.title}</span>
      <h1 className="mt-2 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.story.title}</h1>
      <Scribble className="mt-6" width={120} />
      <p className="mt-8 text-xl leading-relaxed">{t.story.lead}</p>
      <p className="mt-6 text-muted-foreground leading-relaxed">{t.story.body}</p>
    </div>
  );
}
