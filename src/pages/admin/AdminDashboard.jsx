import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { base44, hasRole } from '@/api/khClient';
import { useAuth } from '@/lib/AuthContext';
import { useProducts } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { products } = useProducts();
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [factoryOrders, setFactoryOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = hasRole(user, 'super_admin');

  useEffect(() => {
    (async () => {
      try {
        const calls = [
          base44.entities.Order.list(),
          base44.entities.BlankStock.list(),
          base44.entities.FactoryOrder.list(),
        ];
        if (isSuperAdmin) calls.push(base44.entities.Financials.getSummary());
        const results = await Promise.all(calls);
        setOrders(results[0] || []);
        setStock(results[1] || []);
        setFactoryOrders(results[2] || []);
        if (isSuperAdmin) setSummary(results[3]);
      } catch {
        setOrders([]); setStock([]); setFactoryOrders([]);
      } finally { setLoading(false); }
    })();
  }, [isSuperAdmin]);

  const totalOrders = orders.length;
  const pending = orders.filter((o) => o.status === 'order_received' || o.status === 'preorder_confirmed' || o.status === 'in_production');
  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const recent = orders.slice(0, 6);
  const lowStock = stock.filter((s) => s.is_low);
  const openFactoryJobs = factoryOrders.filter((f) => ['draft', 'sent'].includes(f.status));

  const stats = [
    { label: lang === 'ar' ? 'إجمالي الطلبات' : 'Total orders', value: totalOrders, to: '/admin/orders' },
    { label: lang === 'ar' ? 'قيد الإنتاج' : 'In progress', value: pending.length, to: '/admin/orders' },
    { label: lang === 'ar' ? 'الإيرادات' : 'Revenue', value: `$${revenue.toLocaleString()}`, to: '/admin/orders' },
    { label: lang === 'ar' ? 'منتجات' : 'Products', value: products.length, to: '/admin/products' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'} />
      {loading ? <div className="text-muted-foreground mt-8">{t.common.loading}</div> : (
        <>
          {lowStock.length > 0 && (
            <Link to="/admin/inventory" className="block mt-6 border rounded-md px-4 py-3 text-sm hover:opacity-90 transition-opacity" style={{ borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)', background: 'color-mix(in srgb, var(--brand-accent) 8%, transparent)' }}>
              {lang === 'ar' ? `تنبيه: ${lowStock.length} متغيّر وصل لحد إعادة التعبئة — راجع المخزون` : `Low stock: ${lowStock.length} variant${lowStock.length > 1 ? 's' : ''} need restocking — review Inventory.`}
            </Link>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
            {stats.map((s) => (
              <Link to={s.to} key={s.label} className="bg-card border border-border rounded-md p-5 hover:border-[var(--brand-accent)] transition-colors">
                <div className="kh-eyebrow">{s.label}</div>
                <div className="mt-2 font-heading text-3xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>{s.value}</div>
              </Link>
            ))}
          </div>

          {isSuperAdmin && summary && (
            <>
              <h2 className="font-heading text-lg uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'لمحة مالية' : 'Financial snapshot'}</h2>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  [lang === 'ar' ? 'الإيرادات' : 'Revenue', `$${summary.revenue.toFixed(2)}`],
                  [lang === 'ar' ? 'كلفة البضاعة' : 'COGS', `$${summary.cogs.toFixed(2)}`],
                  [lang === 'ar' ? 'مصاريف' : 'Overhead', `$${summary.overhead.toFixed(2)}`],
                  [lang === 'ar' ? 'صافي الربح' : 'Net profit', `$${summary.net_profit.toFixed(2)}`],
                  [lang === 'ar' ? 'الهامش' : 'Margin', `${summary.margin_pct}%`],
                ].map(([label, val]) => (
                  <Link to="/admin/financials" key={label} className="bg-card border border-border rounded-md p-4 hover:border-[var(--brand-accent)] transition-colors">
                    <div className="text-xs uppercase text-muted-foreground">{label}</div>
                    <div className="font-heading text-xl mt-1" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-accent)' }}>{val}</div>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="grid gap-6 lg:grid-cols-3 mt-10">
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
              <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'مخزون منخفض' : 'Low stock'}</h2>
              <ul className="divide-y divide-border">
                {lowStock.slice(0, 6).map((s) => (
                  <li key={s.id} className="py-3 flex justify-between text-sm">
                    <span>{s.product_type} · {s.color} · {s.size}</span>
                    <span style={{ color: 'var(--brand-accent)' }}>{s.quantity_on_hand}/{s.low_stock_threshold}</span>
                  </li>
                ))}
                {lowStock.length === 0 && <li className="text-muted-foreground py-3">All good.</li>}
              </ul>
            </section>
            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'طلبات المصنع المفتوحة' : 'Open factory jobs'}</h2>
              <ul className="divide-y divide-border">
                {openFactoryJobs.slice(0, 6).map((f) => (
                  <li key={f.id} className="py-3 flex justify-between text-sm">
                    <span>{f.type === 'restock' ? 'Restock' : 'Print job'} #{f.id}</span>
                    <span className="text-muted-foreground uppercase text-xs">{f.status}</span>
                  </li>
                ))}
                {openFactoryJobs.length === 0 && <li className="text-muted-foreground py-3">Nothing pending.</li>}
              </ul>
              <Link to="/admin/factory" className="kh-btn-text text-xs inline-block mt-2">{lang === 'ar' ? 'إدارة المصنع' : 'Manage factory orders'}</Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
