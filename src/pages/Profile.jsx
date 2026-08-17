import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function Profile() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
