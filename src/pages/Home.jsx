import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCollections } from '@/lib/useCatalog.jsx';
import { Scribble } from '@/components/Brand';
import Hero from '@/components/home/Hero';
import DesignMarquee from '@/components/home/DesignMarquee';
import DesignShowcase from '@/components/home/DesignShowcase';
import DarkCollectionCard from '@/components/home/DarkCollectionCard';
import DarkCommunityCard from '@/components/home/DarkCommunityCard';

export default function Home() {
  const { t, lang } = useI18n();
  const { collections } = useCollections();

  return (
    <div className="kh-dark" style={{ background: 'var(--brand-primary)' }}>
      <Hero />
      <DesignMarquee />
      <DesignShowcase />

      {/* Worlds */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <span className="kh-d-eyebrow">{t.home.collectionsEyebrow}</span>
            <h2 className="mt-2 font-heading text-3xl sm:text-5xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-on-primary)' }}>{t.home.collectionsTitle}</h2>
            <p className="mt-2" style={{ color: '#A89F8C' }}>{t.home.collectionsSub}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => <DarkCollectionCard key={c.id} collection={c} />)}
          <DarkCommunityCard />
        </div>
      </section>

      {/* Custom CTA */}
      <section style={{ background: '#1C1814', borderTop: '1px solid #322C25', borderBottom: '1px solid #322C25' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid gap-6 md:grid-cols-2 items-center">
            <div>
              <span className="kh-d-eyebrow">{t.home.customEyebrow}</span>
              <h2 className="mt-2 font-heading text-3xl sm:text-5xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-on-primary)' }}>{t.home.customTitle}</h2>
              <p className="mt-4 max-w-md" style={{ color: '#A89F8C' }}>{t.home.customSub}</p>
              <Link to="/custom" className="kh-d-btn-brick mt-8">{t.home.customCta}</Link>
            </div>
            <div className="relative p-10 sm:p-16 aspect-[4/3] flex items-center justify-center overflow-hidden rounded-md" style={{ background: 'var(--brand-primary)', border: '1px solid #322C25' }}>
              <span className="text-3xl sm:text-5xl text-center leading-tight" style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 900, color: 'var(--brand-on-primary)' }}>
                {lang === 'ar' ? 'جملتك هون' : 'your phrase here'}
              </span>
              <Scribble className="absolute bottom-10 left-1/2 -translate-x-1/2" width={140} tone="brick" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
