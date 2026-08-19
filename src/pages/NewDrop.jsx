import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts } from '@/lib/useCatalog.jsx';
import ProductCard from '@/components/ProductCard';
import { Scribble } from '@/components/Brand';

export default function NewDrop() {
  const { t } = useI18n();
  const { products, loading } = useProducts({ dropOnly: true });
  const hasDrop = !loading && products.length > 0;
  return (
    <div>
      <section className="bg-secondary text-secondary-foreground border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
          {loading ? (
            <span className="kh-eyebrow opacity-0">.</span>
          ) : hasDrop ? (
            <>
              <span className="kh-eyebrow">{t.home.newDropEyebrow}</span>
              <h1 className="mt-3 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.home.newDropTitle}</h1>
              <p className="mt-4 max-w-md" style={{ color: 'var(--muted)' }}>{t.home.newDropSub}</p>
            </>
          ) : (
            <>
              <span className="kh-eyebrow">{t.home.noDropEyebrow}</span>
              <h1 className="mt-3 font-heading text-5xl sm:text-7xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.home.noDropTitle}</h1>
              <p className="mt-4 max-w-md" style={{ color: 'var(--muted)' }}>{t.home.noDropSub}</p>
            </>
          )}
          <Scribble className="mt-8" width={120} />
        </div>
      </section>
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : hasDrop ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : null}
        <div className="mt-10"><Link to="/shop" className="kh-btn-scribble">{t.home.shopDrop}</Link></div>
      </section>
    </div>
  );
}
