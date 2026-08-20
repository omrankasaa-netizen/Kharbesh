import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { base44 } from '@/api/khClient';
import { useI18n } from '@/lib/i18n';

/* Scheduled homepage promo strip — only renders when marketing has an active
   campaign row (see Admin > Promotions). Dark kh-ink band, matches the
   Zaw2akBand treatment so it reads as part of the site, not a bolted-on ad. */
export default function CampaignBanner() {
  const { lang } = useI18n();
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    base44.entities.Promotions.activeCampaigns()
      .then((rows) => { if (!cancelled) setCampaigns(rows || []); })
      .catch(() => { if (!cancelled) setCampaigns([]); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  if (!loaded || campaigns.length === 0) return null;

  return (
    <section className="kh-ink">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 divide-y" style={{ borderColor: 'rgba(251,246,235,.14)' }}>
        {campaigns.map((c) => {
          const title = lang === 'ar' && c.title_ar ? c.title_ar : c.title_en;
          const subtitle = lang === 'ar' ? c.subtitle_ar : c.subtitle_en;
          const ctaLabel = (lang === 'ar' ? c.cta_label_ar : c.cta_label_en) || (lang === 'ar' ? 'شوف العرض ←' : 'See the offer →');
          const to = c.link_url || '/shop';
          return (
            <div key={c.id} className="py-6 sm:py-7 flex flex-wrap items-center justify-between gap-4" style={{ borderColor: 'rgba(251,246,235,.14)' }}>
              <div>
                <h3 className="text-xl sm:text-2xl" style={{ fontFamily: "'Rakkas', 'IBM Plex Sans Arabic', sans-serif", color: 'var(--paper)', lineHeight: 1.3 }}>
                  {title}
                </h3>
                {subtitle && <p className="mt-1.5 text-sm max-w-lg" style={{ color: 'rgba(251,246,235,.72)' }}>{subtitle}</p>}
              </div>
              <Link to={to} className="kh-d-btn-brick shrink-0 !text-[13px]">{ctaLabel}</Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
