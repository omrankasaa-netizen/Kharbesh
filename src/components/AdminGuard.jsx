import React from 'react';
import { Link, Outlet } from 'react-router';
import { useAuth } from '@/lib/AuthContext';

export default function AdminGuard() {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return <div className="max-w-[800px] mx-auto px-6 py-20 text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
        <p className="font-heading text-2xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>Admin only</p>
        <p className="text-muted-foreground mt-2">Log in to manage the store.</p>
        <Link to="/login" className="kh-btn-text mt-4">Login</Link>
      </div>
    );
  }
  if (user.role !== 'admin') {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
        <p className="font-heading text-2xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>Access denied</p>
        <p className="text-muted-foreground mt-2">This area is for admins. ما إلي صلاحية.</p>
      </div>
    );
  }
  return <Outlet />;
}
