'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '@/store/authStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();

  React.useEffect(() => {
    // If on /login page, don't require authentication
    if (pathname === '/login') return;

    fetchUser().catch(() => {
      // Handled in store
    });
  }, [pathname, fetchUser]);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Don't render sidebar and header on the login page
  if (pathname === '/login') {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  // Loading skeleton while verifying session
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
            <div className="absolute h-6 w-6 rounded-full bg-primary/10 animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground animate-pulse font-semibold tracking-wide uppercase">
            Initializing Engine...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.07),rgba(255,255,255,0))]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-64 flex-1 flex-col bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
