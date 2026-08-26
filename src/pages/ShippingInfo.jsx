import React from 'react';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { useSiteSettings } from '@/lib/useCatalog.jsx';

export default function ShippingInfo() {
  const { lang } = useI18n();
  const { settings } = useSiteSettings();
  const feeDollars = ((settings?.shippingFeeCents ?? 400) / 100).toFixed(0);
  const thresholdDollars = ((settings?.freeShippingThresholdCents ?? 10000) / 100).toFixed(0);
  const feeNote = lang === 'ar'
    ? `الشحن ثابت ${feeDollars}$ لكل لبنان، ومجاني فوق ${thresholdDollars}$.`
    : `Shipping is a flat $${feeDollars} anywhere in Lebanon, free on orders over $${thresholdDollars}.`;
  const zones = lang === 'ar' ? [
    { z: 'بيروت', t: '1–2 يوم عمل' },
    { z: 'جبل لبنان', t: '2–3 أيام عمل' },
    { z: 'الشمال', t: '3–4 أيام عمل' },
    { z: 'الجنوب', t: '3–4 أيام عمل' },
    { z: 'البقاع', t: '3–5 أيام عمل' },
  ] : [
    { z: 'Beirut', t: '1–2 business days' },
    { z: 'Mount Lebanon', t: '2–3 business days' },
    { z: 'North', t: '3–4 business days' },
    { z: 'South', t: '3–4 business days' },
    { z: 'Bekaa', t: '3–5 business days' },
  ];
  const notes = lang === 'ar' ? [
    'التصاميم الجاهزة بتنرسل خلال 1–3 أيام من الطلب.',
    'التصاميم المسبقة (preorder) بتنرسل بعد ما ينتهي الإنتاج — شوف صفحة خط الإنتاج.',
    'الطلبات خارج لبنان حالياً غير متوفرة. لبنان أولاً، العالم بعدين.',
  ] : [
    'Ready-to-wear pieces ship within 1–3 days of ordering.',
    'Preorders ship after production finishes — see the Production timeline page.',
    'Shipping outside Lebanon isn’t available yet. Lebanon first, the world later.',
  ];
  notes.unshift(feeNote);
  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Shipping" title={lang === 'ar' ? 'معلومات الشحن' : 'Shipping info'} sub={lang === 'ar' ? 'وين نوصل، ويمتى.' : 'Where we deliver, and when.'} />
      <h2 className="font-heading text-xl uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'مناطق التوصيل' : 'Delivery zones'}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {zones.map((z) => (
          <div key={z.z} className="bg-card border border-border rounded-md p-5 flex justify-between items-center">
            <span className="font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)' }}>{z.z}</span>
            <span className="text-muted-foreground text-sm">{z.t}</span>
          </div>
        ))}
      </div>
      <h2 className="font-heading text-xl uppercase mt-12 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'ملاحظات' : 'Good to know'}</h2>
      <ul className="space-y-3">
        {notes.map((n, i) => (
          <li key={i} className="flex gap-3 text-muted-foreground"><span className="text-[var(--brand-accent)]">•</span><span>{n}</span></li>
        ))}
      </ul>
    </div>
  );
}
