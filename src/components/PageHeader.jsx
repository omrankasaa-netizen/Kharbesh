import React from 'react';
import { Scribble } from '@/components/Brand';

export default function PageHeader({ eyebrow, title, sub, scribbleWidth = 120 }) {
  return (
    <header>
      <span className="kh-eyebrow">{eyebrow}</span>
      <h1 className="mt-2 font-heading text-4xl sm:text-6xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-muted-foreground">{sub}</p>}
      <Scribble className="mt-6" width={scribbleWidth} />
    </header>
  );
}
