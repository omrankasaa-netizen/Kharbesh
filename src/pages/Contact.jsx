import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function Contact() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-16">
      <span className="kh-eyebrow">{t.contact.title}</span>
      <h1 className="mt-2 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.contact.title}</h1>
      <p className="mt-4 text-muted-foreground">{t.contact.sub}</p>
      {sent ? (
        <p className="mt-10 bg-muted p-6 rounded-sm">{t.contact.sent}</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-10 space-y-4">
          <label className="block"><span className="kh-eyebrow block mb-1">{t.contact.name}</span><input required className="kh-input" /></label>
          <label className="block"><span className="kh-eyebrow block mb-1">{t.contact.email}</span><input type="email" required className="kh-input" /></label>
          <label className="block"><span className="kh-eyebrow block mb-1">{t.contact.message}</span><textarea required rows={5} className="kh-input" /></label>
          <button type="submit" className="kh-btn-scribble">{t.contact.send}</button>
        </form>
      )}
    </div>
  );
}
