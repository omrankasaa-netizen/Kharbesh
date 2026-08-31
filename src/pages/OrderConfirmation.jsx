import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/khClient';
import { Scribble } from '@/components/Brand';
import { useSiteSettings } from '@/lib/useCatalog.jsx';
import { useAuth } from '@/lib/AuthContext';

export default function OrderConfirmation() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Checkout stashes the order's email here so the confirmation page
        // can prove ownership — the server no longer serves order details
        // to a bare id.
        let contact;
        try {
          contact = sessionStorage.getItem(`kh_order_contact_${id}`) || undefined;
        } catch { /* storage unavailable — server will fall back to session */ }
        const o = await base44.entities.Order.get(id, contact);
        setOrder(o);
      } catch { setOrder(null); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="max-w-[800px] mx-auto px-6 py-20 text-muted-foreground">{t.common.loading}</div>;
  if (!order) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
        <p className="text-muted-foreground">We couldn't load this order's details here.</p>
        <p className="text-sm text-muted-foreground mt-2">Use your order number and email to check its status.</p>
        <Link to="/track" className="kh-btn-scribble mt-6 inline-block">{t.confirm.track}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-16">
      <div className="text-center">
        <span className="kh-eyebrow">{t.confirm.title}</span>
        <h1 className="mt-3 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.confirm.title}</h1>
        <Scribble className="mx-auto mt-6" width={120} />
      </div>
      <div className="mt-10 bg-card border border-border rounded-md p-6">
        <p className="text-sm text-muted-foreground">{t.confirm.sub} <span className="text-foreground font-medium">{order.email}</span>.</p>
        <div className="mt-4 flex justify-between items-center py-3 border-t border-border">
          <span className="kh-eyebrow">{t.confirm.number}</span>
          <span className="font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)' }}>{order.order_number}</span>
        </div>
        <div className="divide-y divide-border">
          {(order.items || []).map((it, idx) => (
            <div key={idx} className="py-3 flex justify-between text-sm">
              <span>{it.productName} · {it.color} · {it.size} · ×{it.quantity}</span>
              <span>${it.lineTotal}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between py-3 border-t border-border font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)' }}>
          <span>{t.cart.total}</span><span>${order.total}</span>
        </div>
      </div>

      {order.payment_method === 'whish' && (
        <div className="mt-8 rounded-md p-6" style={{ border: '1px solid var(--brand-accent)' }}>
          <h2 className="font-heading text-xl uppercase mb-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.confirm.whishTitle}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t.confirm.whishBody}</p>
          {settings?.payment.whishHandle && (
            <div>
              <span className="kh-eyebrow block mb-1">{t.checkout.whishHandleLabel}</span>
              <span className="font-heading text-2xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>{settings.payment.whishHandle}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-3">
            {settings?.payment[lang === 'ar' ? 'whishInstructionsAr' : 'whishInstructionsEn'] || t.checkout.whishInstructionsFallback}
          </p>
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-heading text-2xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.confirm.whatNext}</h2>
        <ol className="space-y-3">
          {[t.confirm.step1, t.confirm.step2, t.confirm.step3].map((s, i) => (
            <li key={i} className="flex gap-3"><span className="font-heading text-accent-foreground bg-accent w-7 h-7 inline-flex items-center justify-center rounded-full shrink-0" style={{ fontFamily: 'var(--brand-font-heading)' }}>{i + 1}</span><span className="pt-1">{s}</span></li>
          ))}
        </ol>
      </div>

      {!user && (
        <div className="mt-10 rounded-md p-6 text-center" style={{ border: '2px dashed var(--brand-accent)' }}>
          <span className="kh-eyebrow">{lang === 'ar' ? 'برنامج الولاء' : 'Loyalty program'}</span>
          <h2 className="mt-2 font-heading text-2xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>
            {lang === 'ar' ? 'صير خربوش' : 'Become a Kharboush'}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            {lang === 'ar'
              ? 'سجّل بكبسة واحدة بحساب Google وبلّش تجمع نقاط على كل طلب. الطلبات اللي عملتها بهالإيميل محسوبة إلك.'
              : 'One tap with Google and you start collecting points on every order. Orders you already placed with this email count too.'}
          </p>
          <a
            href="/api/auth/google/start?flow=customer&returnTo=/profile"
            className="kh-btn-scribble inline-block mt-5"
          >
            {lang === 'ar' ? 'سجّل بـ Google' : 'Sign up with Google'}
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            {lang === 'ar' ? 'اختياري — طلبك تمام من دون حساب.' : 'Optional — your order is fine without an account.'}
          </p>
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/track" className="kh-btn-scribble">{t.confirm.track}</Link>
        <Link to="/shop" className="kh-btn-outline">{t.confirm.continue}</Link>
      </div>
    </div>
  );
}
