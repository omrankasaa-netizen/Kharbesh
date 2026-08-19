import { Toaster } from "@/components/ui/toaster";
import { Route, Routes } from 'react-router';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import { I18nProvider } from '@/lib/i18n';
import { CartProvider } from '@/lib/cart';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import ShopAll from '@/pages/ShopAll';
import NewDrop from '@/pages/NewDrop';
import Collections from '@/pages/Collections';
import CollectionPage from '@/pages/CollectionPage';
import ProductPage from '@/pages/ProductPage';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import OrderConfirmation from '@/pages/OrderConfirmation';
import CustomDesign from '@/pages/CustomDesign';
import OurStory from '@/pages/OurStory';
import FAQ from '@/pages/FAQ';
import Contact from '@/pages/Contact';
import TrackOrder from '@/pages/TrackOrder';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import AdminGuard from '@/components/AdminGuard';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminInventory from '@/pages/admin/AdminInventory';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminFactory from '@/pages/admin/AdminFactory';
import AdminFinancials from '@/pages/admin/AdminFinancials';
import AdminStaff from '@/pages/admin/AdminStaff';
import CustomerCRM from '@/pages/admin/CustomerCRM';
import StoreAnalytics from '@/pages/admin/StoreAnalytics';
import SiteSettings from '@/pages/admin/SiteSettings';
import Profile from '@/pages/Profile';
import Lookbook from '@/pages/Lookbook';
import ProductionTimeline from '@/pages/ProductionTimeline';
import Journal from '@/pages/Journal';
import SizingGuide from '@/pages/SizingGuide';
import Archive from '@/pages/Archive';
import ReturnsPolicy from '@/pages/ReturnsPolicy';
import ShippingInfo from '@/pages/ShippingInfo';
import DesignPhilosophy from '@/pages/DesignPhilosophy';

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
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
        <Route path="/admin/inventory" element={<AdminGuard minRole="staff"><AdminInventory /></AdminGuard>} />
        <Route path="/admin/factory" element={<AdminGuard minRole="staff"><AdminFactory /></AdminGuard>} />
        <Route path="/admin/customers" element={<AdminGuard minRole="admin"><CustomerCRM /></AdminGuard>} />
        <Route path="/admin/analytics" element={<AdminGuard minRole="admin"><StoreAnalytics /></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard minRole="admin"><SiteSettings /></AdminGuard>} />
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
