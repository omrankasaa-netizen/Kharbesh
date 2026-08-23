import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Route, Routes } from 'react-router';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import { I18nProvider } from '@/lib/i18n';
import { CartProvider } from '@/lib/cart';
import Layout from '@/components/Layout';
import AdminGuard from '@/components/AdminGuard';

// Route-level code splitting: each page ships as its own chunk, so a
// storefront visitor only ever downloads the JS for the page they're on
// (never the admin back office), and a product-page ad click doesn't pull
// in Home, Checkout, or any other unrelated route. Critical on weak 4G.
const PageNotFound = lazy(() => import('./lib/PageNotFound'));
const Home = lazy(() => import('@/pages/Home'));
const ShopAll = lazy(() => import('@/pages/ShopAll'));
const NewDrop = lazy(() => import('@/pages/NewDrop'));
const Collections = lazy(() => import('@/pages/Collections'));
const CollectionPage = lazy(() => import('@/pages/CollectionPage'));
const ProductPage = lazy(() => import('@/pages/ProductPage'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const CustomDesign = lazy(() => import('@/pages/CustomDesign'));
const OurStory = lazy(() => import('@/pages/OurStory'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Contact = lazy(() => import('@/pages/Contact'));
const TrackOrder = lazy(() => import('@/pages/TrackOrder'));
const Login = lazy(() => import('@/pages/Login'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'));
const AdminInventory = lazy(() => import('@/pages/admin/AdminInventory'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminBulkImport = lazy(() => import('@/pages/admin/AdminBulkImport'));
const AdminFactory = lazy(() => import('@/pages/admin/AdminFactory'));
const AdminFinancials = lazy(() => import('@/pages/admin/AdminFinancials'));
const AdminPromotions = lazy(() => import('@/pages/admin/AdminPromotions'));
const AdminStaff = lazy(() => import('@/pages/admin/AdminStaff'));
const CustomerCRM = lazy(() => import('@/pages/admin/CustomerCRM'));
const StoreAnalytics = lazy(() => import('@/pages/admin/StoreAnalytics'));
const SiteSettings = lazy(() => import('@/pages/admin/SiteSettings'));
const Profile = lazy(() => import('@/pages/Profile'));
const Lookbook = lazy(() => import('@/pages/Lookbook'));
const ProductionTimeline = lazy(() => import('@/pages/ProductionTimeline'));
const Journal = lazy(() => import('@/pages/Journal'));
const SizingGuide = lazy(() => import('@/pages/SizingGuide'));
const Archive = lazy(() => import('@/pages/Archive'));
const ReturnsPolicy = lazy(() => import('@/pages/ReturnsPolicy'));
const ShippingInfo = lazy(() => import('@/pages/ShippingInfo'));
const DesignPhilosophy = lazy(() => import('@/pages/DesignPhilosophy'));

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
          <Route path="/admin/products" element={<AdminGuard minRole="staff"><AdminProducts /></AdminGuard>} />
          <Route path="/admin/bulk-import" element={<AdminGuard minRole="staff"><AdminBulkImport /></AdminGuard>} />
          <Route path="/admin/inventory" element={<AdminGuard minRole="staff"><AdminInventory /></AdminGuard>} />
          <Route path="/admin/factory" element={<AdminGuard minRole="staff"><AdminFactory /></AdminGuard>} />
          <Route path="/admin/customers" element={<AdminGuard minRole="admin"><CustomerCRM /></AdminGuard>} />
          <Route path="/admin/analytics" element={<AdminGuard minRole="admin"><StoreAnalytics /></AdminGuard>} />
          <Route path="/admin/settings" element={<AdminGuard minRole="admin"><SiteSettings /></AdminGuard>} />
          <Route path="/admin/promotions" element={<AdminGuard minRole="admin"><AdminPromotions /></AdminGuard>} />
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
    <AuthProvider>
      <I18nProvider>
        <CartProvider>
          <ScrollToTop />
          <AuthenticatedApp />
        </CartProvider>
      </I18nProvider>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
