import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function ProductionTimeline() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Product.list('-sort_order', 100);
        setProducts((list || []).filter((p) => p.status === 'active' && p.preorder_type !== 'always_on'));
      } catch { setProducts([]); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Production" title={lang === 'ar' ? 'خط الإنتاج' : 'Production timeline'} sub={lang === 'ar' ? 'متى بكون طلبك جاهز.' : 'When your preorder gets made.'} />
      {loading ? <div className="text-muted-foreground mt-8">{t.common.loading}</div> : (
        <ol className="mt-10 space-y-6">
          {products.map((p) => {
            const pct = p.preorder_capacity ? Math.min(100, Math.round(((p.units_sold||0)/p.preorder_capacity)*100)) : 0;
            return (
              <li key={p.id} className="bg-card border border-border rounded-md p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="kh-eyebrow">{p.drop_name || p.collection_name}</div>
                    <h3 className="font-heading text-xl uppercase mt-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>{p.name_en}</h3>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {p.preorder_close_date && <div>{lang === 'ar' ? 'يغلق' : 'Closes'} {p.preorder_close_date}</div>}
                    <div>{lang === 'ar' ? 'الإرسال' : 'Dispatch'}: {p.estimated_dispatch_window || `${p.estimated_production_days} ${lang === 'ar' ? 'يوم' : 'days'}`}</div>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-[var(--brand-accent)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-2">{p.units_sold||0}/{p.preorder_capacity||'∞'} {lang === 'ar' ? 'مباع' : 'sold'}</div>
              </li>
            );
          })}
          {products.length === 0 && <li className="text-muted-foreground">No active preorders.</li>}
        </ol>
      )}
    </div>
  );
}
