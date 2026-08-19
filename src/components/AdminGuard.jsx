import React from 'react';
import { Link, Outlet } from 'react-router';
import { useAuth } from '@/lib/AuthContext';
import { hasRole } from '@/api/khClient';
import AdminNav from '@/components/AdminNav';

/**
 * Route guard for the admin panel. Pass `minRole` ('staff' | 'admin' |
 * 'super_admin') per-route via the Route's `element` prop, e.g.
 * `<AdminGuard minRole="super_admin"><Financials /></AdminGuard>`.
 * Renders the shared admin nav once authorized.
 */
export default function AdminGuard({ minRole = 'staff', children }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <div className="max-w-[800px] mx-auto px-6 py-20 text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
        <p className="font-heading text-2xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>Admin only</p>
        <p className="text-muted-foreground mt-2">Log in to manage the store.</p>
        <Link to="/admin/login" className="kh-btn-text mt-4">Login</Link>
      </div>
    );
  }
  if (!hasRole(user, minRole)) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
        <p className="font-heading text-2xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>Access denied</p>
        <p className="text-muted-foreground mt-2">This area is above your role. ما إلي صلاحية هون.</p>
      </div>
    );
  }
  return (
    <>
      <AdminNav />
      {children ?? <Outlet />}
    </>
  );
}
