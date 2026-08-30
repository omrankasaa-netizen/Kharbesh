import React, { useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/khClient';
import { BRAND_ASSETS, INK_FILTER } from '@/lib/brandAssets';
import { DotsMark } from '@/components/Brand';
import { useSiteSettings } from '@/lib/useCatalog.jsx';
import { whatsappLink } from '@/lib/whatsapp';

// Hard fallbacks match the brand's real sticker/storefront contact details
// (kharbesh961.com, +961 76 465367, IG/FB @kharbeshh) so the footer never
// shows a broken link even before settings finish loading.
const DEFAULT_CONTACT = { whatsappNumber: '96176465367', instagramHandle: 'kharbeshh', facebookHandle: 'Kharbeshh' };

export default function Footer() {
  const { t, lang } = useI18n();
  const { settings } = useSiteSettings();
  const contact = { ...DEFAULT_CONTACT, ...(settings?.contact || {}) };
  const line = 'rgba(251,246,235,.16)';
  const muted = 'rgba(251,246,235,.6)';
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState('idle'); // idle | invalid | sending | done
  const [newsletterReset, setNewsletterReset] = useState(null);

  const subscribe = async (e) => {
    e.preventDefault();
    if (newsletterReset) { clearTimeout(newsletterReset); setNewsletterReset(null); }
    const email = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
      setNewsletterState('invalid');
      setNewsletterReset(setTimeout(() => setNewsletterState((s) => (s === 'invalid' ? 'idle' : s)), 4000));
      return;
    }
    setNewsletterState('sending');
    try {
      await base44.entities.Newsletter.subscribe(email, lang);
      setNewsletterState('done');
      setNewsletterEmail('');
    } catch {
      // Signup is fire-and-forget for the visitor — don't flash an error for
      // a hiccup; the list stays intact either way.
      setNewsletterState('done');
      setNewsletterEmail('');
    }
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
              {lang === 'ar' ? 'فكر، مصنوع ومطبوع في لبنان.' : 'Mfakkar fiha, m3amle, w matbou3a fi Lebnan.'}
            </p>
            <DotsMark lime className="mt-6" />
            <div className="mt-8 max-w-sm">
              <h4 className="kh-eyebrow mb-2">{t.footer.newsletterTitle}</h4>
              <p className="text-xs mb-3" style={{ color: muted }}>{t.footer.newsletterSub}</p>
              {newsletterState === 'done' ? (
                <p className="text-sm font-bold" style={{ color: '#D4ED0B' }} role="status">{t.footer.newsletterSuccess}</p>
              ) : (
                <form onSubmit={subscribe} noValidate className="flex gap-2">
                  <label className="sr-only" htmlFor="kh-newsletter-email">{t.footer.newsletterPlaceholder}</label>
                  <input
                    id="kh-newsletter-email"
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t.footer.newsletterPlaceholder}
                    className="kh-input !bg-transparent flex-1 min-w-0"
                    style={{ color: 'var(--paper)', borderColor: line }}
                    aria-invalid={newsletterState === 'invalid'}
                  />
                  <button
                    type="submit"
                    disabled={newsletterState === 'sending'}
                    className="shrink-0 font-bold text-sm px-4 py-2 rounded-sm transition-colors"
                    style={{ background: '#D4ED0B', color: 'var(--ink)' }}
                  >
                    {newsletterState === 'sending' ? t.common.loading : t.footer.newsletterCta}
                  </button>
                </form>
              )}
              {newsletterState === 'invalid' && (
                <p className="text-xs mt-2" style={{ color: '#ff8a7a' }} role="alert">{t.footer.newsletterInvalid}</p>
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
            <a
              href="https://ops-shift.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(251,246,235,.45)' }}
            >
              {lang === 'ar' ? 'تصميم وتطوير' : 'Developed by'}
              <span style={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'rgba(251,246,235,.6)' }}>
                OPS<span style={{ color: '#D4ED0B', fontWeight: 300 }}>/</span>SHFT
              </span>
            </a>
          </span>
          <span className="inline-flex items-center gap-2">
            {lang === 'ar' ? 'لبسك بيحكي عنك — Kharbesh it your way.' : 'Labsak byehki 3annak — Kharbesh it your way.'}
            <Link
              to="/admin/login"
              aria-label="Admin login"
              title="Admin"
              className="inline-flex items-center justify-center opacity-15 hover:opacity-90 hover:text-[#D4ED0B] transition-opacity select-none"
              style={{ width: 16, height: 16 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
