import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/khClient';
import PhoneInput from '@/components/PhoneInput';
import { toE164, getCountry, validatePhone } from '@/lib/phoneCountries';

const STATUS_LABEL = {
  order_received: { en: 'Order received', ar: 'وصلنا الطلب' },
  preorder_confirmed: { en: 'Preorder confirmed', ar: 'الطلب مؤكد' },
  in_production: { en: 'In production', ar: 'قيد الإنتاج' },
  being_printed: { en: 'Being printed', ar: 'قيد الطباعة' },
  preparing_shipment: { en: 'Preparing shipment', ar: 'تحضير الشحن' },
  on_the_way: { en: 'On the way', ar: 'على الطريق' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  needs_attention: { en: 'Needs attention', ar: 'بحاجة انتباه' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
};

const FLOW = ['order_received', 'preorder_confirmed', 'in_production', 'being_printed', 'preparing_shipment', 'on_the_way', 'delivered'];

export default function TrackOrder() {
  const { t, lang } = useI18n();
  const [orderNumber, setOrderNumber] = useState('');
  // Contact can be an email or a phone; phones go through the same
  // country-picker + E.164 normalization used at checkout so they match
  // how orders now store the number.
  const [contactType, setContactType] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState({ iso: 'LB', national: '' });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneDial = getCountry(phone.iso).dial;
  const phoneInvalid = contactType === 'phone' && !!validatePhone(phone.iso, phoneDial, phone.national, lang);
  const showPhoneError = phoneTouched && phoneInvalid;

  const find = async (e) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    if (contactType === 'phone' && phoneInvalid) {
      setPhoneTouched(true);
      setError(t.checkout.phoneInvalid);
      return;
    }
    const contact = contactType === 'phone' ? toE164(phoneDial, phone.national) : email.trim();
    setLoading(true);
    try {
      const list = await base44.entities.Order.filter({ order_number: orderNumber.trim(), contact });
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
  // Statuses outside the happy-path flow (needs_attention, cancelled, or any
  // future unmapped status) have no step — indexOf returns -1, which used to
  // break the indicator. Give them a neutral, all-unreached progress state
  // plus an explicit bilingual note instead.
  const statusKnown = order ? currentStep >= 0 : true;
  const statusNote = !order || statusKnown
    ? null
    : order.status === 'needs_attention'
      ? t.track.reviewing
      : order.status === 'cancelled'
        ? t.track.cancelled
        : t.track.unknownStatus;

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-16">
      <span className="kh-eyebrow">{t.track.title}</span>
      <h1 className="mt-2 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.track.title}</h1>
      <p className="mt-4 text-muted-foreground">{t.track.sub}</p>
      <form onSubmit={find} className="mt-8 grid sm:grid-cols-2 gap-4">
        <label className="block"><span className="kh-eyebrow block mb-1">{t.track.orderNumber}</span><input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="kh-input" placeholder="KH-123456" /></label>
        <div className="block">
          <span className="kh-eyebrow block mb-1">{t.track.emailOrPhone}</span>
          <div className="flex gap-2 mb-2" role="tablist">
            {['email', 'phone'].map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={contactType === type}
                onClick={() => { setContactType(type); setError(''); }}
                className="kh-btn-text !text-[12px]"
                style={contactType === type ? { color: 'var(--brand-accent)' } : undefined}
              >
                {type === 'email' ? t.checkout.email : t.checkout.phone}
              </button>
            ))}
          </div>
          {contactType === 'email' ? (
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="kh-input" />
          ) : (
            <>
              <PhoneInput value={phone} onChange={setPhone} onBlur={() => setPhoneTouched(true)} required invalid={showPhoneError} />
              {showPhoneError && <p className="text-destructive text-xs mt-1">{t.checkout.phoneInvalid}</p>}
            </>
          )}
        </div>
        <button type="submit" disabled={loading} className="kh-btn-scribble sm:col-span-2 !justify-center">{loading ? t.common.loading : t.track.find}</button>
      </form>

      {error && <p className="mt-6 text-destructive text-sm">{error}</p>}

      {order && (
        <div className="mt-10 border border-border rounded-md p-6">
          <div className="flex justify-between mb-6">
            <span className="kh-eyebrow">{t.confirm.number}</span>
            <span className="font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>{order.order_number}</span>
          </div>
          {!statusKnown && (
            <div className="mb-6 flex flex-wrap items-center gap-3 bg-muted px-4 py-3 rounded-sm" role="status">
              <span className="kh-eyebrow !text-[10px]">{STATUS_LABEL[order.status]?.[lang] ?? order.status}</span>
              <span className="text-sm">{statusNote}</span>
            </div>
          )}
          <ol className="space-y-4">
            {FLOW.map((s, i) => {
              const done = statusKnown && i <= currentStep;
              const isCurrent = statusKnown && i === currentStep;
              return (
                <li key={s} className="flex gap-3 items-start">
                  <span className={`w-7 h-7 inline-flex items-center justify-center rounded-full shrink-0 font-heading text-xs ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} style={{ fontFamily: 'var(--brand-font-heading)' }}>{i + 1}</span>
                  <div className="pt-1">
                    <span className={`block ${isCurrent ? 'font-bold' : done ? '' : 'text-muted-foreground'}`}>{STATUS_LABEL[s][lang]}</span>
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
