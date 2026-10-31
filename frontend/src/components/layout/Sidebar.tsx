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
  Radio,
  ChevronRight,
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
    <aside className="flex h-full w-64 flex-col border-r border-border/70 bg-card/75 dark:bg-card/45 backdrop-blur-2xl transition-all duration-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3.5 px-6 border-b border-border/60">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 text-white shadow-md shadow-blue-500/25 ring-1 ring-white/20 transition-transform hover:scale-105 duration-200">
          <Zap className="h-5 w-5 fill-current" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight text-foreground text-lg">ReachInbox</span>
            <span className="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400">
              v1.0
            </span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/80">
            Enterprise Engine
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Core Platform
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
                'group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary font-semibold shadow-sm shadow-primary/10 border-l-2 border-primary'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-0.5'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span>{item.name}</span>
              </div>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              )}
            </Link>
          );
        })}
      </div>

      {/* BullMQ Engine Live Status */}
      <div className="p-4 border-t border-border/60">
        <div className="group rounded-xl border border-border/70 bg-gradient-to-br from-background/90 to-background/50 p-3.5 shadow-sm space-y-2 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
              BullMQ Engine
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Active
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Redis delayed streams with automatic next-hour rollover
          </div>
        </div>
      </div>
    </aside>
  );
}
