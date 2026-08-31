import React from 'react';
import { Outlet, useLocation } from 'react-router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import ConsentBanner from '@/components/ConsentBanner';
import { trackPageView } from '@/lib/metaPixel';
import { CatalogProvider, useSiteSettings } from '@/lib/useCatalog.jsx';
import { useI18n } from '@/lib/i18n';
import { Scribble } from '@/components/Brand';

function AnnouncementBanner() {
  const { settings } = useSiteSettings();
  const { lang } = useI18n();
  if (!settings?.bannerEnabled) return null;
  const text = lang === 'ar' ? settings.bannerAr : settings.bannerEn;
  if (!text) return null;
  return (
    <div className="text-center text-sm py-2 px-4" style={{ background: 'var(--brand-accent)', color: 'var(--on-lime)' }}>
      {text}
    </div>
  );
}

/** Full-storefront maintenance gate. Admin routes are exempt (`/admin/*`)
 * so the owner can always sign in and flip this back off — a maintenance
 * flag that could lock out its own off-switch would be a launch-day trap. */
function MaintenanceGate({ children }) {
  const { settings, loading } = useSiteSettings();
  const { pathname } = useLocation();
  const { t } = useI18n();
  const isAdminRoute = pathname.startsWith('/admin');

  if (!loading && settings?.maintenance && !isAdminRoute) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ background: 'var(--background)' }}>
        <Scribble width={100} />
        <h1 className="mt-6 font-heading text-4xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.common.maintenanceTitle}</h1>
        <p className="mt-3 text-muted-foreground max-w-md">{t.common.maintenanceBody}</p>
      </div>
    );
  }
  return children;
}

/** Fires a deduplicated Meta PageView (browser + CAPI twin) on every
 * client-side route change — Meta requires PageView on every page. */
function RoutePageViewTracker() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    trackPageView();
  }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <CatalogProvider>
      <MaintenanceGate>
        <div className="min-h-screen flex flex-col bg-background">
          <AnnouncementBanner />
          <Navbar />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
          <WhatsAppButton />
          <ConsentBanner />
          <RoutePageViewTracker />
        </div>
      </MaintenanceGate>
    </CatalogProvider>
  );
}
