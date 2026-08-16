import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCart } from '@/lib/cart';
import { base44 } from '@/api/khClient';

export default function Checkout() {
  const { t, lang } = useI18n();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', phone: '', full_name: '', address: '', city: '', country: 'Lebanon', notes: '' });
  const [ack, setAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (items.length === 0 && !loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-20 text-center">
        <h1 className="font-heading text-4xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.cart.empty}</h1>
        <Link to="/shop" className="kh-btn-scribble mt-8">{t.cart.emptyCta}</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!ack) { setError(t.checkout.preorderAck); return; }
    setLoading(true);
    setError('');
    try {
      const orderNumber = 'KH-' + Date.now().toString().slice(-6);
      const order = await base44.entities.Order.create({
        order_number: orderNumber,
        email: form.email,
        phone: form.phone,
        full_name: form.full_name,
        shipping_address: form.address,
        city: form.city,
        country: form.country,
        notes: form.notes,
        items: items.map((i) => ({ productId: i.productId, productName: i.productName, phrase: i.phrase, productType: i.productType, color: i.color, size: i.size, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.unitPrice * i.quantity })),
        subtotal,
        shipping: 0,
        total: subtotal,
        status: 'order_received',
        internal_status: 'payment_pending',
        language: lang,
        is_guest: true,
      });
      clear();
      navigate(`/order/${order.id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12">
      <Link to="/cart" className="kh-btn-text !text-[12px] mb-6">← {t.checkout.back}</Link>
      <h1 className="font-heading text-4xl sm:text-6xl uppercase mb-8" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.checkout.title}</h1>
      <form onSubmit={submit} className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.checkout.contact}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t.checkout.email} required><input type="email" required value={form.email} onChange={set('email')} className="kh-input" /></Field>
              <Field label={t.checkout.phone} required><input type="tel" required value={form.phone} onChange={set('phone')} className="kh-input" /></Field>
            </div>
          </section>
          <section>
            <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.checkout.delivery}</h2>
            <div className="grid gap-4">
              <Field label={t.checkout.fullName} required><input required value={form.full_name} onChange={set('full_name')} className="kh-input" /></Field>
              <Field label={t.checkout.address} required><input required value={form.address} onChange={set('address')} className="kh-input" /></Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t.checkout.city} required><input required value={form.city} onChange={set('city')} className="kh-input" /></Field>
                <Field label={t.checkout.country} required><input required value={form.country} onChange={set('country')} className="kh-input" /></Field>
              </div>
              <Field label={t.checkout.notes}><textarea value={form.notes} onChange={set('notes')} rows={3} className="kh-input" /></Field>
            </div>
          </section>
          <section>
            <h2 className="font-heading text-xl uppercase mb-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.checkout.payment}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t.checkout.paymentNote}</p>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 w-5 h-5 accent-[--brand-accent]" />
              <span>{t.checkout.preorderAck}</span>
            </label>
          </section>
        </div>

        <aside className="bg-card border border-border rounded-md p-6 h-fit sticky top-24">
          <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.checkout.summary}</h2>
          <div className="divide-y divide-border">
            {items.map((i) => (
              <div key={i.key} className="py-3 flex justify-between gap-2 text-sm">
                <span className="min-w-0"><span className="block font-medium truncate">{i.productName}</span><span className="text-muted-foreground text-xs">{i.color} · {i.size} · ×{i.quantity}</span></span>
                <span className="shrink-0">${i.unitPrice * i.quantity}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between py-3 border-t border-border mt-2 font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)' }}><span>{t.cart.total}</span><span>${subtotal}</span></div>
          {error && <p className="text-destructive text-sm mt-3">{error}</p>}
          <button type="submit" disabled={loading || !ack} className="kh-btn-scribble w-full mt-4 !justify-center">
            {loading ? t.common.loading : t.checkout.placeOrder}
          </button>
        </aside>
      </form>
    </div>
  );
}

const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="kh-eyebrow block mb-1">{label}{required && ' *'}</span>
    {children}
  </label>
);
