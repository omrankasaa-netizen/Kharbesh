import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/khClient';
import { useColors } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const PENDING_STATUSES = ['order_received', 'preorder_confirmed', 'in_production'];
const PRODUCT_TYPES = ['tee', 'hoodie', 'accessory'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function exportToExcel(factoryOrder) {
  const rows = factoryOrder.items.map((it) => ({
    'Order #': it.source_order_number || '—',
    'Customer Name': it.customer_name || '—',
    'Phone': it.customer_phone || '—',
    'Address': it.customer_address || '—',
    'Design': it.design_name_en || '—',
    'Phrase': it.phrase_en || '',
    'Product type': it.product_type,
    'Color': it.color,
    'Size': it.size,
    'Quantity': it.quantity,
    'Placement': it.placement || '',
    'Print File': it.print_file_url || '—',
    'Notes': it.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 24 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 40 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Factory Order');
  const label = factoryOrder.type === 'restock' ? 'restock' : 'print-job';
  XLSX.writeFile(wb, `kharbesh-${label}-${factoryOrder.id}.xlsx`);
}

export default function AdminFactory() {
  const { t, lang } = useI18n();
  const colors = useColors();
  const [factoryOrders, setFactoryOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restockRows, setRestockRows] = useState([{ product_type: 'tee', color: '', size: '', quantity: 1 }]);
  const [restockNotes, setRestockNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [fo, orders] = await Promise.all([
        base44.entities.FactoryOrder.list(),
        base44.entities.Order.list(),
      ]);
      setFactoryOrders(fo || []);
      setPendingOrders((orders || []).filter((o) => PENDING_STATUSES.includes(o.status)));
    } catch { setFactoryOrders([]); setPendingOrders([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleOrder = (id) =>
    setSelectedOrderIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const generatePrintJob = async () => {
    if (!selectedOrderIds.length) return;
    setBusy(true);
    try {
      const created = await base44.entities.FactoryOrder.generatePrintJob(selectedOrderIds);
      setFactoryOrders((f) => [created, ...f]);
      setSelectedOrderIds([]);
    } finally { setBusy(false); }
  };

  const addRestockRow = () => setRestockRows((r) => [...r, { product_type: 'tee', color: '', size: '', quantity: 1 }]);
  const updateRestockRow = (i, patch) => setRestockRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeRestockRow = (i) => setRestockRows((r) => r.filter((_, idx) => idx !== i));

  const submitRestock = async () => {
    const items = restockRows.filter((r) => r.color && r.size && r.quantity > 0);
    if (!items.length) return;
    setBusy(true);
    try {
      const created = await base44.entities.FactoryOrder.createRestock(items, restockNotes || undefined);
      setFactoryOrders((f) => [created, ...f]);
      setRestockRows([{ product_type: 'tee', color: '', size: '', quantity: 1 }]);
      setRestockNotes('');
    } finally { setBusy(false); }
  };

  const markSent = async (fo) => {
    const updated = await base44.entities.FactoryOrder.markSent(fo.id);
    setFactoryOrders((f) => f.map((x) => (x.id === fo.id ? updated : x)));
  };
  const markFulfilled = async (fo) => {
    if (!window.confirm(lang === 'ar' ? 'تأكيد الاستلام؟ رح يتحدّث المخزون تلقائياً.' : 'Mark fulfilled? This updates blank stock automatically.')) return;
    const updated = await base44.entities.FactoryOrder.markFulfilled(fo.id);
    setFactoryOrders((f) => f.map((x) => (x.id === fo.id ? updated : x)));
  };
  const cancel = async (fo) => {
    if (!window.confirm(lang === 'ar' ? 'إلغاء هالطلب؟' : 'Cancel this factory order?')) return;
    const updated = await base44.entities.FactoryOrder.cancel(fo.id);
    setFactoryOrders((f) => f.map((x) => (x.id === fo.id ? updated : x)));
  };

  const draftJobs = useMemo(() => factoryOrders.filter((f) => f.status === 'draft'), [factoryOrders]);
  const activeJobs = useMemo(() => factoryOrders.filter((f) => f.status === 'sent'), [factoryOrders]);
  const doneJobs = useMemo(() => factoryOrders.filter((f) => ['fulfilled', 'cancelled'].includes(f.status)), [factoryOrders]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'المصنع' : 'Factory Orders'} sub={lang === 'ar' ? 'جهّز طلبات الطباعة وإعادة التعبئة، صدّرها إكسل، وأرسلها للمصنع' : 'Build print jobs and restock requests, export to Excel, send to the factory, and reconcile on fulfillment.'} />

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <section className="bg-card border border-border rounded-md p-5">
          <h2 className="font-heading text-lg uppercase mb-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>
            {lang === 'ar' ? 'بناء طلب طباعة' : 'Build a print job'}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">{lang === 'ar' ? 'اختر الطلبات الجاهزة للطباعة' : 'Select orders ready to send for printing.'}</p>
          <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-md p-2">
            {pendingOrders.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm py-1.5 px-1 cursor-pointer">
                <input type="checkbox" checked={selectedOrderIds.includes(o.id)} onChange={() => toggleOrder(o.id)} />
                <span className="font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>{o.order_number}</span>
                <span className="text-muted-foreground">{o.full_name} — {o.status.replace(/_/g, ' ')}</span>
              </label>
            ))}
            {pendingOrders.length === 0 && <p className="text-muted-foreground text-sm p-2">No orders pending production.</p>}
          </div>
          <button onClick={generatePrintJob} disabled={!selectedOrderIds.length || busy} className="kh-btn-primary mt-4">
            {lang === 'ar' ? `إنشاء طلب طباعة (${selectedOrderIds.length})` : `Generate print job (${selectedOrderIds.length})`}
          </button>
        </section>

        <section className="bg-card border border-border rounded-md p-5">
          <h2 className="font-heading text-lg uppercase mb-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>
            {lang === 'ar' ? 'طلب إعادة تعبئة يدوي' : 'Manual restock request'}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">{lang === 'ar' ? 'اطلب قمصان خام إضافية من المصنع' : 'Request additional blank garments from the factory.'}</p>
          <div className="space-y-2">
            {restockRows.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <select className="kh-input !h-9 !py-1 max-w-[110px]" value={row.product_type} onChange={(e) => updateRestockRow(i, { product_type: e.target.value })}>
                  {PRODUCT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="kh-input !h-9 !py-1 max-w-[130px]" value={row.color} onChange={(e) => updateRestockRow(i, { color: e.target.value })}>
                  <option value="">Color…</option>
                  {colors.map((c) => <option key={c.id} value={c.name_en}>{c.name_en}</option>)}
                </select>
                <select className="kh-input !h-9 !py-1 max-w-[90px]" value={row.size} onChange={(e) => updateRestockRow(i, { size: e.target.value })}>
                  <option value="">Size…</option>
                  {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="number" min={1} className="kh-input !h-9 !py-1 max-w-[80px]" value={row.quantity} onChange={(e) => updateRestockRow(i, { quantity: Number(e.target.value) })} />
                <button onClick={() => removeRestockRow(i)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={addRestockRow} className="kh-btn-text text-xs mt-2">{lang === 'ar' ? '+ إضافة سطر' : '+ Add row'}</button>
          <textarea className="kh-input mt-3" rows={2} placeholder="Notes for the factory…" value={restockNotes} onChange={(e) => setRestockNotes(e.target.value)} />
          <button onClick={submitRestock} disabled={busy} className="kh-btn-primary mt-3">{lang === 'ar' ? 'إرسال الطلب' : 'Create restock request'}</button>
        </section>
      </div>

      {loading ? <div className="text-muted-foreground mt-10">{t.common.loading}</div> : (
        <>
          {[
            { title: lang === 'ar' ? 'مسودات' : 'Drafts', list: draftJobs },
            { title: lang === 'ar' ? 'مُرسلة للمصنع' : 'Sent to factory', list: activeJobs },
            { title: lang === 'ar' ? 'مكتملة / ملغاة' : 'Fulfilled / cancelled', list: doneJobs },
          ].map(({ title, list }) => (
            <div key={title} className="mt-10">
              <h2 className="font-heading text-xl uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{title}</h2>
              {list.length === 0 ? <p className="text-muted-foreground text-sm">—</p> : (
                <div className="space-y-3">
                  {list.map((fo) => (
                    <div key={fo.id} className="bg-card border border-border rounded-md p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="font-heading uppercase text-sm" style={{ fontFamily: 'var(--brand-font-heading)' }}>
                            {fo.type === 'restock' ? 'Restock' : 'Print job'} #{fo.id}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">{new Date(fo.created_date).toLocaleDateString()} · {fo.items.length} item(s)</span>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => exportToExcel(fo)} className="kh-btn-text text-xs">{lang === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</button>
                          {fo.status === 'draft' && <button onClick={() => markSent(fo)} className="kh-btn-text text-xs">{lang === 'ar' ? 'أُرسل للمصنع' : 'Mark sent'}</button>}
                          {fo.status === 'sent' && <button onClick={() => markFulfilled(fo)} className="kh-btn-text text-xs">{lang === 'ar' ? 'تم الاستلام' : 'Mark fulfilled'}</button>}
                          {['draft', 'sent'].includes(fo.status) && <button onClick={() => cancel(fo)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>}
                        </div>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-muted-foreground"><th className="pr-3 py-1">Order</th><th className="pr-3 py-1">Design</th><th className="pr-3 py-1">Type</th><th className="pr-3 py-1">Color</th><th className="pr-3 py-1">Size</th><th className="pr-3 py-1">Qty</th></tr></thead>
                          <tbody>
                            {fo.items.map((it) => (
                              <tr key={it.id}>
                                <td className="pr-3 py-1">{it.source_order_number || '—'}</td>
                                <td className="pr-3 py-1">{it.design_name_en || '—'}</td>
                                <td className="pr-3 py-1">{it.product_type}</td>
                                <td className="pr-3 py-1">{it.color}</td>
                                <td className="pr-3 py-1">{it.size}</td>
                                <td className="pr-3 py-1">{it.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
