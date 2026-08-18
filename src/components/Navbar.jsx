import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCart } from '@/lib/cart';
import { BrandLogo, IconBag, DotsMark } from '@/components/Brand';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function Navbar() {
  const { t, lang, toggle } = useI18n();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: '/shop', label: lang === 'ar' ? 'تسوّق' : 'Shop', tip: lang === 'ar' ? 'كل القطع' : 'Every piece', primary: true },
    { to: '/shop', label: lang === 'ar' ? 'سلبة' : 'Salbeh', tip: 'Kharbesh Salbeh — خربش سلبة' },
    { to: '/drop', label: lang === 'ar' ? 'لبناني' : 'Lebneni', tip: 'Kharbesh Lebneni — خربش لبناني' },
    { to: '/collections', label: lang === 'ar' ? 'ثقافة' : 'Sa2afeh', tip: 'Kharbesh Sa2afeh — خربش ثقافة' },
    { to: '/custom', label: lang === 'ar' ? 'ع ذوقك' : '3a Zaw2ak', tip: 'Kharbesh 3a Zaw2ak — خربش ع ذوقك' },
  ];

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-50 backdrop-blur" style={{ background: 'rgba(251,246,235,0.92)', borderBottom: '1px solid var(--line)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[72px] gap-4">
          <Link to="/" className="shrink-0" aria-label="Kharbesh home" onClick={() => setOpen(false)}>
            <BrandLogo tone="ink" className="!h-[38px]" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8" aria-label="Primary">
            {links.map((l, i) => (
              <Tooltip key={`${l.to}-${i}`}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={l.to}
                    end={l.to === '/shop' && l.primary}
                    className={({ isActive }) =>
                      `kh-nav-link inline-block ${isActive ? 'active' : ''} ${l.primary ? 'kh-nav-primary' : ''}`
                    }
                  >
                    {l.label}
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={14} className="kh-tooltip-cream font-semibold">
                  {l.tip}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-5">
            <button onClick={toggle} className="kh-nav-quiet" aria-label="Toggle language">
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
            <Link to="/track" className="hidden sm:inline-block kh-nav-quiet">{t.nav.track}</Link>
            <Link to="/cart" className="kh-nav-bag" aria-label={t.nav.cart}>
              <IconBag size={18} />
              <span>{lang === 'ar' ? `خربشة (${count})` : `Bag (${count})`}</span>
            </Link>
            <button className="lg:hidden kh-nav-bag" onClick={() => setOpen(true)} aria-label="Menu" aria-expanded={open}>
              <span>{lang === 'ar' ? 'القائمة' : 'Menu'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Full-screen editorial mobile menu — outside the blurred header so `fixed` anchors to the viewport */}
    {open && (
      <div className="fixed inset-0 z-[60] kh-menu-overlay" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between h-[72px] px-4 sm:px-6" style={{ borderBottom: '1px solid var(--line)' }}>
            <BrandLogo tone="ink" className="!h-[34px]" />
            <button onClick={() => setOpen(false)} className="kh-nav-bag" aria-label="Close menu">
              <span>{lang === 'ar' ? 'سكّر' : 'Close'} ✕</span>
            </button>
          </div>
          <nav className="px-6 pt-10 flex flex-col" aria-label="Mobile">
            {links.map((l, i) => (
              <NavLink
                key={`${l.to}-m-${i}`}
                to={l.to}
                end={l.to === '/shop' && l.primary}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `kh-menu-item group ${isActive ? 'active' : ''}`}
              >
                <span className="kh-menu-index">0{i + 1}</span>
                <span className="kh-menu-word">{l.label}</span>
                <span className="kh-menu-tip">{l.tip}</span>
              </NavLink>
            ))}
            <NavLink to="/track" onClick={() => setOpen(false)} className="kh-menu-item group kh-menu-quiet">
              <span className="kh-menu-index">06</span>
              <span className="kh-menu-word">{t.nav.track}</span>
            </NavLink>
            <div className="mt-10 flex items-center justify-between">
              <button onClick={() => { toggle(); }} className="kh-nav-quiet">{lang === 'en' ? 'عربي' : 'ENGLISH'}</button>
              <DotsMark lime />
            </div>
          </nav>
          <p className="absolute bottom-8 left-6 right-6 text-xs" style={{ color: 'var(--muted)' }}>
            لبسك بيحكي عنك — Kharbesh it your way.
          </p>
      </div>
    )}
    </>
  );
}
