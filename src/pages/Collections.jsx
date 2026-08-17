import React from 'react';
import { useI18n } from '@/lib/i18n';
import { useCollections } from '@/lib/useCatalog.jsx';
import CollectionCard from '@/components/CollectionCard';

export default function Collections() {
  const { t } = useI18n();
  const { collections, loading } = useCollections();
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <span className="kh-eyebrow">{t.nav.collections}</span>
      <h1 className="mt-2 font-heading text-4xl sm:text-6xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.home.collectionsTitle}</h1>
      <p className="mt-2 text-muted-foreground">{t.home.collectionsSub}</p>
      <div className="grid gap-4 sm:gap-6 mt-10 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : collections.map((c) => <CollectionCard key={c.id} collection={c} />)}
      </div>
    </div>
  );
}
