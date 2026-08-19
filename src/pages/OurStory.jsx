import React from 'react';
import { useI18n } from '@/lib/i18n';
import { Scribble, DotsMark } from '@/components/Brand';

// Presentational-only split: pulls the first sentence of the body copy into a
// large pull-quote treatment. No characters are added, removed, or changed —
// same approach as the homepage hero's accent-word treatment.
function splitPullQuote(body) {
  const match = body.match(/^(.*?[.!?])\s+(.*)$/s);
  if (!match) return { quote: body, rest: '' };
  return { quote: match[1], rest: match[2] };
}

export default function OurStory() {
  const { t } = useI18n();
  const { quote, rest } = splitPullQuote(t.story.body);
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-16 relative">
      <div className="kh-story-halftone" aria-hidden="true" />
      <span className="kh-eyebrow">{t.story.title}</span>
      <h1 className="mt-2 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.story.title}</h1>
      <Scribble className="mt-6" width={120} />
      <p className="mt-8 text-xl leading-relaxed">{t.story.lead}</p>
      <blockquote className="kh-story-pullquote">
        <span>{quote}</span>
      </blockquote>
      <p className="mt-2 text-muted-foreground leading-relaxed">{rest}</p>
      <DotsMark className="mt-10" lime />
    </div>
  );
}
