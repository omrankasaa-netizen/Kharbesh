import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts } from '@/lib/useCatalog.jsx';
import ProductCard from '@/components/ProductCard';
import { Scribble } from '@/components/Brand';

export default function NewDrop() {
  const { t } = useI18n();
  const { products, loading } = useProducts({ dropOnly: true });
  return (
    <div>
      <section className="bg-secondary text-secondary-foreground border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <span className="kh-eyebrow" style={{ color: 'var(--brand-accent)' }}>{t.home.newDropEyebrow}</span>
          <h1 className="mt-3 font-heading text-5xl sm:text-7xl uppercase text-white" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.home.newDropTitle}</h1>
          <p className="mt-4 max-w-md" style={{ color: '#A89F8C' }}>{t.home.newDropSub}</p>
          <Scribble className="mt-8" width={120} />
        </div>
      </section>
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : products.length === 0 ? (
          <p className="text-muted-foreground">No active drops right now. <Link to="/shop" className="kh-btn-text">{t.nav.shop}</Link></p>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        <div className="mt-10"><Link to="/shop" className="kh-btn-scribble">{t.home.shopDrop}</Link></div>
      </section>
    </div>
  );
}
