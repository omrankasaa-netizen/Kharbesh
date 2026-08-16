import React from 'react';
import { Outlet } from 'react-router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CatalogProvider } from '@/lib/useCatalog.jsx';

export default function Layout() {
  return (
    <CatalogProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </CatalogProvider>
  );
}
