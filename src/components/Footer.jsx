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
              لبسك بيحكي عنك — Kharbesh it your way.
            </p>
            <p className="mt-2 text-xs" style={{ color: 'rgba(251,246,235,.45)' }}>
              {lang === 'ar' ? 'فكر، مصنوع ومطبوع في لبنان.' : 'Thought, produced & printed in Lebanon.'}
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
          <span>لبسك بيحكي عنك — Kharbesh it your way. <Link to="/login" aria-label="Admin login" className="opacity-20 hover:opacity-80 transition-opacity select-none">·</Link></span>
        </div>
      </div>
    </footer>
  );
}
