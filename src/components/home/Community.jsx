import React from 'react';
import CommunityCard from '@/components/CommunityCard';
import { useI18n } from '@/lib/i18n';
import { useSiteSettings } from '@/lib/useCatalog.jsx';

/* Community band — phrase submissions (CommunityCard, previously unused)
   next to the UGC/social card. Same dashed-lime tile styling, mobile-first
   stack like the other Home sections. */
export default function Community() {
  const { t } = useI18n();
  const { settings } = useSiteSettings();
  const handle = settings?.contact?.instagramHandle || 'kharbeshh';

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-12 sm:mt-16">
      <div className="grid gap-6 md:grid-cols-2">
        <CommunityCard />
        <div className="kh-card-community">
          <span className="kh-badge">{t.home.communityFollow.toUpperCase()}</span>
          <h3 className="kh-h">{t.home.communityTagTitle}</h3>
          <p className="kh-p">{t.home.communityTagSub}</p>
          <p className="kh-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
            @{handle} · #خربش_ع_ذوقك
          </p>
          <a
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noreferrer"
            className="kh-cta inline-block"
          >
            @{handle}
          </a>
        </div>
      </div>
    </section>
  );
}
