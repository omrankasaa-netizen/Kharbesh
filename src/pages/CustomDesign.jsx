import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useColors, useGarmentStyles } from '@/lib/useCatalog.jsx';
import { base44, fileToDataUrl } from '@/api/khClient';
import { Scribble } from '@/components/Brand';
import PhoneInput from '@/components/PhoneInput';
import { toE164, getCountry, validatePhone } from '@/lib/phoneCountries';

export default function CustomDesign() {
  const { t, lang } = useI18n();
  const colors = useColors();
  const styles = useGarmentStyles();
  const [form, setForm] = useState({ name: '', email: '', phrase: '', story: '', language: '', recipient: '', occasion: '', tone: 'subtle', garment: '', color: '', size: '', quantity: 1, placement: '', needed_by: '', notes: '', rights: false });
  // Optional phone — same international picker as checkout. Stays optional,
  // but when filled it must validate and is sent as E.164.
  const [phone, setPhone] = useState({ iso: 'LB', national: '' });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    setError('');
    // Server only accepts these MIME types as base64 data URLs (audit H2) —
    // reject anything else here with a bilingual error instead of sending a
    // request that's guaranteed to fail validation.
    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
    if (list.some((f) => !ALLOWED.includes(f.type))) {
      setError(lang === 'ar'
        ? 'الملفات المسموحة: صور (PNG, JPG, WebP, GIF) أو PDF فقط.'
        : 'Only images (PNG, JPG, WebP, GIF) or PDF files are allowed.');
      e.target.value = '';
      return;
    }
    if (list.length > 4) {
      setError(lang === 'ar' ? 'أقصى عدد هو ٤ ملفات.' : 'You can attach up to 4 files.');
      e.target.value = '';
      return;
    }
    try {
      // Always send data URLs (never R2 links) so the server's data-URL
      // schema accepts them for every visitor, signed-in staff included.
      const urls = [];
      for (const f of list) urls.push(await fileToDataUrl(f));
      setFiles(urls);
    } catch (err) {
      setError(err?.message || (lang === 'ar' ? 'تعذّرت قراءة الملف.' : 'Could not read that file.'));
      e.target.value = '';
    }
  };

  const phoneDial = getCountry(phone.iso).dial;
  const phoneFilled = !!phone.national.trim();
  const phoneInvalid = phoneFilled && !!validatePhone(phone.iso, phoneDial, phone.national, lang);
  const showPhoneError = phoneTouched && phoneInvalid;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rights) { setError(t.custom.rights); return; }
    if (phoneInvalid) { setPhoneTouched(true); setError(t.checkout.phoneInvalid); return; }
    setLoading(true);
    setError('');
    try {
      await base44.entities.CustomProject.create({
        ...form,
        phone: phoneFilled ? toE164(phoneDial, phone.national) : undefined,
        quantity: Number(form.quantity) || 1,
        reference_files: files,
        status: 'new_request',
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-20 text-center">
        <span className="kh-eyebrow">{t.custom.title}</span>
        <h1 className="mt-3 font-heading text-5xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.custom.submitted}</h1>
        <Scribble className="mx-auto mt-6" width={120} />
        <p className="mt-6 text-muted-foreground">{t.custom.submitted}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
      <span className="kh-eyebrow">{t.custom.title}</span>
      <h1 className="mt-2 font-heading text-4xl sm:text-6xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.custom.title}</h1>
      <p className="mt-3 text-muted-foreground max-w-xl">{t.custom.sub}</p>
      <span
        className="kh-mono inline-block mt-4 text-xs uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border"
        style={{ borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)', background: 'color-mix(in srgb, var(--brand-accent) 8%, transparent)' }}
      >
        {t.custom.startingAt}
      </span>
      <Scribble className="mt-6" width={100} />

      <form onSubmit={submit} className="mt-10 space-y-8">
        <section className="grid gap-4">
          <Field label={t.custom.phrase} help={t.custom.phraseHelp} required>
            <input required value={form.phrase} onChange={set('phrase')} className="kh-input" placeholder="ما إلي خلق" />
          </Field>
          <Field label={t.custom.story} help={t.custom.storyHelp} required>
            <textarea required rows={4} value={form.story} onChange={set('story')} className="kh-input" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t.custom.language}><input value={form.language} onChange={set('language')} className="kh-input" placeholder="Arabic / Arabizi / English" /></Field>
            <Field label={t.custom.tone}>
              <select value={form.tone} onChange={set('tone')} className="kh-input">
                {Object.entries(t.custom.toneOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t.custom.recipient}><input value={form.recipient} onChange={set('recipient')} className="kh-input" /></Field>
            <Field label={t.custom.occasion}><input value={form.occasion} onChange={set('occasion')} className="kh-input" /></Field>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Field label={t.custom.garment}>
            <select value={form.garment} onChange={set('garment')} className="kh-input">
              <option value="">—</option>
              {styles.map((s) => <option key={s.id} value={s.name_en}>{lang === 'ar' ? s.name_ar : s.name_en}</option>)}
            </select>
          </Field>
          <Field label={t.custom.color}>
            <select value={form.color} onChange={set('color')} className="kh-input">
              <option value="">—</option>
              {colors.map((c) => <option key={c.id} value={c.name_en}>{lang === 'ar' ? c.name_ar : c.name_en}</option>)}
            </select>
          </Field>
          <Field label={t.custom.size}><input value={form.size} onChange={set('size')} className="kh-input" placeholder="M" /></Field>
          <Field label={t.custom.quantity}><input type="number" min="1" value={form.quantity} onChange={set('quantity')} className="kh-input" /></Field>
          <Field label={t.custom.placement}><input value={form.placement} onChange={set('placement')} className="kh-input" placeholder="Full back" /></Field>
          <Field label={t.custom.neededBy} help={t.custom.neededByHelp}><input type="date" value={form.needed_by} onChange={set('needed_by')} className="kh-input" /></Field>
        </section>

        <section className="grid gap-4">
          <Field label={t.custom.notes}><textarea rows={3} value={form.notes} onChange={set('notes')} className="kh-input" /></Field>
          <Field label="Reference files">
            <input type="file" multiple onChange={onFiles} accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="text-sm" />
          </Field>
        </section>

        <section className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t.contact.name} required><input required value={form.name} onChange={set('name')} className="kh-input" /></Field>
            <Field label={t.contact.email} required><input type="email" required value={form.email} onChange={set('email')} className="kh-input" /></Field>
          </div>
          <Field label={t.checkout.phone}>
            <PhoneInput value={phone} onChange={setPhone} onBlur={() => setPhoneTouched(true)} invalid={showPhoneError} />
            {showPhoneError && <p className="text-destructive text-xs mt-1">{t.checkout.phoneInvalid}</p>}
          </Field>
        </section>

        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" checked={form.rights} onChange={(e) => setForm((f) => ({ ...f, rights: e.target.checked }))} className="mt-1 w-5 h-5 accent-[--brand-accent]" />
          <span>{t.custom.rights}</span>
        </label>

        {error && <p className="text-destructive text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="kh-btn-scribble">{loading ? t.common.loading : t.custom.submit}</button>
      </form>
    </div>
  );
}

const Field = ({ label, help, required, children }) => (
  <label className="block">
    <span className="kh-eyebrow block mb-1">{label}{required && ' *'}</span>
    {children}
    {help && <span className="block text-xs text-muted-foreground mt-1">{help}</span>}
  </label>
);
