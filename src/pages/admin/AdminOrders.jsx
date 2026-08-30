import React, { useEffect, useState } from 'react';
import { base44, hasRole } from '@/api/khClient';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { whatsappLink } from '@/lib/whatsapp';
import { IconWhatsApp, IconMail } from '@/components/Brand';
import { toast } from '@/components/ui/use-toast';

const STATUSES = ['order_received','preorder_confirmed','in_production','being_printed','preparing_shipment','on_the_way','delivered','needs_attention','cancelled'];
const PAGE_SIZE = 50;

export default function AdminOrders() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isSuperAdmin = hasRole(user, 'super_admin');
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [followupState, setFollowupState] = useState({}); // { [orderId]: 'sending' | 'sent' | 'error' }

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Order.list({ limit: PAGE_SIZE, offset: 0 });
        setOrders(list || []);
        setHasMore((list || []).length === PAGE_SIZE);
      } catch { setOrders([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const list = await base44.entities.Order.list({ limit: PAGE_SIZE, offset: orders.length });
      setOrders((os) => [...os, ...(list || [])]);
      setHasMore((list || []).length === PAGE_SIZE);
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحمّل المزيد' : 'Could not load more orders'), variant: 'destructive' });
    } finally { setLoadingMore(false); }
  };

  const filtered = orders.filter((o) => {
    const matchQ = !q || (o.order_number||'').toLowerCase().includes(q.toLowerCase()) || (o.email||'').toLowerCase().includes(q.toLowerCase()) || (o.full_name||'').toLowerCase().includes(q.toLowerCase());
    const matchS = !status || o.status === status;
    return matchQ && matchS;
  });

  const updateStatus = async (id, newStatus) => {
    try {
      await base44.entities.Order.update(id, { status: newStatus });
      setOrders((os) => os.map((o) => o.id === id ? { ...o, status: newStatus } : o));
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحدّث الحالة' : 'Could not update status'), variant: 'destructive' });
    }
  };

  const sendFollowup = async (id) => {
    setFollowupState((s) => ({ ...s, [id]: 'sending' }));
    try {
      await base44.entities.Order.sendFollowupEmail(id);
      setFollowupState((s) => ({ ...s, [id]: 'sent' }));
    } catch {
      setFollowupState((s) => ({ ...s, [id]: 'error' }));
    }
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
                <th className="py-3 pr-3">Order</th><th className="py-3 pr-3">Customer</th><th className="py-3 pr-3">Total</th><th className="py-3 pr-3">Payment</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <React.Fragment key={o.id}>
                  <tr
                    className="border-b border-border cursor-pointer hover:bg-muted/40"
                    onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                  >
                    <td className="py-3 pr-3 font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>
                      <span className="mr-1 text-muted-foreground text-xs">{expandedId === o.id ? '▾' : '▸'}</span>
                      {o.order_number}
                    </td>
                    <td className="py-3 pr-3">
                      {o.full_name}
                      <div className="text-muted-foreground text-xs">{o.email}</div>
                      {o.phone && (
                        <a
                          href={whatsappLink(o.phone, `${lang === 'ar' ? 'هاي' : 'Hi'} ${o.full_name}, ${lang === 'ar' ? 'معك من خربش بخصوص طلبية' : 'this is Kharbesh regarding your order'} ${o.order_number}...`)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs mt-1 hover:opacity-80"
                          style={{ color: '#25D366' }}
                        >
                          <IconWhatsApp size={13} /> {o.phone}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); sendFollowup(o.id); }}
                        disabled={followupState[o.id] === 'sending'}
                        className="inline-flex items-center gap-1 text-xs mt-1 hover:opacity-80 disabled:opacity-50"
                        style={{ color: 'var(--muted)' }}
                        title={lang === 'ar' ? 'بعت إيميل محالفة' : 'Send follow-up email'}
                      >
                        <IconMail size={13} />
                        {followupState[o.id] === 'sending'
                          ? (lang === 'ar' ? 'عم يبعت…' : 'Sending…')
                          : followupState[o.id] === 'sent'
                          ? (lang === 'ar' ? 'انبعت ✓' : 'Sent ✓')
                          : followupState[o.id] === 'error'
                          ? (lang === 'ar' ? 'فشل — جرّب كمان' : 'Failed — retry')
                          : (lang === 'ar' ? 'إيميل محالفة' : 'Follow-up email')}
                      </button>
                    </td>
                    <td className="py-3 pr-3">${o.total}</td>
                    <td className="py-3 pr-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium border"
                        style={o.payment_method === 'whish'
                          ? { background: 'var(--brand-accent)', color: 'var(--on-lime)', borderColor: 'var(--brand-accent)' }
                          : { background: 'transparent', color: 'var(--muted)', borderColor: 'var(--border)' }}
                      >
                        {o.payment_method === 'whish' ? 'Whish' : 'COD'}
                      </span>
                    </td>
                    <td className="py-3 pr-3" onClick={(e) => e.stopPropagation()}>
                      <select value={o.status} onChange={(e)=>updateStatus(o.id, e.target.value)} className="kh-input !h-9 !py-1 max-w-[180px]">
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {isSuperAdmin && (
                        <button onClick={() => hardDelete(o)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)', fontWeight: 600 }}>
                          {lang === 'ar' ? 'حذف نهائي' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr className="border-b border-border bg-muted/20">
                      <td colSpan={6} className="py-4 px-4">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <div className="kh-eyebrow mb-2">{lang === 'ar' ? 'القطع' : 'Items'}</div>
                            <div className="space-y-1 text-sm">
                              {(o.items || []).map((i, idx) => (
                                <div key={idx} className="flex justify-between gap-2">
                                  <span className="min-w-0 truncate">{i.productName} — {i.color} · {i.size} · ×{i.quantity}</span>
                                  <span className="shrink-0">${i.lineTotal ?? (i.unitPrice * i.quantity)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-border text-sm space-y-1">
                              <div className="flex justify-between"><span className="text-muted-foreground">{t.cart?.subtotal || 'Subtotal'}</span><span>${o.subtotal}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">{t.cart?.shipping || 'Shipping'}</span><span>${o.shipping}</span></div>
                              {o.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t.checkout?.discount || 'Discount'}</span><span>-${o.discount}</span></div>}
                              <div className="flex justify-between font-medium"><span>{t.cart?.total || 'Total'}</span><span>${o.total}</span></div>
                              {(o.applied_discounts || []).length > 0 && (
                                <div className="pt-2 text-xs text-muted-foreground space-y-0.5">
                                  {o.applied_discounts.map((d, idx) => (
                                    <div key={idx} className="flex justify-between"><span>{d.name}</span><span>-${(d.amountCents / 100).toFixed(2)}</span></div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm space-y-2">
                            <div>
                              <div className="kh-eyebrow mb-1">{lang === 'ar' ? 'التوصيل إلى' : 'Ship to'}</div>
                              <div>{o.shipping_address}, {o.city}, {o.country}</div>
                            </div>
                            {o.notes && (
                              <div>
                                <div className="kh-eyebrow mb-1">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</div>
                                <div className="text-muted-foreground">{o.notes}</div>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2">
                              {o.internal_status && <span className="px-2 py-0.5 rounded border border-border">{o.internal_status}</span>}
                              {o.is_guest && <span>{lang === 'ar' ? 'ضيف' : 'guest'}</span>}
                              <span>{new Date(o.created_date).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-muted-foreground">No orders.</td></tr>}
            </tbody>
          </table>
          {hasMore && !q && !status && (
            <div className="mt-6 text-center">
              <button type="button" onClick={loadMore} disabled={loadingMore} className="kh-btn-secondary">
                {loadingMore ? t.common.loading : (lang === 'ar' ? 'حمّل المزيد' : 'Load more')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
