import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/khClient';
import { useColors, useGarmentStyles } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const PRODUCT_TYPES = ['tee', 'hoodie', 'accessory'];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export default function AdminInventory() {
  const { t, lang } = useI18n();
  const colors = useColors();
  const styles = useGarmentStyles();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newVariant, setNewVariant] = useState({ product_type: 'tee', color: '', size: '', quantity_on_hand: 0, low_stock_threshold: 2 });
  const [adjusting, setAdjusting] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [movements, setMovements] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.BlankStock.list();
      setStock(list || []);
    } catch { setStock([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const lowStockCount = useMemo(() => stock.filter((s) => s.is_low).length, [stock]);

  const addVariant = async () => {
    if (!newVariant.color || !newVariant.size) return;
    const created = await base44.entities.BlankStock.upsertVariant(newVariant);
    setStock((s) => {
      const exists = s.some((x) => x.id === created.id);
      return exists ? s.map((x) => (x.id === created.id ? created : x)) : [created, ...s];
    });
    setNewVariant({ product_type: 'tee', color: '', size: '', quantity_on_hand: 0, low_stock_threshold: 2 });
  };

  const submitAdjust = async (row, type) => {
    const qty = Number(adjustQty);
    if (!qty) return;
    const delta = type === 'consumed' ? -Math.abs(qty) : Math.abs(qty);
    const updated = await base44.entities.BlankStock.adjust({ id: row.id, delta, type, note: '' });
    setStock((s) => s.map((x) => (x.id === row.id ? updated : x)));
    setAdjusting(null);
    setAdjustQty('');
  };

  const toggleMovements = async (row) => {
    if (movements[row.id]) {
      setMovements((m) => { const next = { ...m }; delete next[row.id]; return next; });
      return;
    }
    const list = await base44.entities.BlankStock.movements(row.id);
    setMovements((m) => ({ ...m, [row.id]: list }));
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'المخزون' : 'Inventory'} sub={lang === 'ar' ? 'مخزون القمصان الخام عند المصنع — لكل لون وقياس' : 'Blank garment stock held at the factory — per color and size, before printing.'} />

      {lowStockCount > 0 && (
        <div className="mt-6 border rounded-md px-4 py-3 text-sm" style={{ borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)', background: 'color-mix(in srgb, var(--brand-accent) 8%, transparent)' }}>
          {lang === 'ar' ? `تنبيه: ${lowStockCount} متغيّر وصل لحد إعادة التعبئة` : `Low stock alert: ${lowStockCount} variant${lowStockCount > 1 ? 's' : ''} at or below the restock threshold.`}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 mt-8">
        <section className="bg-card border border-border rounded-md p-5">
          <h2 className="font-heading text-lg uppercase mb-3" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'أنواع الألبسة' : 'Garment styles'}</h2>
          <ul className="text-sm space-y-2">
            {styles.map((s) => <li key={s.id} className="flex justify-between"><span>{s.name_en}</span><span className="text-muted-foreground">{(s.sizes || []).join(', ')}</span></li>)}
            {styles.length === 0 && <li className="text-muted-foreground">No styles.</li>}
          </ul>
        </section>
        <section className="bg-card border border-border rounded-md p-5">
          <h2 className="font-heading text-lg uppercase mb-3" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'الألوان' : 'Colors'}</h2>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full border border-border" style={{ background: c.hex }} />
                <span>{c.name_en}</span>
              </div>
            ))}
            {colors.length === 0 && <p className="text-muted-foreground text-sm">No colors.</p>}
          </div>
        </section>
        <section className="bg-card border border-border rounded-md p-5">
          <h2 className="font-heading text-lg uppercase mb-3" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'ملخص' : 'Summary'}</h2>
          <ul className="text-sm space-y-2">
            <li className="flex justify-between"><span>{lang === 'ar' ? 'متغيّرات' : 'Variants tracked'}</span><span>{stock.length}</span></li>
            <li className="flex justify-between"><span>{lang === 'ar' ? 'مخزون منخفض' : 'Low stock'}</span><span style={{ color: lowStockCount ? 'var(--brand-accent)' : undefined }}>{lowStockCount}</span></li>
            <li className="flex justify-between"><span>{lang === 'ar' ? 'إجمالي القطع' : 'Total blanks on hand'}</span><span>{stock.reduce((sum, s) => sum + s.quantity_on_hand, 0)}</span></li>
          </ul>
        </section>
      </div>

      <h2 className="font-heading text-xl uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'إضافة متغيّر' : 'Add stock variant'}</h2>
      <div className="bg-card border border-border rounded-md p-5 flex flex-wrap gap-3 items-end">
        <select className="kh-input !h-9 !py-1 max-w-[140px]" value={newVariant.product_type} onChange={(e) => setNewVariant((v) => ({ ...v, product_type: e.target.value }))}>
          {PRODUCT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="kh-input !h-9 !py-1 max-w-[160px]" value={newVariant.color} onChange={(e) => setNewVariant((v) => ({ ...v, color: e.target.value }))}>
          <option value="">Color…</option>
          {colors.map((c) => <option key={c.id} value={c.name_en}>{c.name_en}</option>)}
        </select>
        <select className="kh-input !h-9 !py-1 max-w-[100px]" value={newVariant.size} onChange={(e) => setNewVariant((v) => ({ ...v, size: e.target.value }))}>
          <option value="">Size…</option>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" placeholder="Qty on hand" className="kh-input !h-9 !py-1 max-w-[120px]" value={newVariant.quantity_on_hand} onChange={(e) => setNewVariant((v) => ({ ...v, quantity_on_hand: Number(e.target.value) }))} />
        <input type="number" placeholder="Low-stock alert" className="kh-input !h-9 !py-1 max-w-[130px]" value={newVariant.low_stock_threshold} onChange={(e) => setNewVariant((v) => ({ ...v, low_stock_threshold: Number(e.target.value) }))} />
        <button onClick={addVariant} className="kh-btn-primary !py-2 !px-4 text-sm">{lang === 'ar' ? 'إضافة' : 'Add'}</button>
      </div>

      <h2 className="font-heading text-xl uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'مخزون القمصان الخام' : 'Blank stock'}</h2>
      {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Color</th><th className="py-3 pr-3">Size</th>
              <th className="py-3 pr-3">On hand</th><th className="py-3 pr-3">Alert at</th><th className="py-3 pr-3"></th>
            </tr></thead>
            <tbody>
              {stock.map((s) => (
                <React.Fragment key={s.id}>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-3">{s.product_type}</td>
                    <td className="py-3 pr-3">{s.color}</td>
                    <td className="py-3 pr-3">{s.size}</td>
                    <td className="py-3 pr-3 font-semibold" style={{ color: s.is_low ? 'var(--brand-accent)' : undefined }}>{s.quantity_on_hand}</td>
                    <td className="py-3 pr-3">{s.low_stock_threshold}</td>
                    <td className="py-3 pr-3 text-right whitespace-nowrap">
                      {adjusting === s.id ? (
                        <span className="inline-flex items-center gap-2">
                          <input type="number" autoFocus value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="kh-input !h-8 !py-0 max-w-[80px]" />
                          <button onClick={() => submitAdjust(s, 'restock')} className="kh-btn-text text-xs">+ Restock</button>
                          <button onClick={() => submitAdjust(s, 'consumed')} className="kh-btn-text text-xs">− Consume</button>
                          <button onClick={() => setAdjusting(null)} className="kh-btn-text text-xs text-muted-foreground">Cancel</button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-3">
                          <button onClick={() => setAdjusting(s.id)} className="kh-btn-text text-xs">{lang === 'ar' ? 'تعديل' : 'Adjust'}</button>
                          <button onClick={() => toggleMovements(s)} className="kh-btn-text text-xs">{movements[s.id] ? 'Hide log' : 'History'}</button>
                        </span>
                      )}
                    </td>
                  </tr>
                  {movements[s.id] && (
                    <tr>
                      <td colSpan={6} className="pb-4">
                        <ul className="text-xs text-muted-foreground space-y-1 pl-2">
                          {movements[s.id].map((m) => (
                            <li key={m.id}>{new Date(m.created_date).toLocaleString()} — {m.type} {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta} {m.note ? `(${m.note})` : ''}</li>
                          ))}
                          {movements[s.id].length === 0 && <li>No movements yet.</li>}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {stock.length === 0 && <tr><td colSpan={6} className="py-8 text-muted-foreground">No stock variants yet — add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
