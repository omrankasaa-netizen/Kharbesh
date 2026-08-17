import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCollections } from '@/lib/useCatalog.jsx';
import Hero from '@/components/home/Hero';
import DesignShowcase from '@/components/home/DesignShowcase';
import DarkCollectionCard from '@/components/home/DarkCollectionCard';
import DarkCommunityCard from '@/components/home/DarkCommunityCard';

export default function Home() {
  const { t, lang } = useI18n();
  const { collections } = useCollections();

  return (
    <div className="kh-dark" style={{ background: 'var(--brand-primary)' }}>
      <Hero />
      <DesignShowcase />

      {/* Worlds */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <span className="kh-d-eyebrow">{t.home.collectionsEyebrow}</span>
            <h2 className="mt-2 text-2xl sm:text-4xl" style={{ fontFamily: "'Rakkas', var(--brand-font-body)", color: 'var(--brand-on-primary)' }}>{t.home.collectionsTitle}</h2>
            <p className="mt-2" style={{ color: '#A89F8C' }}>{t.home.collectionsSub}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => <DarkCollectionCard key={c.id} collection={c} />)}
          <DarkCommunityCard />
        </div>
      </section>

      {/* Custom CTA — compact strip above the footer */}
      <section style={{ background: '#1C1814', borderTop: '1px solid #322C25' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid gap-6 md:grid-cols-2 items-center">
            <div>
              <span className="kh-d-eyebrow">{t.home.customEyebrow}</span>
              <h2 className="mt-2 text-2xl sm:text-3xl" style={{ fontFamily: "'Rakkas', var(--brand-font-body)", color: 'var(--brand-on-primary)' }}>{t.home.customTitle}</h2>
              <p className="mt-3 max-w-md text-sm sm:text-base" style={{ color: '#A89F8C' }}>{t.home.customSub}</p>
              <Link to="/custom" className="kh-btn-mark kh-btn-mark-brick mt-6 !text-[14px]">{t.home.customCta}</Link>
            </div>
            <div className="relative p-8 sm:p-12 flex items-center justify-center kh-frame-rough kh-paint-stroke">
              <span className="text-2xl sm:text-4xl text-center leading-tight" style={{ fontFamily: "'Rakkas', var(--brand-font-body)", color: 'var(--brand-on-primary)' }}>
                {lang === 'ar' ? 'جملتك هون' : 'your phrase here'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
