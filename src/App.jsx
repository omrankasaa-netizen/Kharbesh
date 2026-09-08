import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Route, Routes } from 'react-router';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import { I18nProvider } from '@/lib/i18n';
import { CartProvider } from '@/lib/cart';
import Layout from '@/components/Layout';
import AdminGuard from '@/components/AdminGuard';
import RouteErrorBoundary from '@/components/RouteErrorBoundary';
import { lazyRetry } from '@/lib/lazyRetry';

// Route-level code splitting: each page ships as its own chunk, so a
// storefront visitor only ever downloads the JS for the page they're on
// (never the admin back office), and a product-page ad click doesn't pull
// in Home, Checkout, or any other unrelated route. Critical on weak 4G.
//
// Every route uses lazyRetry() instead of React.lazy() directly: on weak
// 4G (or right after a deploy, when a stale tab's chunk hash no longer
// exists on the server), a chunk fetch can fail outright. lazyRetry()
// retries transient failures and falls back to one automatic reload
// instead of leaving the visitor on a stuck spinner until they refresh
// manually — see src/lib/lazyRetry.js.
const PageNotFound = lazyRetry(() => import('./lib/PageNotFound'));
const Home = lazyRetry(() => import('@/pages/Home'));
const ShopAll = lazyRetry(() => import('@/pages/ShopAll'));
const NewDrop = lazyRetry(() => import('@/pages/NewDrop'));
const Collections = lazyRetry(() => import('@/pages/Collections'));
const CollectionPage = lazyRetry(() => import('@/pages/CollectionPage'));
const ProductPage = lazyRetry(() => import('@/pages/ProductPage'));
const Cart = lazyRetry(() => import('@/pages/Cart'));
const Checkout = lazyRetry(() => import('@/pages/Checkout'));
const OrderConfirmation = lazyRetry(() => import('@/pages/OrderConfirmation'));
const CustomDesign = lazyRetry(() => import('@/pages/CustomDesign'));
const OurStory = lazyRetry(() => import('@/pages/OurStory'));
const FAQ = lazyRetry(() => import('@/pages/FAQ'));
const Contact = lazyRetry(() => import('@/pages/Contact'));
const TrackOrder = lazyRetry(() => import('@/pages/TrackOrder'));
const Login = lazyRetry(() => import('@/pages/Login'));
const AdminLogin = lazyRetry(() => import('@/pages/AdminLogin'));
const AdminDashboard = lazyRetry(() => import('@/pages/admin/AdminDashboard'));
const AdminOrders = lazyRetry(() => import('@/pages/admin/AdminOrders'));
const AdminCustomRequests = lazyRetry(() => import('@/pages/admin/AdminCustomRequests'));
const AdminInventory = lazyRetry(() => import('@/pages/admin/AdminInventory'));
const AdminProducts = lazyRetry(() => import('@/pages/admin/AdminProducts'));
const AdminBulkImport = lazyRetry(() => import('@/pages/admin/AdminBulkImport'));
const AdminDriveImport = lazyRetry(() => import('@/pages/admin/AdminDriveImport'));
const AdminLocalImport = lazyRetry(() => import('@/pages/admin/AdminLocalImport'));
const AdminBulkDesignUpload = lazyRetry(() => import('@/pages/admin/AdminBulkDesignUpload'));
const AdminFactory = lazyRetry(() => import('@/pages/admin/AdminFactory'));
const AdminMessages = lazyRetry(() => import('@/pages/admin/AdminMessages'));
const AdminFinancials = lazyRetry(() => import('@/pages/admin/AdminFinancials'));
const AdminPromotions = lazyRetry(() => import('@/pages/admin/AdminPromotions'));
const AdminLoyalty = lazyRetry(() => import('@/pages/admin/AdminLoyalty'));
const AdminStaff = lazyRetry(() => import('@/pages/admin/AdminStaff'));
const CustomerCRM = lazyRetry(() => import('@/pages/admin/CustomerCRM'));
const StoreAnalytics = lazyRetry(() => import('@/pages/admin/StoreAnalytics'));
const SiteSettings = lazyRetry(() => import('@/pages/admin/SiteSettings'));
const Profile = lazyRetry(() => import('@/pages/Profile'));
const Lookbook = lazyRetry(() => import('@/pages/Lookbook'));
const ProductionTimeline = lazyRetry(() => import('@/pages/ProductionTimeline'));
const Journal = lazyRetry(() => import('@/pages/Journal'));
const SizingGuide = lazyRetry(() => import('@/pages/SizingGuide'));
const Archive = lazyRetry(() => import('@/pages/Archive'));
const ReturnsPolicy = lazyRetry(() => import('@/pages/ReturnsPolicy'));
const ShippingInfo = lazyRetry(() => import('@/pages/ShippingInfo'));
const DesignPhilosophy = lazyRetry(() => import('@/pages/DesignPhilosophy'));

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--background)' }}>
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  // Deliberately NOT gating the whole route tree on isLoadingAuth: that
  // would force every visitor — including the ~95%+ who are anonymous
  // shoppers — to wait on a network round-trip to "who am I" before a
  // single pixel of the storefront renders. Devastating on weak 4G. Routes
  // that actually need to know auth state before rendering (AdminGuard,
  // Profile) already read isLoadingAuth/user themselves and show their own
  // lightweight loading/guest state, so the storefront can render instantly
  // while the auth check resolves in the background.
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<ShopAll />} />
          <Route path="/drop" element={<NewDrop />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:slug" element={<CollectionPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderConfirmation />} />
          <Route path="/custom" element={<CustomDesign />} />
          <Route path="/story" element={<OurStory />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminGuard minRole="staff"><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/orders" element={<AdminGuard minRole="staff"><AdminOrders /></AdminGuard>} />
          <Route path="/admin/custom-requests" element={<AdminGuard minRole="staff"><AdminCustomRequests /></AdminGuard>} />
          <Route path="/admin/products" element={<AdminGuard minRole="staff"><AdminProducts /></AdminGuard>} />
          <Route path="/admin/bulk-import" element={<AdminGuard minRole="staff"><AdminBulkImport /></AdminGuard>} />
          <Route path="/admin/drive-import" element={<AdminGuard minRole="staff"><AdminDriveImport /></AdminGuard>} />
          <Route path="/admin/local-import" element={<AdminGuard minRole="staff"><AdminLocalImport /></AdminGuard>} />
          <Route path="/admin/bulk-design-upload" element={<AdminGuard minRole="staff"><AdminBulkDesignUpload /></AdminGuard>} />
          <Route path="/admin/inventory" element={<AdminGuard minRole="staff"><AdminInventory /></AdminGuard>} />
          <Route path="/admin/factory" element={<AdminGuard minRole="staff"><AdminFactory /></AdminGuard>} />
          <Route path="/admin/messages" element={<AdminGuard minRole="staff"><AdminMessages /></AdminGuard>} />
          <Route path="/admin/customers" element={<AdminGuard minRole="admin"><CustomerCRM /></AdminGuard>} />
          <Route path="/admin/analytics" element={<AdminGuard minRole="admin"><StoreAnalytics /></AdminGuard>} />
          <Route path="/admin/settings" element={<AdminGuard minRole="admin"><SiteSettings /></AdminGuard>} />
          <Route path="/admin/promotions" element={<AdminGuard minRole="admin"><AdminPromotions /></AdminGuard>} />
          <Route path="/admin/loyalty" element={<AdminGuard minRole="admin"><AdminLoyalty /></AdminGuard>} />
          <Route path="/admin/financials" element={<AdminGuard minRole="super_admin"><AdminFinancials /></AdminGuard>} />
          <Route path="/admin/staff" element={<AdminGuard minRole="super_admin"><AdminStaff /></AdminGuard>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/lookbook" element={<Lookbook />} />
          <Route path="/production-timeline" element={<ProductionTimeline />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/sizing-guide" element={<SizingGuide />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/returns-policy" element={<ReturnsPolicy />} />
          <Route path="/shipping-info" element={<ShippingInfo />} />
          <Route path="/design-philosophy" element={<DesignPhilosophy />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <RouteErrorBoundary>
      <AuthProvider>
        <I18nProvider>
          <CartProvider>
            <ScrollToTop />
            <AuthenticatedApp />
          </CartProvider>
        </I18nProvider>
        <Toaster />
      </AuthProvider>
    </RouteErrorBoundary>
  );
}

export default App;
