import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/khClient';

const STATUS_LABEL = {
  order_received: { en: 'Order received', ar: 'وصلنا الطلب' },
  preorder_confirmed: { en: 'Preorder confirmed', ar: 'الطلب مؤكد' },
  in_production: { en: 'In production', ar: 'قيد الإنتاج' },
  being_printed: { en: 'Being printed', ar: 'قيد الطباعة' },
  preparing_shipment: { en: 'Preparing shipment', ar: 'تحضير الشحن' },
  on_the_way: { en: 'On the way', ar: 'على الطريق' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  needs_attention: { en: 'Needs attention', ar: 'بحاجة انتباه' },
};

const FLOW = ['order_received', 'preorder_confirmed', 'in_production', 'being_printed', 'preparing_shipment', 'on_the_way', 'delivered'];

export default function TrackOrder() {
  const { t, lang } = useI18n();
  const [orderNumber, setOrderNumber] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const find = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const list = await base44.entities.Order.filter({ order_number: orderNumber.trim(), contact: emailOrPhone.trim() });
      const match = (list || [])[0];
      if (!match) setError(t.track.notFound);
      else setOrder(match);
    } catch {
      setError(t.track.notFound);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-16">
      <span className="kh-eyebrow">{t.track.title}</span>
      <h1 className="mt-2 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.track.title}</h1>
      <p className="mt-4 text-muted-foreground">{t.track.sub}</p>
      <form onSubmit={find} className="mt-8 grid sm:grid-cols-2 gap-4">
        <label className="block"><span className="kh-eyebrow block mb-1">{t.track.orderNumber}</span><input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="kh-input" placeholder="KH-123456" /></label>
        <label className="block"><span className="kh-eyebrow block mb-1">{t.track.emailOrPhone}</span><input required value={emailOrPhone} onChange={(e) => setEmailOrPhone(e.target.value)} className="kh-input" /></label>
        <button type="submit" disabled={loading} className="kh-btn-scribble sm:col-span-2 !justify-center">{loading ? t.common.loading : t.track.find}</button>
      </form>

      {error && <p className="mt-6 text-destructive text-sm">{error}</p>}

      {order && (
        <div className="mt-10 border border-border rounded-md p-6">
          <div className="flex justify-between mb-6">
            <span className="kh-eyebrow">{t.confirm.number}</span>
            <span className="font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>{order.order_number}</span>
          </div>
          <ol className="space-y-4">
            {FLOW.map((s, i) => {
              const done = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <li key={s} className="flex gap-3 items-start">
                  <span className={`w-7 h-7 inline-flex items-center justify-center rounded-full shrink-0 font-heading text-xs ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} style={{ fontFamily: 'var(--brand-font-heading)' }}>{i + 1}</span>
                  <div className="pt-1">
                    <span className={`block ${isCurrent ? 'font-bold' : done ? '' : 'text-muted-foreground'}`}>{STATUS_LABEL[s][lang]}</span>
                    {isCurrent && order.status === 'needs_attention' && <span className="text-destructive text-sm">— {STATUS_LABEL.needs_attention[lang]}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
