import React, { useEffect, useState } from 'react';
import { base44, hasRole } from '@/api/khClient';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const STATUSES = ['order_received','preorder_confirmed','in_production','being_printed','preparing_shipment','on_the_way','delivered','needs_attention'];

export default function AdminOrders() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isSuperAdmin = hasRole(user, 'super_admin');
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Order.list('-created_date', 200);
        setOrders(list || []);
      } catch { setOrders([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = orders.filter((o) => {
    const matchQ = !q || (o.order_number||'').toLowerCase().includes(q.toLowerCase()) || (o.email||'').toLowerCase().includes(q.toLowerCase()) || (o.full_name||'').toLowerCase().includes(q.toLowerCase());
    const matchS = !status || o.status === status;
    return matchQ && matchS;
  });

  const updateStatus = async (id, newStatus) => {
    try { await base44.entities.Order.update(id, { status: newStatus }); setOrders((os) => os.map((o) => o.id === id ? { ...o, status: newStatus } : o)); } catch {}
  };

  // Super_admin-only permanent delete (test-data cleanup pre-launch). Requires
  // typing the order number back — there's no undo once this hits the server.
  const hardDelete = async (o) => {
    const typed = window.prompt(
      lang === 'ar'
        ? `حذف نهائي! ما في تراجع. اكتب رقم الطلب تماماً للتأكيد:\n"${o.order_number}"`
        : `Permanent delete — this cannot be undone. Type the order number exactly to confirm:\n"${o.order_number}"`,
    );
    if (typed !== o.order_number) return;
    try {
      await base44.entities.Order.hardDelete(o.id);
      setOrders((os) => os.filter((x) => x.id !== o.id));
    } catch (err) {
      window.alert(err?.message || (lang === 'ar' ? 'ما قدرنا نحذف.' : 'Could not delete.'));
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'إدارة الطلبات' : 'Orders'} />
      <div className="flex flex-wrap gap-3 mt-8">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={lang === 'ar' ? 'بحث برقم الطلب أو الاسم' : 'Search order #, name, email'} className="kh-input max-w-sm" />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="kh-input max-w-[200px]">
          <option value="">{lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      {loading ? <div className="text-muted-foreground mt-8">{t.common.loading}</div> : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-3">Order</th><th className="py-3 pr-3">Customer</th><th className="py-3 pr-3">Total</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border">
                  <td className="py-3 pr-3 font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>{o.order_number}</td>
                  <td className="py-3 pr-3">{o.full_name}<div className="text-muted-foreground text-xs">{o.email}</div></td>
                  <td className="py-3 pr-3">${o.total}</td>
                  <td className="py-3 pr-3">
                    <select value={o.status} onChange={(e)=>updateStatus(o.id, e.target.value)} className="kh-input !h-9 !py-1 max-w-[180px]">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {isSuperAdmin && (
                      <button onClick={() => hardDelete(o)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)', fontWeight: 600 }}>
                        {lang === 'ar' ? 'حذف نهائي' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-muted-foreground">No orders.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
