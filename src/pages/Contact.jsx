import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSiteSettings } from '@/lib/useCatalog.jsx';
import { base44 } from '@/api/khClient';
import { whatsappLink } from '@/lib/whatsapp';
import { IconWhatsApp } from '@/components/Brand';

export default function Contact() {
  const { t, lang } = useI18n();
  const { settings } = useSiteSettings();
  const contact = settings?.contact || {};
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await base44.entities.ContactMessages.create(form);
      setSent(true);
    } catch (err) {
      setError(err?.message || (lang === 'ar' ? 'في خطأ، جرب كمان مرة.' : 'Something went wrong. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-16">
      <span className="kh-eyebrow">{t.contact.title}</span>
      <h1 className="mt-2 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.contact.title}</h1>
      <p className="mt-4 text-muted-foreground max-w-[560px]">{t.contact.sub}</p>

      <div className="mt-10 grid gap-10 sm:grid-cols-[1fr_1.2fr]">
        {/* Direct contact info card — sourced from site settings so it stays in sync with the sticker/storefront details. */}
        <div className="bg-card border border-border rounded-md p-6 h-fit">
          <h2 className="font-heading text-lg uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.contact.infoTitle}</h2>
          <a
            href={whatsappLink(contact.whatsappNumber, lang === 'ar' ? 'هاي خربش!' : 'Hi Kharbesh!')}
            target="_blank"
            rel="noreferrer"
            className="kh-btn-scribble w-full !justify-center flex items-center gap-2"
          >
            <IconWhatsApp size={18} /> {t.contact.whatsappCta}
          </a>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">{t.contact.phone}</span><span>+961 76 465367</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">Instagram</span>
              <a href={`https://instagram.com/${contact.instagramHandle || 'kharbeshh'}`} target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">@{contact.instagramHandle || 'kharbeshh'}</a>
            </li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">Facebook</span>
              <a href={`https://facebook.com/${contact.facebookHandle || 'Kharbeshh'}`} target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">{contact.facebookHandle || 'Kharbeshh'}</a>
            </li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">Web</span><span>kharbesh961.com</span></li>
          </ul>
        </div>

        {/* Fallback contact-us form for anyone who'd rather not use WhatsApp. */}
        {sent ? (
          <p className="h-fit bg-muted p-6 rounded-sm">{t.contact.sent}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block"><span className="kh-eyebrow block mb-1">{t.contact.name}</span><input required value={form.name} onChange={set('name')} className="kh-input" /></label>
            <label className="block"><span className="kh-eyebrow block mb-1">{t.contact.email}</span><input type="email" required value={form.email} onChange={set('email')} className="kh-input" /></label>
            <label className="block"><span className="kh-eyebrow block mb-1">{t.contact.phone} ({lang === 'ar' ? 'اختياري' : 'optional'})</span><input type="tel" value={form.phone} onChange={set('phone')} className="kh-input" /></label>
            <label className="block"><span className="kh-eyebrow block mb-1">{t.contact.message}</span><textarea required rows={5} value={form.message} onChange={set('message')} className="kh-input" /></label>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="kh-btn-scribble">{loading ? t.common.loading : t.contact.send}</button>
          </form>
        )}
      </div>
    </div>
  );
}
