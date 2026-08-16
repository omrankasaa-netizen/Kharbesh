import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { base44 } from '@/api/khClient';
import { useProducts } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const { products } = useProducts();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Order.list('-created_date', 100);
        setOrders(list || []);
      } catch { setOrders([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const totalOrders = orders.length;
  const pending = orders.filter((o) => o.internal_status === 'payment_pending' || o.status === 'order_received' || o.status === 'preorder_confirmed');
  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const recent = orders.slice(0, 6);
  const lowStock = products.filter((p) => p.preorder_capacity && (p.units_sold || 0) >= p.preorder_capacity * 0.8).slice(0, 5);

  const stats = [
    { label: lang === 'ar' ? 'إجمالي الطلبات' : 'Total orders', value: totalOrders, to: '/admin/orders' },
    { label: lang === 'ar' ? 'طلبات قيد الانتظار' : 'Pending preorders', value: pending.length, to: '/admin/orders' },
    { label: lang === 'ar' ? 'الإيرادات' : 'Revenue', value: `$${revenue.toLocaleString()}`, to: '/admin/orders' },
    { label: lang === 'ar' ? 'منتجات نشطة' : 'Active products', value: products.length, to: '/admin/inventory' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'} />
      {loading ? <div className="text-muted-foreground mt-8">{t.common.loading}</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8">
            {stats.map((s) => (
              <Link to={s.to} key={s.label} className="bg-card border border-border rounded-md p-5 hover:border-[var(--brand-accent)] transition-colors">
                <div className="kh-eyebrow">{s.label}</div>
                <div className="mt-2 font-heading text-3xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>{s.value}</div>
              </Link>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2 mt-8">
            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'أحدث الطلبات' : 'Recent orders'}</h2>
              <ul className="divide-y divide-border">
                {recent.map((o) => (
                  <li key={o.id} className="py-3 flex justify-between text-sm">
                    <span>{o.order_number} · {o.full_name}</span>
                    <span className="text-muted-foreground">${o.total}</span>
                  </li>
                ))}
                {recent.length === 0 && <li className="text-muted-foreground py-3">No orders yet.</li>}
              </ul>
            </section>
            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'مخزون منخفض' : 'Near capacity'}</h2>
              <ul className="divide-y divide-border">
                {lowStock.map((p) => (
                  <li key={p.id} className="py-3 flex justify-between text-sm">
                    <span>{p.name_en}</span>
                    <span className="text-muted-foreground">{p.units_sold}/{p.preorder_capacity}</span>
                  </li>
                ))}
                {lowStock.length === 0 && <li className="text-muted-foreground py-3">All good.</li>}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
