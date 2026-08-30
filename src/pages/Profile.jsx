import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/khClient';
import { useProducts } from '@/lib/useCatalog.jsx';
import { loadWishlist } from '@/lib/wishlist';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const TIER_LABEL = {
  new_kharboush: { en: 'New Kharboush', ar: 'خربوش جديد' },
  kharboush_khebra: { en: 'Kharboush Khebra', ar: 'خربوش خبرة' },
  kharboush_aslee: { en: 'Kharboush Aslee', ar: 'خربوش أصلي' },
};

export default function Profile() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { products } = useProducts();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loyalty, setLoyalty] = useState(null);
  const [wishlistIds] = useState(() => loadWishlist());
  const savedProducts = products.filter((p) => wishlistIds.includes(p.id));

  useEffect(() => {
    (async () => {
      if (!user?.email) { setLoading(false); return; }
      try {
        const list = await base44.entities.Order.filter({ email: user.email }, '-created_date', 50);
        setOrders(list || []);
      } catch { setOrders([]); }
      finally { setLoading(false); }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user?.email) return;
      try {
        setLoyalty(await base44.entities.Loyalty.myStatus(user.email));
      } catch { setLoyalty(null); }
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
        <p className="font-heading text-2xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'حسابي' : 'My profile'}</p>
        <p className="text-muted-foreground mt-2">{lang === 'ar' ? 'سجّل دخولك لتشوف طلباتك.' : 'Log in to see your orders.'}</p>
        <Link to="/login" className="kh-btn-text mt-4">{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow={lang === 'ar' ? 'حسابي' : 'Account'} title={lang === 'ar' ? 'ملفي الشخصي' : 'My profile'} />
      <div className="grid gap-6 md:grid-cols-3 mt-8">
        <section className="bg-card border border-border rounded-md p-5 md:col-span-1">
          <h2 className="font-heading text-lg uppercase mb-3" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'معلوماتي' : 'My info'}</h2>
          <dl className="text-sm space-y-3">
            <div><dt className="kh-eyebrow">Name</dt><dd className="mt-1">{user.full_name || '—'}</dd></div>
            <div><dt className="kh-eyebrow">Email</dt><dd className="mt-1">{user.email}</dd></div>
            <div><dt className="kh-eyebrow">Role</dt><dd className="mt-1">{user.role}</dd></div>
          </dl>
          {loyalty && (
            <div className="mt-5 pt-5 border-t border-border">
              <h3 className="kh-eyebrow mb-2">{lang === 'ar' ? 'مستواك في خربش' : 'Your Kharbesh tier'}</h3>
              <div className="font-heading text-lg uppercase" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-accent)' }}>
                {lang === 'ar' ? TIER_LABEL[loyalty.tier]?.ar : TIER_LABEL[loyalty.tier]?.en}
              </div>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>{lang === 'ar' ? `حسم دائم ${loyalty.discountPercent}%` : `${loyalty.discountPercent}% off every order`}</li>
                <li>
                  {loyalty.alwaysFreeShipping
                    ? (lang === 'ar' ? 'شحن مجاني دائم' : 'Always free shipping')
                    : (lang === 'ar' ? `${loyalty.freeShippingCreditsRemaining} شحنة مجانية متبقية` : `${loyalty.freeShippingCreditsRemaining} free shipping credit${loyalty.freeShippingCreditsRemaining === 1 ? '' : 's'} left`)}
                </li>
              </ul>
            </div>
          )}
        </section>
        <section className="md:col-span-2">
          <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'طلباتي' : 'Order history'}</h2>
          {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : orders.length === 0 ? (
            <div className="bg-card border border-border rounded-md p-6 text-muted-foreground">{lang === 'ar' ? 'ما في طلبات لسه. ' : 'No orders yet. '}<Link to="/shop" className="kh-btn-text">{t.nav.shop}</Link></div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-md">
              {orders.map((o) => (
                <li key={o.id} className="p-4 flex flex-wrap justify-between gap-2">
                  <div><div className="font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>{o.order_number}</div><div className="text-xs text-muted-foreground">{new Date(o.created_date).toLocaleDateString()}</div></div>
                  <div className="text-right"><div>${o.total}</div><div className="text-xs text-muted-foreground">{o.status.replace(/_/g,' ')}</div></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {savedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>
            {lang === 'ar' ? 'المفضلة' : 'Saved for later'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {savedProducts.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="bg-card border border-border rounded-md overflow-hidden group">
                <div className="aspect-square bg-muted overflow-hidden">
                  {p.images?.[0] && (
                    <img
                      src={p.images[0]}
                      alt={lang === 'ar' ? (p.name_ar || p.name_en) : p.name_en}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{lang === 'ar' ? (p.name_ar || p.name_en) : p.name_en}</p>
                  <p className="text-xs text-muted-foreground mt-1">${p.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
