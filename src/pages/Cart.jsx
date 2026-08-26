import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCart } from '@/lib/cart';
import { useColors, resolveColor, useSiteSettings } from '@/lib/useCatalog.jsx';
import GarmentMockup, { contrastInk } from '@/components/GarmentMockup';
import { whatsappLink } from '@/lib/whatsapp';
import { IconWhatsApp } from '@/components/Brand';

export default function Cart() {
  const { t, lang } = useI18n();
  const { items, updateQty, removeItem, subtotal, count } = useCart();
  const colors = useColors();
  const { settings } = useSiteSettings();

  if (items.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="font-heading text-4xl sm:text-6xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.cart.title}</h1>
        <p className="mt-4 text-muted-foreground">{t.cart.empty}</p>
        <Link to="/shop" className="kh-btn-scribble mt-8">{t.cart.emptyCta}</Link>
      </div>
    );
  }

  // Mirrors the server's computeShippingCents() so the cart shows the real
  // fee (flat $4 Lebanon-wide, free above the threshold) instead of a
  // placeholder "calculated at checkout" note.
  const shippingFeeCents = settings?.shippingFeeCents ?? 400;
  const freeShippingThresholdCents = settings?.freeShippingThresholdCents ?? 10000;
  const subtotalCents = Math.round(subtotal * 100);
  const shippingCents = subtotalCents >= freeShippingThresholdCents ? 0 : shippingFeeCents;
  const shipping = shippingCents / 100;
  const total = subtotal + shipping;

  const orderLines = items.map((item) => `${item.quantity}x ${item.productName} (${item.color}, ${item.size})`).join('\n');
  const whatsappOrderText = `${lang === 'ar' ? 'هاي، بدي اطلب هالليستة' : "Hi! I'd like to order"}:\n${orderLines}\n\n${lang === 'ar' ? 'المجموع' : 'Total'}: $${total.toFixed(2)}`;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-heading text-4xl sm:text-6xl uppercase mb-8" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.cart.title}</h1>
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 divide-y divide-border">
          {items.map((item) => {
            const color = resolveColor(item.color, colors);
            const hex = color?.hex || '#F0E9D6';
            const ink = contrastInk(hex);
            return (
              <div key={item.key} className="flex gap-4 py-6 first:pt-0">
                <div className="w-24 h-32 bg-card border border-border flex items-center justify-center rounded-sm shrink-0 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <GarmentMockup type={item.productType} color={hex} textColor={ink} phrase={item.phrase} className="w-[85%] h-[85%]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-lg uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{item.productName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{lang === 'ar' ? (color?.name_ar || item.color) : item.color} · {item.size}</p>
                  <p className="font-heading mt-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>${item.unitPrice} {t.product.perUnit}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center border border-border rounded-sm">
                      <button onClick={() => updateQty(item.key, item.quantity - 1)} className="w-9 h-9" aria-label="Decrease">−</button>
                      <span className="w-10 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateQty(item.key, item.quantity + 1)} className="w-9 h-9" aria-label="Increase">+</button>
                    </div>
                    <button onClick={() => removeItem(item.key)} className="kh-btn-text !text-[12px] text-destructive">{t.cart.remove}</button>
                  </div>
                </div>
                <div className="font-heading text-lg shrink-0" style={{ fontFamily: 'var(--brand-font-heading)' }}>${item.unitPrice * item.quantity}</div>
              </div>
            );
          })}
        </div>
        <aside className="bg-card border border-border rounded-md p-6 h-fit sticky top-24">
          <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.cart.title}</h2>
          <div className="flex justify-between py-2 text-sm"><span className="text-muted-foreground">{t.cart.subtotal} ({count} {count === 1 ? t.cart.item : t.cart.items})</span><span>${subtotal}</span></div>
          <div className="flex justify-between py-2 text-sm"><span className="text-muted-foreground">{t.cart.shipping}</span><span>{shippingCents === 0 ? t.cart.shippingFree : `$${shipping.toFixed(2)}`}</span></div>
          <div className="flex justify-between py-3 border-t border-border mt-2 font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)' }}><span>{t.cart.total}</span><span>${total.toFixed(2)}</span></div>
          <Link to="/checkout" className="kh-btn-scribble w-full mt-4 !justify-center">{t.cart.checkout}</Link>
          <a
            href={whatsappLink(settings?.contact?.whatsappNumber, whatsappOrderText)}
            target="_blank"
            rel="noreferrer"
            className="kh-btn-outline w-full mt-3 !justify-center flex items-center gap-2"
          >
            <IconWhatsApp size={18} />
            {t.cart.orderWhatsapp}
          </a>
          <Link to="/shop" className="kh-btn-text w-full mt-3 !justify-center">{t.cart.continue}</Link>
        </aside>
      </div>
    </div>
  );
}
