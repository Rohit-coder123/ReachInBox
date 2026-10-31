'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogOut, ExternalLink, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard Overview';
      case '/compose':
        return 'Compose Email Campaign';
      case '/scheduled':
        return 'Scheduled Emails';
      case '/sent':
        return 'Sent Emails History';
      case '/queue':
        return 'BullMQ Queue Monitor';
      case '/search':
        return 'Elasticsearch Search';
      case '/settings':
        return 'Engine & Integration Settings';
      case '/profile':
        return 'User Profile & Security';
      default:
        return 'ReachInbox';
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-card/75 dark:bg-card/45 px-4 md:px-8 backdrop-blur-2xl transition-colors duration-200">
      <div className="flex items-center gap-3.5">
        {/* Mobile menu button */}
        <Button
          variant="outline"
          size="icon"
          className="md:hidden h-9 w-9 rounded-xl border-border/70"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold tracking-tight text-foreground">
              {getPageTitle()}
            </h1>
            <span className="hidden lg:inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              Live
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] text-muted-foreground font-medium">
            ReachInbox Distributed Email Platform
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Bull-Board Quick Link */}
        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/80 hover:text-foreground hover:border-border transition-all duration-150 shadow-sm"
        >
          <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
          <span>Bull-Board UI</span>
        </a>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu / Avatar */}
        {user ? (
          <div className="flex items-center gap-3 pl-2.5 border-l border-border/60">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-accent/60 transition-colors group"
            >
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-border/80 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 flex items-center justify-center font-bold text-xs text-primary shadow-sm group-hover:ring-2 group-hover:ring-primary/40 transition-all duration-200">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{user.name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
                  {user.name}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" className="shadow-sm">Sign In</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
