'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MailPlus,
  Clock,
  Send,
  Cpu,
  Search,
  Settings,
  User,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Compose Email', href: '/compose', icon: MailPlus },
  { name: 'Scheduled Emails', href: '/scheduled', icon: Clock },
  { name: 'Sent Emails', href: '/sent', icon: Send },
  { name: 'Queue Status', href: '/queue', icon: Cpu },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Profile', href: '/profile', icon: User },
];

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
          <Zap className="h-5 w-5 fill-current" />
        </div>
        <div>
          <span className="font-bold tracking-tight text-foreground text-lg">ReachInbox</span>
          <span className="block text-[10px] uppercase font-bold text-blue-500 tracking-wider">Enterprise Engine</span>
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Main Navigation
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* BullMQ Engine Live Status */}
      <div className="p-4 border-t border-border">
        <div className="rounded-lg border border-border/70 bg-background/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">BullMQ Engine</span>
            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Distributed Redis delayed queue with auto-rollover
          </div>
        </div>
      </div>
    </aside>
  );
}
