import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import { useColors, useGarmentStyles } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function AdminInventory() {
  const { t, lang } = useI18n();
  const colors = useColors();
  const styles = useGarmentStyles();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Product.list('-sort_order', 100);
        setProducts((list || []).filter((p) => p.status !== 'archived'));
      } catch { setProducts([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const update = async (id, data) => {
    try { await base44.entities.Product.update(id, data); setProducts((ps) => ps.map((p) => p.id === id ? { ...p, ...data } : p)); } catch {}
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'المخزون' : 'Inventory'} />
      <div className="grid gap-6 lg:grid-cols-3 mt-8">
        <section className="bg-card border border-border rounded-md p-5">
          <h2 className="font-heading text-lg uppercase mb-3" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'أنواع الألبسة' : 'Garment styles'}</h2>
          <ul className="text-sm space-y-2">
            {styles.map((s) => <li key={s.id} className="flex justify-between"><span>{s.name_en}</span><span className="text-muted-foreground">{(s.sizes||[]).join(', ')}</span></li>)}
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
            <li className="flex justify-between"><span>{lang === 'ar' ? 'منتجات نشطة' : 'Active products'}</span><span>{products.length}</span></li>
            <li className="flex justify-between"><span>{lang === 'ar' ? 'أنواع' : 'Styles'}</span><span>{styles.length}</span></li>
            <li className="flex justify-between"><span>{lang === 'ar' ? 'ألوان' : 'Colors'}</span><span>{colors.length}</span></li>
          </ul>
        </section>
      </div>

      <h2 className="font-heading text-xl uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'المنتجات والمخزون' : 'Products & stock'}</h2>
      {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-3 pr-3">Product</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3">Sold</th><th className="py-3 pr-3">Capacity</th>
            </tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="py-3 pr-3">{p.name_en}</td>
                  <td className="py-3 pr-3">
                    <select value={p.status} onChange={(e)=>update(p.id, { status: e.target.value })} className="kh-input !h-9 !py-1 max-w-[140px]">
                      <option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option>
                    </select>
                  </td>
                  <td className="py-3 pr-3">{p.units_sold || 0}</td>
                  <td className="py-3 pr-3">
                    <input type="number" defaultValue={p.preorder_capacity || 0} onBlur={(e)=>update(p.id, { preorder_capacity: Number(e.target.value) })} className="kh-input !h-9 !py-1 max-w-[100px]" />
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={4} className="py-8 text-muted-foreground">No products.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
