import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const TICK = { fill: '#6F6757', fontSize: 12 };
const TOOLTIP = { contentStyle: { background: '#FFFDF6', border: '1px solid rgba(23,20,14,.18)', borderRadius: 6, color: '#17140E' }, labelStyle: { color: '#6F6757' } };

export default function StoreAnalytics() {
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, p] = await Promise.all([
          base44.entities.Order.list('-created_date', 200),
          base44.entities.Product.list('-sort_order', 100),
        ]);
        setOrders(o || []);
        setProducts(p || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  // orders per day (last 14)
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), orders: 0, revenue: 0 });
  }
  orders.forEach((o) => {
    const k = (o.created_date || '').slice(0, 10);
    const day = days.find((d) => d.date === k);
    if (day) { day.orders++; day.revenue += o.total || 0; }
  });

  // revenue by style
  const byStyle = {};
  orders.forEach((o) => (o.items || []).forEach((it) => {
    const k = it.productType || 'other';
    byStyle[k] = (byStyle[k] || 0) + (it.lineTotal || (it.unitPrice || 0) * (it.quantity || 0));
  }));
  const styleData = Object.entries(byStyle).map(([name, value]) => ({ name, value: Math.round(value) }));

  // top products by units sold
  const topProducts = [...products].sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0)).slice(0, 6).map((p) => ({ name: (p.name_en || '').slice(0, 18), units: p.units_sold || 0 }));

  // orders by status
  const statusCounts = {};
  orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = orders.length ? Math.round(totalRevenue / orders.length) : 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'التحليلات' : 'Analytics'} />
      {loading ? <div className="text-muted-foreground mt-8">{t.common.loading}</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mt-8">
            <div className="bg-card border border-border rounded-md p-5"><div className="kh-eyebrow">{lang === 'ar' ? 'إجمالي الإيرادات' : 'Total revenue'}</div><div className="mt-2 font-heading text-3xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>${totalRevenue.toLocaleString()}</div></div>
            <div className="bg-card border border-border rounded-md p-5"><div className="kh-eyebrow">{lang === 'ar' ? 'متوسط الطلب' : 'Avg. order'}</div><div className="mt-2 font-heading text-3xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>${avgOrder}</div></div>
            <div className="bg-card border border-border rounded-md p-5"><div className="kh-eyebrow">{lang === 'ar' ? 'طلبات' : 'Orders'}</div><div className="mt-2 font-heading text-3xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>{orders.length}</div></div>
          </div>

          <section className="bg-card border border-border rounded-md p-5 mt-8">
            <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'الطلبات آخر 14 يوم' : 'Orders — last 14 days'}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={days}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,20,14,.18)" />
                <XAxis dataKey="label" tick={TICK} stroke="rgba(23,20,14,.18)" />
                <YAxis tick={TICK} stroke="rgba(23,20,14,.18)" allowDecimals={false} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="orders" fill="#D4ED0B" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <div className="grid gap-6 lg:grid-cols-2 mt-8">
            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'إيرادات حسب النوع' : 'Revenue by style'}</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={styleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,20,14,.18)" />
                  <XAxis dataKey="name" tick={TICK} stroke="rgba(23,20,14,.18)" />
                  <YAxis tick={TICK} stroke="rgba(23,20,14,.18)" />
                  <Tooltip {...TOOLTIP} />
                  <Bar dataKey="value" fill="#17140E" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'الأكثر مبيعاً' : 'Top products'}</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,20,14,.18)" />
                  <XAxis type="number" tick={TICK} stroke="rgba(23,20,14,.18)" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={TICK} stroke="rgba(23,20,14,.18)" width={120} />
                  <Tooltip {...TOOLTIP} />
                  <Bar dataKey="units" fill="#D4ED0B" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>

          <section className="bg-card border border-border rounded-md p-5 mt-8">
            <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'الطلبات حسب الحالة' : 'Orders by status'}</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,20,14,.18)" />
                <XAxis dataKey="name" tick={TICK} stroke="rgba(23,20,14,.18)" />
                <YAxis tick={TICK} stroke="rgba(23,20,14,.18)" allowDecimals={false} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" fill="#6F6757" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
      )}
    </div>
  );
}
