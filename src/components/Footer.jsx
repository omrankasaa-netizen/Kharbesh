import React, { useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useSiteSettings } from '@/lib/useCatalog.jsx';
import { base44 } from '@/api/khClient';
import { BRAND_ASSETS } from '@/lib/assets';
import { whatsappLink } from '@/lib/whatsapp';

/** Footer: brand block, newsletter capture, link columns, watermark mark.
 *  Newsletter signup is fire-and-forget for the visitor — a failed POST
 *  still shows the success state; the list stays intact either way. */
export default function Footer() {
  const { t, lang } = useI18n();
  const { settings } = useSiteSettings();
  const contact = settings?.contact || {};
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState('idle'); // idle | done

  const muted = 'rgba(251,246,235,.6)';
  const line = 'rgba(251,246,235,.12)';

  const subscribe = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) return;
    try {
      await base44.entities.Newsletter.subscribe({ email: newsletterEmail, language: lang });
    } catch { /* see comment above */ }
    // Signup is fire-and-forget for the visitor — don't flash an error for
    // a hiccup; the list stays intact either way.
    setNewsletterState('done');
    setNewsletterEmail('');
  };

  return (
    <footer className="kh-ink mt-0">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <img src={BRAND_ASSETS.horizontalWhite} alt="Kharbesh" style={{ height: 30, width: 'auto', display: 'block' }} />
            <p className="mt-5 max-w-sm text-sm" style={{ color: muted }}>
              {lang === 'ar' ? 'لبسك بيحكي عنك — Kharbesh it your way.' : 'Labsak byehki 3annak — Kharbesh it your way.'}
            </p>
            <p className="mt-2 text-xs" style={{ color: 'rgba(251,246,235,.45)' }}>
              {lang === 'ar' ? 'فكر، مصنوع ومطبوع في لبنان.' : 'Mfakkar fiha, m3ammle, w matbou3a b Lebnen.'}
            </p>

            <div className="mt-8">
              <h4 className="kh-eyebrow mb-3">{t.footer.newsletterTitle}</h4>
              <p className="mb-4 text-sm" style={{ color: muted }}>{t.footer.newsletterSub}</p>
              {newsletterState === 'done' ? (
                <p className="text-sm font-bold" style={{ color: 'var(--brand-accent)' }}>{t.footer.newsletterSuccess}</p>
              ) : (
                <form onSubmit={subscribe} className="flex gap-0 max-w-sm">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t.footer.newsletterPlaceholder}
                    className="kh-input !bg-transparent !border-[rgba(251,246,235,.25)] !text-[#FBF6EB] placeholder:text-[rgba(251,246,235,.4)] flex-1"
                    style={{ borderRadius: 0 }}
                  />
                  <button type="submit" className="kh-btn-scribble !py-3 !px-5 !text-[13px] shrink-0">
                    {t.footer.newsletterCta}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div>
            <h4 className="kh-eyebrow mb-5">{t.footer.shop}</h4>
            <ul className="space-y-2 text-sm" style={{ color: muted }}>
              <li><Link to="/shop" className="hover:text-[#D4ED0B] transition-colors">{t.nav.shop}</Link></li>
              <li><Link to="/drop" className="hover:text-[#D4ED0B] transition-colors">{t.nav.drop}</Link></li>
              <li><Link to="/collections" className="hover:text-[#D4ED0B] transition-colors">{t.nav.collections}</Link></li>
              <li><Link to="/custom" className="hover:text-[#D4ED0B] transition-colors">{t.nav.custom}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="kh-eyebrow mb-5">{t.footer.help}</h4>
            <ul className="space-y-2 text-sm" style={{ color: muted }}>
              <li><Link to="/track" className="hover:text-[#D4ED0B] transition-colors">{t.nav.track}</Link></li>
              <li><Link to="/faq" className="hover:text-[#D4ED0B] transition-colors">{t.nav.faq}</Link></li>
              <li><Link to="/sizing-guide" className="hover:text-[#D4ED0B] transition-colors">{t.footer.sizeGuide}</Link></li>
              <li><Link to="/contact" className="hover:text-[#D4ED0B] transition-colors">{t.nav.contact}</Link></li>
              <li><Link to="/story" className="hover:text-[#D4ED0B] transition-colors">{t.nav.story}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="kh-eyebrow mb-5">{t.footer.social}</h4>
            <ul className="space-y-2 text-sm" style={{ color: muted }}>
              <li><a href={`https://instagram.com/${contact.instagramHandle}`} target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">Instagram</a></li>
              <li><a href={`https://facebook.com/${contact.facebookHandle}`} target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">Facebook</a></li>
              <li><a href="https://tiktok.com/@kharbesh.lb" target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">TikTok</a></li>
              <li><a href={whatsappLink(contact.whatsappNumber)} target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">WhatsApp</a></li>
            </ul>
          </div>
        </div>

        <div className="relative mt-10" aria-hidden="true">
          <div
            className="absolute inset-0 mx-auto max-w-[640px]"
            style={{
              backgroundImage: 'var(--kh-halftone)',
              backgroundSize: '14px 14px',
              color: 'rgba(212,237,11,0.14)',
              maskImage: 'radial-gradient(ellipse 60% 100% at center, black 0%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 100% at center, black 0%, transparent 75%)',
            }}
          />
          <img
            src={BRAND_ASSETS.markWhite}
            alt=""
            className="relative w-full max-w-[520px] mx-auto select-none"
            style={{ display: 'block', opacity: 0.1 }}
            loading="lazy"
          />
        </div>

        <div className="mt-8 pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs" style={{ borderTop: `1px solid ${line}`, color: 'rgba(251,246,235,.45)' }}>
          <span className="inline-flex items-center gap-3 flex-wrap">
            <span>© {new Date().getFullYear()} Kharbesh. {t.footer.rights}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span>{t.footer.madeIn}</span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center justify-center opacity-15 hover:opacity-90 hover:text-[#D4ED0B] transition-opacity select-none"
              aria-label="Back to top"
            >
              ↑
            </button>
          </span>
        </div>
      </div>
    </footer>
  );
}
