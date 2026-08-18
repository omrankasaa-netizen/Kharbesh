import React from 'react';
import { useParams, Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCollections, useProducts } from '@/lib/useCatalog.jsx';
import ProductCard from '@/components/ProductCard';
import { Scribble } from '@/components/Brand';

export default function CollectionPage() {
  const { slug } = useParams();
  const { lang, t } = useI18n();
  const { collections } = useCollections();
  const collection = collections.find((c) => c.slug === slug);
  const { products, loading } = useProducts({ collectionSlug: slug });

  if (!collection && !collections.length) return <div className="max-w-[1400px] mx-auto px-6 py-20 text-muted-foreground">{t.common.loading}</div>;
  if (!collection) return <div className="max-w-[1400px] mx-auto px-6 py-20"><p>Collection not found.</p><Link to="/collections" className="kh-btn-text mt-4">{t.nav.collections}</Link></div>;

  const name = lang === 'ar' ? collection.name_ar : collection.name_en;
  const desc = lang === 'ar' ? collection.description_ar : collection.description_en;

  return (
    <div>
      <section className="kh-ink border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <span className="kh-eyebrow" style={{ color: collection.accent || 'var(--brand-accent)' }}>KHARBESH WORLD</span>
          <h1 className="mt-3 font-body font-black text-5xl sm:text-7xl" style={{ fontFamily: 'var(--brand-font-body)' }}>{name}</h1>
          <p className="mt-4 max-w-xl" style={{ color: 'rgba(251,246,235,.85)' }}>{desc}</p>
          <Scribble className="mt-8" width={120} />
        </div>
      </section>
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : products.length === 0 ? (
          <p className="text-muted-foreground">No products in this world yet.</p>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
