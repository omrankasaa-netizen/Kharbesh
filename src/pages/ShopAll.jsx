import React from 'react';
import { useSearchParams } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts, useCollections } from '@/lib/useCatalog.jsx';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = [
  { key: '', label_en: 'All', label_ar: 'الكل' },
  { key: 'tee', label_en: 'T-shirts', label_ar: 'تيشيرت' },
  { key: 'hoodie', label_en: 'Hoodies', label_ar: 'هودي' },
];

export default function ShopAll() {
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const collection = params.get('collection') || '';
  const type = params.get('type') || '';
  const { products, loading } = useProducts({ search: q, collectionSlug: collection, productType: type });
  const { collections } = useCollections();

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    setParams(next);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span className="kh-eyebrow">{t.nav.shop}</span>
          <h1 className="mt-2 font-heading text-4xl sm:text-6xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{q ? `“${q}”` : t.nav.shop}</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setFilter('type', c.key)} className={`kh-btn-outline !text-[12px] !py-2 !px-3 ${type === c.key ? '!bg-primary !text-primary-foreground' : ''}`}>
            {lang === 'ar' ? c.label_ar : c.label_en}
          </button>
        ))}
        <span className="w-px self-stretch bg-border mx-1" />
        <button onClick={() => setFilter('collection', '')} className={`kh-btn-outline !text-[12px] !py-2 !px-3 ${!collection ? '!bg-primary !text-primary-foreground' : ''}`}>All worlds</button>
        {collections.map((c) => (
          <button key={c.id} onClick={() => setFilter('collection', c.slug)} className={`kh-btn-outline !text-[12px] !py-2 !px-3 ${collection === c.slug ? '!bg-primary !text-primary-foreground' : ''}`}>
            {c.name_en.replace('Kharbesh ', '')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted-foreground">{t.common.loading}</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="font-heading text-2xl uppercase mb-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>No results</p>
          <p>Try another phrase or browse a world.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
