import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const KEY = 'kharbesh_settings_v1';
const DEFAULTS = {
  storeName: 'Kharbesh',
  tagline_en: 'Tees with the things people say every day.',
  tagline_ar: 'تيشيرتات عليها الكلام يلي بيتقال كل يوم.',
  banner_en: '',
  banner_ar: '',
  bannerEnabled: false,
  preordersEnabled: true,
  customRequestsEnabled: true,
  guestCheckoutEnabled: true,
  maintenance: false,
};

export default function SiteSettings() {
  const { lang } = useI18n();
  const [s, setS] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setS((p) => ({ ...p, [k]: val }));
    setSaved(false);
  };

  const save = (e) => {
    e.preventDefault();
    try { localStorage.setItem(KEY, JSON.stringify(s)); setSaved(true); } catch { /* ignore */ }
  };

  const toggles = [
    { key: 'bannerEnabled', label_en: 'Announcement banner', label_ar: 'شريط الإعلان' },
    { key: 'preordersEnabled', label_en: 'Preorders', label_ar: 'الطلبات المسبقة' },
    { key: 'customRequestsEnabled', label_en: 'Custom design requests', label_ar: 'طلبات التصميم' },
    { key: 'guestCheckoutEnabled', label_en: 'Guest checkout', label_ar: 'دفع كضيف' },
    { key: 'maintenance', label_en: 'Maintenance mode', label_ar: 'صيانة' },
  ];

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'إعدادات المتجر' : 'Site settings'} />
      <form onSubmit={save} className="mt-8 space-y-8">
        <section className="bg-card border border-border rounded-md p-6 space-y-4">
          <h2 className="font-heading text-xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'معلومات المتجر' : 'Store info'}</h2>
          <label className="block"><span className="kh-eyebrow block mb-1">Store name</span><input value={s.storeName} onChange={set('storeName')} className="kh-input" /></label>
          <label className="block"><span className="kh-eyebrow block mb-1">Tagline (EN)</span><input value={s.tagline_en} onChange={set('tagline_en')} className="kh-input" /></label>
          <label className="block"><span className="kh-eyebrow block mb-1">Tagline (AR)</span><input value={s.tagline_ar} onChange={set('tagline_ar')} className="kh-input" dir="rtl" /></label>
        </section>

        <section className="bg-card border border-border rounded-md p-6 space-y-4">
          <h2 className="font-heading text-xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'شريط الإعلان' : 'Announcement banner'}</h2>
          <label className="block"><span className="kh-eyebrow block mb-1">Banner text (EN)</span><input value={s.banner_en} onChange={set('banner_en')} className="kh-input" placeholder="New drop live — 3A ZAW2AK" /></label>
          <label className="block"><span className="kh-eyebrow block mb-1">Banner text (AR)</span><input value={s.banner_ar} onChange={set('banner_ar')} className="kh-input" dir="rtl" placeholder="دروب جديد — على ذوقك" /></label>
        </section>

        <section className="bg-card border border-border rounded-md p-6">
          <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'الميزات' : 'Features'}</h2>
          <div className="space-y-3">
            {toggles.map((tg) => (
              <label key={tg.key} className="flex items-center justify-between gap-4 cursor-pointer py-2 border-b border-border last:border-0">
                <span>{lang === 'ar' ? tg.label_ar : tg.label_en}</span>
                <input type="checkbox" checked={s[tg.key]} onChange={set(tg.key)} className="w-5 h-5 accent-[--brand-accent]" />
              </label>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button type="submit" className="kh-btn-scribble">{lang === 'ar' ? 'حفظ' : 'Save settings'}</button>
          {saved && <span className="text-sm text-[var(--brand-accent)]">{lang === 'ar' ? 'تم الحفظ ✓' : 'Saved ✓'}</span>}
        </div>
      </form>
    </div>
  );
}
