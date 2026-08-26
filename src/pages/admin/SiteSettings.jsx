import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/khClient';
import { useSiteSettings } from '@/lib/useCatalog.jsx';
import ColorManager from '@/components/ColorManager';
import StyleManager from '@/components/StyleManager';

export default function SiteSettings() {
  const { lang } = useI18n();
  // Shared context already fetched settings once for the whole app (banner,
  // maintenance gate, checkout). Reuse that instead of a second fetch, and
  // call its `refreshSettings` after saving so every other open tab/page
  // picks up the change without a full reload.
  const { settings, loading: initialLoading, refreshSettings } = useSiteSettings();
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings && !s) setS(settings);
  }, [settings, s]);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setS((p) => ({ ...p, [k]: val }));
    setSaved(false);
  };

  const setPayment = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setS((p) => ({ ...p, payment: { ...p.payment, [k]: val } }));
    setSaved(false);
  };

  const setContact = (k) => (e) => {
    setS((p) => ({ ...p, contact: { ...p.contact, [k]: e.target.value } }));
    setSaved(false);
  };

  // Shipping fields are stored in cents server-side but edited in dollars here.
  const setShippingDollars = (k) => (e) => {
    const dollars = parseFloat(e.target.value);
    setS((p) => ({ ...p, [k]: Number.isFinite(dollars) ? Math.round(dollars * 100) : 0 }));
    setSaved(false);
  };

  const setLoyalty = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setS((p) => ({ ...p, loyalty: { ...p.loyalty, [k]: val } }));
    setSaved(false);
  };

  // Loyalty thresholds are cents server-side, dollars here.
  const setLoyaltyDollars = (k) => (e) => {
    const dollars = parseFloat(e.target.value);
    setS((p) => ({ ...p, loyalty: { ...p.loyalty, [k]: Number.isFinite(dollars) ? Math.round(dollars * 100) : 0 } }));
    setSaved(false);
  };

  const setLoyaltyNumber = (k) => (e) => {
    const n = parseFloat(e.target.value);
    setS((p) => ({ ...p, loyalty: { ...p.loyalty, [k]: Number.isFinite(n) ? n : 0 } }));
    setSaved(false);
  };

  const noPaymentMethodSelected = !!s && !s.payment.codEnabled && !s.payment.whishEnabled;
  const whishMissingHandle = !!s && s.payment.whishEnabled && !s.payment.whishHandle.trim();
  const asleeThresholdTooLow = !!s && s.loyalty && s.loyalty.asleeThresholdCents <= s.loyalty.khebraThresholdCents;

  const save = async (e) => {
    e.preventDefault();
    if (noPaymentMethodSelected) { setError(lang === 'ar' ? 'خلّي طريقة دفع واحدة مفعّلة على الأقل.' : 'Keep at least one payment method enabled.'); return; }
    if (whishMissingHandle) { setError(lang === 'ar' ? 'ضيف رقم Whish قبل تفعيله.' : 'Add a Whish number before enabling it.'); return; }
    if (asleeThresholdTooLow) { setError(lang === 'ar' ? 'حد Kharboush Aslee لازم يكون أعلى من حد Kharboush Khebra.' : "Kharboush Aslee's threshold must be higher than Kharboush Khebra's."); return; }
    setSaving(true);
    setError('');
    try {
      await base44.entities.Settings.update(s);
      await refreshSettings();
      setSaved(true);
    } catch (err) {
      setError(err?.message || (lang === 'ar' ? 'ما قدرنا نحفظ. جرّب كمان مرة.' : 'Could not save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const toggles = [
    { key: 'bannerEnabled', label_en: 'Announcement banner', label_ar: 'شريط الإعلان' },
    { key: 'preordersEnabled', label_en: 'Preorders', label_ar: 'الطلبات المسبقة' },
    { key: 'customRequestsEnabled', label_en: 'Custom design requests', label_ar: 'طلبات التصميم' },
    { key: 'guestCheckoutEnabled', label_en: 'Guest checkout', label_ar: 'دفع كضيف' },
    { key: 'maintenance', label_en: 'Maintenance mode', label_ar: 'صيانة' },
  ];

  if (initialLoading || !s) {
    return (
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
        <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'إعدادات المتجر' : 'Site settings'} />
        <p className="text-muted-foreground mt-8">{lang === 'ar' ? 'جاري التحميل…' : 'Loading…'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'إعدادات المتجر' : 'Site settings'} />
      <form onSubmit={save} className="mt-8 space-y-8">
        <section className="bg-card border border-border rounded-md p-6 space-y-4">
          <h2 className="font-heading text-xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'معلومات المتجر' : 'Store info'}</h2>
          <label className="block"><span className="kh-eyebrow block mb-1">Store name</span><input value={s.storeName} onChange={set('storeName')} className="kh-input" /></label>
          <label className="block"><span className="kh-eyebrow block mb-1">Tagline (EN)</span><input value={s.taglineEn} onChange={set('taglineEn')} className="kh-input" /></label>
          <label className="block"><span className="kh-eyebrow block mb-1">Tagline (AR)</span><input value={s.taglineAr} onChange={set('taglineAr')} className="kh-input" dir="rtl" /></label>
        </section>

        <section className="bg-card border border-border rounded-md p-6 space-y-4">
          <h2 className="font-heading text-xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'شريط الإعلان' : 'Announcement banner'}</h2>
          <label className="block"><span className="kh-eyebrow block mb-1">Banner text (EN)</span><input value={s.bannerEn} onChange={set('bannerEn')} className="kh-input" placeholder="New drop live — 3A ZAW2AK" /></label>
          <label className="block"><span className="kh-eyebrow block mb-1">Banner text (AR)</span><input value={s.bannerAr} onChange={set('bannerAr')} className="kh-input" dir="rtl" placeholder="دروب جديد — على ذوقك" /></label>
        </section>

        <section className="bg-card border border-border rounded-md p-6">
          <h2 className="font-heading text-xl uppercase mb-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'طرق الدفع' : 'Payment methods'}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {lang === 'ar' ? 'حدّد شو بتقدر تدفع عبره على الموقع. لازم طريقة واحدة مفعّلة على الأقل.' : 'Control what customers can pay with at checkout. At least one method must stay enabled.'}
          </p>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer py-2 border-b border-border">
              <span>{lang === 'ar' ? 'الدفع عند التسليم' : 'Cash on delivery'}</span>
              <input type="checkbox" checked={s.payment.codEnabled} onChange={setPayment('codEnabled')} className="w-5 h-5 accent-[--brand-accent]" />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer py-2 border-b border-border">
              <span>Whish Money</span>
              <input type="checkbox" checked={s.payment.whishEnabled} onChange={setPayment('whishEnabled')} className="w-5 h-5 accent-[--brand-accent]" />
            </label>

            {s.payment.whishEnabled && (
              <div className="pl-1 space-y-4 border-l-2 pl-4" style={{ borderColor: 'var(--brand-accent)' }}>
                <label className="block">
                  <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'رقم Whish' : 'Whish number / handle'}</span>
                  <input
                    value={s.payment.whishHandle}
                    onChange={setPayment('whishHandle')}
                    className="kh-input"
                    placeholder="+961 XX XXX XXX"
                  />
                </label>
                <label className="block">
                  <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'تعليمات Whish (EN)' : 'Whish instructions (EN)'}</span>
                  <textarea value={s.payment.whishInstructionsEn} onChange={setPayment('whishInstructionsEn')} rows={3} className="kh-input" placeholder="Send the total to the number above, then place your order." />
                </label>
                <label className="block">
                  <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'تعليمات Whish (AR)' : 'Whish instructions (AR)'}</span>
                  <textarea value={s.payment.whishInstructionsAr} onChange={setPayment('whishInstructionsAr')} rows={3} className="kh-input" dir="rtl" placeholder="حوّل المجموع على الرقم فوق، وبعدين أكّد الطلب." />
                </label>
              </div>
            )}

            {noPaymentMethodSelected && (
              <p className="text-destructive text-sm">{lang === 'ar' ? 'خلّي طريقة دفع واحدة مفعّلة على الأقل.' : 'Keep at least one payment method enabled.'}</p>
            )}
          </div>
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
          <p className="text-xs text-muted-foreground mt-3">
            {lang === 'ar'
              ? 'ملاحظة: "الطلبات المسبقة" و"دفع كضيف" محفوظين هون بس مش مفعّلين تقنياً بعد بباقي الموقع.'
              : 'Note: "Preorders" and "Guest checkout" are saved here but not yet enforced elsewhere on the site.'}
          </p>
        </section>

        <section className="bg-card border border-border rounded-md p-6 space-y-4">
          <h2 className="font-heading text-xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'الشحن' : 'Shipping'}</h2>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar' ? 'رسم شحن ثابت لكل لبنان، مع خيار شحن مجاني فوق حد معين.' : 'A flat fee applied Lebanon-wide, waived automatically above a free-shipping threshold.'}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'رسم الشحن ($)' : 'Shipping fee ($)'}</span>
              <input type="number" min="0" step="0.5" value={(s.shippingFeeCents / 100).toFixed(2)} onChange={setShippingDollars('shippingFeeCents')} className="kh-input" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'الشحن المجاني فوق ($)' : 'Free shipping above ($)'}</span>
              <input type="number" min="0" step="1" value={(s.freeShippingThresholdCents / 100).toFixed(2)} onChange={setShippingDollars('freeShippingThresholdCents')} className="kh-input" />
            </label>
          </div>
        </section>

        <section className="bg-card border border-border rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'برنامج الولاء' : 'Loyalty'}</h2>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!s.loyalty?.enabled} onChange={setLoyalty('enabled')} />
              <span className="text-sm">{lang === 'ar' ? 'مفعّل' : 'Enabled'}</span>
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar'
              ? 'New Kharboush يبلش عند التسجيل أو أول طلب. الترقية لـ Khebra وAslee بتصير أوتوماتيك حسب إجمالي الصرف — ما بترجع لورا.'
              : 'New Kharboush starts at registration or first checkout. Upgrades to Khebra and Aslee happen automatically based on lifetime spend — tiers never downgrade.'}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'New Kharboush — حسم %' : 'New Kharboush — discount %'}</span>
              <input type="number" min="0" max="100" step="0.5" value={s.loyalty?.newKharboushDiscountPercent ?? 0} onChange={setLoyaltyNumber('newKharboushDiscountPercent')} className="kh-input" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'New Kharboush — عدد شحنات مجانية' : 'New Kharboush — free shipping credits'}</span>
              <input type="number" min="0" step="1" value={s.loyalty?.newKharboushFreeShippingCredits ?? 0} onChange={setLoyaltyNumber('newKharboushFreeShippingCredits')} className="kh-input" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'حد Kharboush Khebra — إجمالي صرف ($)' : 'Kharboush Khebra threshold — lifetime spend ($)'}</span>
              <input type="number" min="0" step="10" value={((s.loyalty?.khebraThresholdCents ?? 0) / 100).toFixed(2)} onChange={setLoyaltyDollars('khebraThresholdCents')} className="kh-input" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'Kharboush Khebra — حسم %' : 'Kharboush Khebra — discount %'}</span>
              <input type="number" min="0" max="100" step="0.5" value={s.loyalty?.khebraDiscountPercent ?? 0} onChange={setLoyaltyNumber('khebraDiscountPercent')} className="kh-input" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'Kharboush Khebra — عدد شحنات مجانية' : 'Kharboush Khebra — free shipping credits'}</span>
              <input type="number" min="0" step="1" value={s.loyalty?.khebraFreeShippingCredits ?? 0} onChange={setLoyaltyNumber('khebraFreeShippingCredits')} className="kh-input" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'حد Kharboush Aslee — إجمالي صرف ($)' : 'Kharboush Aslee threshold — lifetime spend ($)'}</span>
              <input type="number" min="0" step="10" value={((s.loyalty?.asleeThresholdCents ?? 0) / 100).toFixed(2)} onChange={setLoyaltyDollars('asleeThresholdCents')} className="kh-input" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'Kharboush Aslee — حسم % (دائم)' : 'Kharboush Aslee — discount % (permanent)'}</span>
              <input type="number" min="0" max="100" step="0.5" value={s.loyalty?.asleeDiscountPercent ?? 0} onChange={setLoyaltyNumber('asleeDiscountPercent')} className="kh-input" />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === 'ar' ? 'Kharboush Aslee دايماً شحن مجاني، ما بيصرف رصيد.' : 'Kharboush Aslee always ships free — it doesn’t consume a credit.'}
          </p>
          {asleeThresholdTooLow && (
            <p className="text-sm" style={{ color: 'var(--brand-destructive)' }}>
              {lang === 'ar' ? 'حد Aslee لازم يكون أعلى من حد Khebra.' : "Aslee's threshold must be higher than Khebra's."}
            </p>
          )}
        </section>

        <section className="bg-card border border-border rounded-md p-6 space-y-4">
          <h2 className="font-heading text-xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'التواصل والمواقع الاجتماعية' : 'Contact & Social'}</h2>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar' ? 'هالمعلومات بتطلع بالفوتر، زر واتساب الطافي، وصفحة التواصل.' : 'Used in the footer, the floating WhatsApp button, and the Contact page.'}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="kh-eyebrow block mb-1">WhatsApp number</span>
              <input value={s.contact?.whatsappNumber || ''} onChange={setContact('whatsappNumber')} className="kh-input" placeholder="96176465367" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">Instagram handle</span>
              <input value={s.contact?.instagramHandle || ''} onChange={setContact('instagramHandle')} className="kh-input" placeholder="kharbeshh" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">Facebook handle</span>
              <input value={s.contact?.facebookHandle || ''} onChange={setContact('facebookHandle')} className="kh-input" placeholder="Kharbeshh" />
            </label>
            <label className="block">
              <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'البريد' : 'Email'}</span>
              <input type="email" value={s.contact?.email || ''} onChange={setContact('email')} className="kh-input" placeholder="hello@kharbesh961.com" />
            </label>
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="kh-btn-scribble">{saving ? (lang === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (lang === 'ar' ? 'حفظ' : 'Save settings')}</button>
          {saved && <span className="text-sm" style={{ color: 'var(--brand-accent)' }}>{lang === 'ar' ? 'تم الحفظ ✓' : 'Saved ✓'}</span>}
          {error && <span className="text-destructive text-sm">{error}</span>}
        </div>
      </form>

      <ColorManager lang={lang} />
      <StyleManager lang={lang} />
    </div>
  );
}
