import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { BrandLogo, Scribble } from '@/components/Brand';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 bg-secondary text-secondary-foreground">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-[--brand-on-primary]"><BrandLogo /></div>
            <p className="mt-4 max-w-sm text-sm" style={{ color: '#A89F8C' }}>{t.footer.tagline}</p>
            <Scribble width={80} className="mt-6" />
            <p className="mt-6 text-xs" style={{ color: '#8A8170' }}>{t.footer.madeIn}</p>
          </div>
          <div>
            <h4 className="font-heading text-[11px] tracking-[0.12em] uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-accent)' }}>Shop</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#A89F8C' }}>
              <li><Link to="/shop" className="hover:text-white">{t.nav.shop}</Link></li>
              <li><Link to="/drop" className="hover:text-white">{t.nav.drop}</Link></li>
              <li><Link to="/collections" className="hover:text-white">{t.nav.collections}</Link></li>
              <li><Link to="/custom" className="hover:text-white">{t.nav.custom}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-[11px] tracking-[0.12em] uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-accent)' }}>Help</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#A89F8C' }}>
              <li><Link to="/track" className="hover:text-white">{t.nav.track}</Link></li>
              <li><Link to="/faq" className="hover:text-white">{t.nav.faq}</Link></li>
              <li><Link to="/contact" className="hover:text-white">{t.nav.contact}</Link></li>
              <li><Link to="/story" className="hover:text-white">{t.nav.story}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-[#322C25] flex flex-col sm:flex-row justify-between gap-2 text-xs" style={{ color: '#8A8170' }}>
          <span>© {new Date().getFullYear()} Kharbesh. {t.footer.rights}</span>
          <span>خربش — Lebanon, but wearable.</span>
        </div>
      </div>
    </footer>
  );
}
