import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { BRAND_ASSETS, INK_FILTER } from '@/lib/brandAssets';
import { DotsMark } from '@/components/Brand';

export default function Footer() {
  const { t, lang } = useI18n();
  const line = 'rgba(251,246,235,.16)';
  const muted = 'rgba(251,246,235,.6)';
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
          </div>
          <div>
            <h4 className="kh-eyebrow mb-5" style={{ color: 'var(--paper)' }}>Shop</h4>
            <ul className="space-y-2 text-sm" style={{ color: muted }}>
              <li><Link to="/shop" className="hover:text-[#D4ED0B] transition-colors">{t.nav.shop}</Link></li>
              <li><Link to="/drop" className="hover:text-[#D4ED0B] transition-colors">{t.nav.drop}</Link></li>
              <li><Link to="/collections" className="hover:text-[#D4ED0B] transition-colors">{t.nav.collections}</Link></li>
              <li><Link to="/custom" className="hover:text-[#D4ED0B] transition-colors">{t.nav.custom}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="kh-eyebrow mb-5" style={{ color: 'var(--paper)' }}>Help</h4>
            <ul className="space-y-2 text-sm" style={{ color: muted }}>
              <li><Link to="/track" className="hover:text-[#D4ED0B] transition-colors">{t.nav.track}</Link></li>
              <li><Link to="/faq" className="hover:text-[#D4ED0B] transition-colors">{t.nav.faq}</Link></li>
              <li><Link to="/contact" className="hover:text-[#D4ED0B] transition-colors">{t.nav.contact}</Link></li>
              <li><Link to="/story" className="hover:text-[#D4ED0B] transition-colors">{t.nav.story}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="kh-eyebrow mb-5" style={{ color: 'var(--paper)' }}>Social</h4>
            <ul className="space-y-2 text-sm" style={{ color: muted }}>
              <li><a href="https://instagram.com/kharbesh.lb" target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">Instagram</a></li>
              <li><a href="https://tiktok.com/@kharbesh.lb" target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">TikTok</a></li>
              <li><a href="https://wa.me/9611234567" target="_blank" rel="noreferrer" className="hover:text-[#D4ED0B] transition-colors">WhatsApp</a></li>
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
          <span>© {new Date().getFullYear()} Kharbesh. {t.footer.rights}</span>
          <span className="inline-flex items-center gap-2">
            {lang === 'ar' ? 'لبسك بيحكي عنك — Kharbesh it your way.' : 'Labsak byehki 3annak — Kharbesh it your way.'}
            <Link
              to="/login"
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
