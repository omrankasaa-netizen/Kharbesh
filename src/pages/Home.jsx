import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCollections } from '@/lib/useCatalog.jsx';
import Hero from '@/components/home/Hero';
import DesignShowcase from '@/components/home/DesignShowcase';
import DarkCollectionCard from '@/components/home/DarkCollectionCard';
import DarkCommunityCard from '@/components/home/DarkCommunityCard';
import { DotsMark } from '@/components/Brand';

export default function Home() {
  const { t, lang } = useI18n();
  const { collections } = useCollections();

  return (
    <div style={{ background: 'var(--paper)' }}>
      <Hero />
      <DesignShowcase />

      {/* Worlds */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <span className="kh-eyebrow">{t.home.collectionsEyebrow}</span>
            <h2 className={`kh-section-title mt-3 ${lang === 'ar' ? 'kh-section-title-ar' : ''}`} style={{ fontSize: 'clamp(22px, 2.8vw, 34px)' }}>{t.home.collectionsTitle}</h2>
            <p className="mt-3" style={{ color: 'var(--muted)' }}>{t.home.collectionsSub}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => <DarkCollectionCard key={c.id} collection={c} />)}
          <DarkCommunityCard />
        </div>
      </section>

      {/* Custom CTA — the ink band before the footer */}
      <section className="kh-ink mt-12" style={{ borderTop: '1px solid var(--ink)' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <span className="kh-eyebrow">{t.home.customEyebrow}</span>
              <h2 className="mt-4 text-2xl sm:text-3xl" style={{ fontFamily: "'Rakkas', var(--brand-font-body)", color: 'var(--paper)', lineHeight: 1.3 }}>{t.home.customTitle}</h2>
              <p className="mt-3 max-w-md text-sm sm:text-base" style={{ color: 'rgba(251,246,235,.62)' }}>{t.home.customSub}</p>
              <Link to="/custom" className="kh-d-btn-brick mt-7 !text-[14px]">{t.home.customCta}</Link>
            </div>
            <div className="relative p-8 sm:p-12 flex flex-col items-center justify-center gap-6 kh-paint-stroke" style={{ border: '1px solid rgba(251,246,235,.18)', borderRadius: 2 }}>
              <span className="text-2xl sm:text-4xl text-center leading-tight" style={{ fontFamily: "'Rakkas', var(--brand-font-body)", color: 'var(--paper)' }}>
                {lang === 'ar' ? 'جملتك هون' : 'your phrase here'}
              </span>
              <DotsMark lime />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
