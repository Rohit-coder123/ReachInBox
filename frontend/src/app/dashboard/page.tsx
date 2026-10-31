'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Send,
  Cpu,
  MailPlus,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { data: queueStats, isLoading: isQueueLoading } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => api.queue.getStats(),
    refetchInterval: 5000,
  });

  const { data: campaignsData, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.list(1, 5),
  });

  const { data: recentScheduled, isLoading: isScheduledLoading } = useQuery({
    queryKey: ['recent-scheduled'],
    queryFn: () => api.emails.getScheduled({ page: 1, limit: 5 }),
  });

  const totalScheduled =
    (queueStats?.database.pending || 0) +
    (queueStats?.database.queued || 0) +
    (queueStats?.database.delayed || 0);

  const totalSent = queueStats?.database.sent || 0;
  const totalFailed = queueStats?.database.failed || 0;
  const deliveryRate = totalSent + totalFailed > 0
    ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
    : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-7 md:p-9 text-white border border-blue-500/25 shadow-xl shadow-blue-950/20">
        {/* Ambient background glows */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs text-blue-200 backdrop-blur-md font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Production BullMQ Engine</span>
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              ReachInbox Command Center
            </h2>

            <p className="text-blue-100/90 text-sm leading-relaxed max-w-xl">
              High-throughput distributed email scheduler with Redis-backed delayed persistence, automatic next-hour rate rollover, and real-time observability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/compose">
              <Button
                size="lg"
                className="bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-lg shadow-black/20 hover:shadow-xl transition-all"
              >
                <MailPlus className="mr-2 h-4 w-4" />
                Compose Campaign
              </Button>
            </Link>
            <Link href="/queue">
              <Button
                variant="outline"
                size="lg"
                className="border-white/25 bg-white/5 text-white hover:bg-white/15 backdrop-blur-md font-semibold"
              >
                <Cpu className="mr-2 h-4 w-4 text-blue-300" />
                Queue Status
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid with Smooth Hover Lift */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Scheduled Emails */}
        <Card className="hover:-translate-y-1 hover:shadow-lg hover:border-blue-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
              Scheduled Queue
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {isQueueLoading ? (
              <Skeleton className="h-9 w-24 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {totalScheduled.toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium pt-1">
              <span className="text-foreground font-semibold">{queueStats?.bullmq.delayed || 0}</span> delayed,{' '}
              <span className="text-foreground font-semibold">{queueStats?.bullmq.waiting || 0}</span> waiting
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Sent Emails */}
        <Card className="hover:-translate-y-1 hover:shadow-lg hover:border-emerald-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
              Dispatched Emails
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Send className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {isQueueLoading ? (
              <Skeleton className="h-9 w-24 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {totalSent.toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium pt-1 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>Success rate: <strong className="text-foreground">{deliveryRate}%</strong></span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Worker Concurrency */}
        <Card className="hover:-translate-y-1 hover:shadow-lg hover:border-purple-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
              Worker Concurrency
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {isQueueLoading ? (
              <Skeleton className="h-9 w-24 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {queueStats?.worker.concurrency || 5} <span className="text-lg font-semibold text-muted-foreground">workers</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium pt-1">
              Cap: {queueStats?.worker.maxEmailsPerHour || 200}/hr • {queueStats?.worker.emailDelaySeconds || 2}s pacing
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Dead Letter Queue (DLQ) */}
        <Card className="hover:-translate-y-1 hover:shadow-lg hover:border-amber-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
              Dead Letter Queue
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {isQueueLoading ? (
              <Skeleton className="h-9 w-24 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                {queueStats?.bullmq.dlq || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium pt-1">
              5 retries with exponential backoff before DLQ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Campaigns & Scheduled Deliveries */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Left Column: Recent Campaigns (4 cols) */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold">Recent Campaigns</CardTitle>
              <CardDescription>Latest email campaigns dispatched or in flight</CardDescription>
            </div>
            <Link href="/compose">
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5">
                <MailPlus className="h-3.5 w-3.5" />
                New Campaign
              </Button>
            </Link>
          </CardHeader>

          <CardContent>
            {isCampaignsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : !campaignsData?.data || campaignsData.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3 text-muted-foreground">
                  <Layers className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">No campaigns created yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Upload a CSV or input email recipients to launch your first scheduled batch.
                </p>
                <Link href="/compose" className="mt-4">
                  <Button size="sm" className="font-semibold shadow-sm">
                    Create Campaign
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {campaignsData.data.map((campaign: any) => (
                  <div
                    key={campaign.id}
                    className="py-3.5 px-2 rounded-xl flex items-center justify-between gap-4 hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {campaign.title}
                        </span>
                        <Badge
                          variant={
                            campaign.status === 'COMPLETED'
                              ? 'success'
                              : campaign.status === 'SCHEDULED'
                              ? 'info'
                              : 'secondary'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        Subject: <span className="text-foreground/90 font-medium">{campaign.subject}</span> • {campaign.totalRecipients} recipients
                      </p>
                    </div>

                    <div className="text-right text-xs shrink-0 space-y-0.5">
                      <div className="text-muted-foreground font-medium">{formatDate(campaign.scheduledAt)}</div>
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {campaign.sentCount} sent
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Upcoming Dispatches (3 cols) */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold">Upcoming Deliveries</CardTitle>
              <CardDescription>Next emails queued for automated delivery</CardDescription>
            </div>
            <Link href="/scheduled">
              <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground">
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent>
            {isScheduledLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : !recentScheduled?.data || recentScheduled.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mb-2" />
                <p className="text-xs font-semibold text-foreground">Queue is clear!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No pending scheduled emails at this moment.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentScheduled.data.map((email: any) => (
                  <div
                    key={email.id}
                    className="py-3 px-2 rounded-xl flex items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold truncate text-foreground">
                        {email.recipientEmail}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {email.subject}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-0.5">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {email.status}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {formatDate(email.scheduledAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
