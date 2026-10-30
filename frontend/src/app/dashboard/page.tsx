'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Send,
  Cpu,
  MailPlus,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 md:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            ReachInbox Engine Command Center
          </h2>
          <p className="text-blue-100 text-sm max-w-xl">
            High-throughput email scheduler with BullMQ delayed job persistence, zero-drop rate limiting, and real-time observability.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/compose">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-md">
              <MailPlus className="mr-2 h-4 w-4" />
              Compose Campaign
            </Button>
          </Link>
          <Link href="/queue">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 font-medium">
              <Cpu className="mr-2 h-4 w-4" />
              Queue Status
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Scheduled Emails */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scheduled Queue
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isQueueLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalScheduled}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {queueStats?.bullmq.delayed || 0} delayed, {queueStats?.bullmq.waiting || 0} waiting
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Sent Emails */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dispatched Emails
            </CardTitle>
            <Send className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isQueueLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalSent}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Delivery success rate: <span className="font-semibold text-foreground">{deliveryRate}%</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Worker Concurrency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Worker Concurrency
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isQueueLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {queueStats?.worker.concurrency || 5} workers
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Cap: {queueStats?.worker.maxEmailsPerHour || 200}/hr | {queueStats?.worker.emailDelaySeconds || 2}s delay
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Dead Letter Queue (DLQ) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dead Letter Queue
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isQueueLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {queueStats?.bullmq.dlq || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              5 retries with exponential backoff before DLQ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Campaigns & Scheduled Table */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Left Column: Recent Campaigns (4 cols) */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Recent Campaigns</CardTitle>
              <CardDescription>Latest email campaigns dispatched or scheduled</CardDescription>
            </div>
            <Link href="/compose">
              <Button size="sm" variant="outline">
                New Campaign
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isCampaignsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !campaignsData?.data || campaignsData.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Layers className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">No campaigns created yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Create your first email campaign by uploading a CSV or entering recipient emails.
                </p>
                <Link href="/compose" className="mt-4">
                  <Button size="sm">Create Campaign</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {campaignsData.data.map((campaign: any) => (
                  <div key={campaign.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{campaign.title}</span>
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
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Subject: {campaign.subject} • {campaign.totalRecipients} recipients
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <div>{formatDate(campaign.scheduledAt)}</div>
                      <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
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
              <CardTitle className="text-lg">Upcoming Deliveries</CardTitle>
              <CardDescription>Next emails queued for dispatch</CardDescription>
            </div>
            <Link href="/scheduled">
              <Button size="sm" variant="ghost" className="text-xs">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isScheduledLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recentScheduled?.data || recentScheduled.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mb-2" />
                <p className="text-xs">Queue is clear! No pending scheduled emails.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentScheduled.data.map((email: any) => (
                  <div key={email.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate text-foreground">
                        {email.recipientEmail}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {email.subject}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {email.status}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
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
