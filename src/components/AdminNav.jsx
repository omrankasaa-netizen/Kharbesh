import React from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/lib/AuthContext';
import { hasRole } from '@/api/khClient';
import { useI18n } from '@/lib/i18n';

const LINKS = [
  { to: '/admin/dashboard', label_en: 'Dashboard', label_ar: 'لوحة التحكم', minRole: 'staff' },
  { to: '/admin/orders', label_en: 'Orders', label_ar: 'الطلبات', minRole: 'staff' },
  { to: '/admin/products', label_en: 'Products', label_ar: 'المنتجات', minRole: 'staff' },
  { to: '/admin/bulk-import', label_en: 'Bulk Import', label_ar: 'استيراد بالجملة', minRole: 'staff' },
  { to: '/admin/local-import', label_en: 'Local Import', label_ar: 'استيراد من مجلد', minRole: 'staff' },
  { to: '/admin/inventory', label_en: 'Inventory', label_ar: 'المخزون', minRole: 'staff' },
  { to: '/admin/factory', label_en: 'Factory', label_ar: 'المصنع', minRole: 'staff' },
  { to: '/admin/messages', label_en: 'Messages', label_ar: 'الرسائل', minRole: 'staff' },
  { to: '/admin/customers', label_en: 'Customers', label_ar: 'الزبائن', minRole: 'admin' },
  { to: '/admin/analytics', label_en: 'Analytics', label_ar: 'التحليلات', minRole: 'admin' },
  { to: '/admin/settings', label_en: 'Settings', label_ar: 'الإعدادات', minRole: 'admin' },
  { to: '/admin/promotions', label_en: 'Promotions', label_ar: 'الحسومات', minRole: 'admin' },
  { to: '/admin/loyalty', label_en: 'Loyalty', label_ar: 'برنامج الولاء', minRole: 'admin' },
  { to: '/admin/financials', label_en: 'Financials', label_ar: 'المالية', minRole: 'super_admin' },
  { to: '/admin/staff', label_en: 'Staff', label_ar: 'الفريق', minRole: 'super_admin' },
];

export default function AdminNav() {
  const { user, logout } = useAuth();
  const { lang } = useI18n();
  const location = useLocation();

  const visible = LINKS.filter((l) => hasRole(user, l.minRole));

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {visible.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className="px-3 py-2 text-xs uppercase tracking-wide whitespace-nowrap rounded-sm transition-colors"
                  style={{
                    color: active ? 'var(--brand-accent)' : 'var(--muted)',
                    background: active ? 'color-mix(in srgb, var(--brand-accent) 12%, transparent)' : 'transparent',
                  }}
                >
                  {lang === 'ar' ? l.label_ar : l.label_en}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3 shrink-0 pl-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wide hidden sm:inline">
              {user?.role?.replace('_', ' ')}
            </span>
            <button onClick={() => logout()} className="kh-btn-text text-xs">
              {lang === 'ar' ? 'خروج' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
