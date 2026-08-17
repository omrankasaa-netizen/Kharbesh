import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useCart } from '@/lib/cart';
import { BrandLogo, IconSearch, IconBag, IconThreeDots } from '@/components/Brand';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function Navbar() {
  const { t, lang, toggle } = useI18n();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const links = [
    { to: '/shop', label: lang === 'ar' ? 'سلبة' : 'Salbeh', tip: 'Kharbesh Salbeh — خربش سلبة' },
    { to: '/drop', label: lang === 'ar' ? 'لبناني' : 'Lebneni', tip: 'Kharbesh Lebneni — خربش لبناني' },
    { to: '/collections', label: lang === 'ar' ? 'ثقافة' : 'Sa2afeh', tip: 'Kharbesh Sa2afeh — خربش ثقافة' },
    { to: '/custom', label: lang === 'ar' ? 'ع ذوقك' : '3a Zaw2ak', tip: 'Kharbesh 3a Zaw2ak — خربش ع ذوقك' },
  ];

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur" style={{ background: 'rgba(20,18,16,0.92)', borderBottom: '1px solid #322C25' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="shrink-0" aria-label="Kharbesh home">
            <BrandLogo tone="cream" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6" aria-label="Primary">
            {links.map((l) => (
              <Tooltip key={l.to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={l.to}
                    style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 500 }}
                    className={({ isActive }) =>
                      `text-[13px] uppercase tracking-[0.06em] transition-colors ${isActive ? 'text-[var(--brand-on-primary)]' : 'text-[#A89F8C] hover:text-[var(--brand-on-primary)]'}`
                    }
                  >
                    {l.label}
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={10} className="kh-tooltip-cream font-semibold">
                  {l.tip}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={toggle} className="kh-d-btn-text !text-[13px] !px-2" aria-label="Toggle language">
              {lang === 'en' ? 'ع' : 'EN'}
            </button>
            <Link to="/track" className="hidden sm:inline-flex kh-d-btn-text !text-[13px] !px-2">{t.nav.track}</Link>
            <Link to="/cart" className="relative inline-flex items-center justify-center w-10 h-10 transition-colors" style={{ color: 'var(--brand-on-primary)' }} aria-label={t.nav.cart}>
              <IconBag />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--brand-accent)] text-[10px] w-5 h-5 inline-flex items-center justify-center rounded-full" style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {count}
                </span>
              )}
            </Link>
            <button className="lg:hidden inline-flex items-center justify-center w-10 h-10" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open} style={{ color: 'var(--brand-on-primary)' }}>
              <IconThreeDots size={20} />
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden pb-4 pt-4" style={{ borderTop: '1px solid #322C25' }}>
            <form onSubmit={onSearch} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A89F8C' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.nav.search}
                  className="w-full h-11 pl-10 pr-3 rounded-md text-sm focus:outline-none"
                  style={{ background: '#221E19', border: '1px solid #322C25', color: 'var(--brand-on-primary)' }}
                />
              </div>
              <button type="submit" className="kh-d-btn-primary !px-4">{t.nav.search}</button>
            </form>
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 600 }}
                  className={({ isActive }) =>
                    `text-sm uppercase tracking-[0.06em] py-2 ${isActive ? 'text-[var(--brand-on-primary)]' : 'text-[#A89F8C]'}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <Link to="/track" onClick={() => setOpen(false)} className="text-sm uppercase tracking-[0.06em] py-2 text-[#A89F8C]" style={{ fontFamily: 'var(--brand-font-body)', fontWeight: 600 }}>{t.nav.track}</Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
