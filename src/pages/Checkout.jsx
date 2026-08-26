import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCart } from '@/lib/cart';
import { base44 } from '@/api/khClient';
import { useSiteSettings } from '@/lib/useCatalog.jsx';
import { trackPurchase } from '@/lib/analytics';

export default function Checkout() {
  const { t, lang } = useI18n();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [form, setForm] = useState({ email: '', phone: '', full_name: '', address: '', city: '', country: 'Lebanon', notes: '' });
  const [ack, setAck] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null); // { code, type, value, discount_cents, discount }
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState('');
  // Automatic (no-code) discounts apply silently server-side, same as at order
  // creation — fetched here so the total shown matches what actually gets
  // charged instead of only reflecting the promo code.
  const [autoDiscount, setAutoDiscount] = useState(null); // { automatic_discount, net_subtotal, applied_discounts }
  const [loyaltyPreview, setLoyaltyPreview] = useState(null); // { discountCents, discountPercent, freeShippingAvailable, tier }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const TIER_LABEL = {
    new_kharboush: { en: 'New Kharboush', ar: 'خربوش جديد' },
    kharboush_khebra: { en: 'Kharboush Khebra', ar: 'خربوش خبرة' },
    kharboush_aslee: { en: 'Kharboush Aslee', ar: 'خربوش أصلي' },
  };

  useEffect(() => {
    if (items.length === 0) { setAutoDiscount(null); return; }
    let cancelled = false;
    base44.entities.Promotions.previewCartDiscounts(
      items.map((i) => ({ productId: String(i.productId), quantity: i.quantity })),
    )
      .then((result) => { if (!cancelled) setAutoDiscount(result); })
      .catch(() => { if (!cancelled) setAutoDiscount(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map((i) => [i.productId, i.quantity]))]);

  const netSubtotal = autoDiscount ? autoDiscount.net_subtotal : subtotal;
  const autoDiscountAmount = autoDiscount?.automatic_discount || 0;
  const loyaltyDiscountAmount = (loyaltyPreview?.discountCents || 0) / 100;
  const netAfterLoyalty = Math.max(0, netSubtotal - loyaltyDiscountAmount);
  const discountAmount = promo?.discount || 0;
  const loyaltyFreeShipping = !!loyaltyPreview?.freeShippingAvailable;
  // Mirrors computeShippingCents() on the server: shipping is a flat fee on
  // the raw (pre-discount) subtotal, waived above the free-shipping
  // threshold or by a loyalty perk, then added on top of the discounted subtotal.
  const shippingFeeCents = settings?.shippingFeeCents ?? 400;
  const freeShippingThresholdCents = settings?.freeShippingThresholdCents ?? 10000;
  const shipping = (loyaltyFreeShipping || Math.round(subtotal * 100) >= freeShippingThresholdCents) ? 0 : shippingFeeCents / 100;
  const total = Math.max(0, netAfterLoyalty - discountAmount) + shipping;

  // Debounced loyalty preview — refetches whenever the email or the
  // post-automatic-discount subtotal changes. Read-only: no credits are
  // consumed and no tier progression happens until the order is placed.
  useEffect(() => {
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || netSubtotal <= 0) { setLoyaltyPreview(null); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      base44.entities.Loyalty.preview(email, netSubtotal)
        .then((result) => { if (!cancelled) setLoyaltyPreview(result); })
        .catch(() => { if (!cancelled) setLoyaltyPreview(null); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [form.email, netSubtotal]);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoApplying(true);
    setPromoError('');
    try {
      // Match server logic: promo codes apply on top of the already
      // automatic-discounted subtotal, not the raw cart subtotal.
      const result = await base44.entities.Promotions.previewCode(promoInput.trim(), netAfterLoyalty);
      setPromo(result);
    } catch (err) {
      setPromo(null);
      setPromoError(err?.message || (lang === 'ar' ? 'كود غير صالح' : 'Invalid code.'));
    } finally { setPromoApplying(false); }
  };

  const removePromo = () => { setPromo(null); setPromoInput(''); setPromoError(''); };

  const codEnabled = !settings || settings.payment.codEnabled;
  const whishEnabled = !!settings?.payment.whishEnabled;
  const noPaymentMethodAvailable = !settingsLoading && !codEnabled && !whishEnabled;

  useEffect(() => {
    // Once settings resolve, make sure the selected method is actually one
    // that's enabled — e.g. if COD got disabled after this page first
    // rendered with its default selection.
    if (settingsLoading) return;
    if (paymentMethod === 'cash_on_delivery' && !codEnabled && whishEnabled) setPaymentMethod('whish');
    else if (paymentMethod === 'whish' && !whishEnabled && codEnabled) setPaymentMethod('cash_on_delivery');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading, codEnabled, whishEnabled]);

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
        shipping,
        total,
        promo_code: promo?.code,
        status: 'order_received',
        internal_status: 'payment_pending',
        payment_method: paymentMethod,
        language: lang,
        is_guest: true,
      });
      trackPurchase({ orderId: order.id, value: total, currency: 'USD', items });
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

            {noPaymentMethodAvailable ? (
              <p className="text-destructive text-sm mb-4">{t.checkout.paymentUnavailable}</p>
            ) : (
              <div className="space-y-3 mb-4">
                {codEnabled && (
                  <PaymentOption
                    id="pm-cod"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onSelect={() => setPaymentMethod('cash_on_delivery')}
                    title={t.checkout.paymentMethodCod}
                    desc={t.checkout.paymentMethodCodDesc}
                  />
                )}
                {whishEnabled && (
                  <PaymentOption
                    id="pm-whish"
                    checked={paymentMethod === 'whish'}
                    onSelect={() => setPaymentMethod('whish')}
                    title={t.checkout.paymentMethodWhish}
                    desc={t.checkout.paymentMethodWhishDesc}
                  >
                    {paymentMethod === 'whish' && settings?.payment.whishHandle && (
                      <div className="mt-3 rounded-md border border-border bg-background px-4 py-3">
                        <span className="kh-eyebrow block mb-1">{t.checkout.whishHandleLabel}</span>
                        <span className="font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)' }}>{settings.payment.whishHandle}</span>
                        <p className="text-sm text-muted-foreground mt-2">
                          {settings.payment[lang === 'ar' ? 'whishInstructionsAr' : 'whishInstructionsEn'] || t.checkout.whishInstructionsFallback}
                        </p>
                      </div>
                    )}
                  </PaymentOption>
                )}
              </div>
            )}

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

          {autoDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-sm py-3 border-t border-border mt-2">
              <span>{t.checkout.autoDiscount}</span>
              <span style={{ color: 'var(--brand-accent)' }}>-${autoDiscountAmount.toFixed(2)}</span>
            </div>
          )}

          {loyaltyPreview && (loyaltyDiscountAmount > 0 || loyaltyFreeShipping) && (
            <div className="py-3 border-t border-border mt-2 text-sm space-y-1">
              <div className="kh-eyebrow" style={{ color: 'var(--brand-accent)' }}>
                {lang === 'ar' ? TIER_LABEL[loyaltyPreview.tier]?.ar : TIER_LABEL[loyaltyPreview.tier]?.en}
              </div>
              {loyaltyDiscountAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span>{lang === 'ar' ? `حسم الولاء ${loyaltyPreview.discountPercent}%` : `Loyalty discount (${loyaltyPreview.discountPercent}%)`}</span>
                  <span style={{ color: 'var(--brand-accent)' }}>-${loyaltyDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {loyaltyFreeShipping && (
                <div className="text-muted-foreground">{lang === 'ar' ? 'شحن مجاني من برنامج الولاء' : 'Free shipping from your loyalty tier'}</div>
              )}
            </div>
          )}

          <div className="py-3 border-t border-border mt-2">
            {promo ? (
              <div className="flex items-center justify-between text-sm">
                <span>{t.checkout.discount} <span className="font-medium">({promo.code})</span></span>
                <span className="flex items-center gap-2">
                  <span style={{ color: 'var(--brand-accent)' }}>-${discountAmount.toFixed(2)}</span>
                  <button type="button" onClick={removePromo} className="kh-btn-text !text-[11px]">×</button>
                </span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="kh-input flex-1"
                  placeholder={t.checkout.discount}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                />
                <button type="button" onClick={applyPromo} disabled={promoApplying || !promoInput.trim()} className="kh-btn-secondary !px-4 whitespace-nowrap">
                  {promoApplying ? '…' : t.checkout.apply}
                </button>
              </div>
            )}
            {promoError && <p className="text-destructive text-xs mt-2">{promoError}</p>}
          </div>

          <div className="flex justify-between text-sm py-3 border-t border-border mt-2">
            <span className="text-muted-foreground">{t.cart.shipping}</span>
            <span>{shipping === 0 ? t.cart.shippingFree : `$${shipping.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between py-3 border-t border-border mt-2 font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)' }}><span>{t.cart.total}</span><span>${total.toFixed(2)}</span></div>
          {error && <p className="text-destructive text-sm mt-3">{error}</p>}
          <button type="submit" disabled={loading || !ack || noPaymentMethodAvailable} className="kh-btn-scribble w-full mt-4 !justify-center">
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

const PaymentOption = ({ id, checked, onSelect, title, desc, children }) => (
  <div
    className="rounded-md border p-4 cursor-pointer transition-colors"
    style={{ borderColor: checked ? 'var(--brand-accent)' : 'var(--border)' }}
    onClick={onSelect}
  >
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
      <input id={id} type="radio" checked={checked} onChange={onSelect} className="mt-1 w-4 h-4 accent-[--brand-accent]" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{desc}</span>
      </span>
    </label>
    {children}
  </div>
);
