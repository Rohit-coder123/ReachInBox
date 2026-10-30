'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogOut, ExternalLink } from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/60 px-4 md:px-8 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="text-base md:text-lg font-bold tracking-tight text-foreground">
            {getPageTitle()}
          </h1>
          <span className="hidden sm:inline-block text-xs text-muted-foreground">
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
          className="hidden lg:flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Bull-Board UI
        </a>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu / Avatar */}
        {user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-border">
            <Link href="/profile" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center font-bold text-xs text-primary group-hover:ring-2 group-hover:ring-primary/40 transition-all">
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
                <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[130px]">
                  {user.email}
                </span>
              </div>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm">Sign In</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
