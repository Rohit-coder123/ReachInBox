'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  RefreshCw,
  Sliders,
  Radio,
  Server,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function QueueStatusPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => api.queue.getStats(),
    refetchInterval: 3000,
  });

  const { data: logsData } = useQuery({
    queryKey: ['queue-logs'],
    queryFn: () => api.queue.getLogs(1, 15),
    refetchInterval: 5000,
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.queue.pause(),
    onSuccess: () => {
      toast.warning('Queue paused. Workers will not pick up new jobs.');
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.queue.resume(),
    onSuccess: () => {
      toast.success('Queue resumed! Workers actively processing.');
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => api.queue.retryFailed(),
    onSuccess: (data: any) => {
      toast.success(`Retried ${data.retriedCount} failed jobs`);
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
  });

  const isPaused = stats?.worker.isPaused ?? false;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              BullMQ Queue Engine
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-2xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span className={isPaused ? 'text-amber-500' : 'text-emerald-500'}>
                {isPaused ? 'PAUSED' : 'ONLINE & ACTIVE'}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Distributed Redis broker state, worker pool concurrency, and delayed job execution monitor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isPaused ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => resumeMutation.mutate()}
              isLoading={resumeMutation.isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30 rounded-xl font-medium"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Resume Queue
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => pauseMutation.mutate()}
              isLoading={pauseMutation.isPending}
              className="gap-1.5 text-amber-500 hover:text-amber-600 border-amber-500/40 hover:bg-amber-500/10 rounded-xl font-medium"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause Queue
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => retryMutation.mutate()}
            isLoading={retryMutation.isPending}
            className="gap-1.5 rounded-xl border-border/80 shadow-xs hover:border-border font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry Failed Jobs
          </Button>

          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="secondary" className="gap-1.5 rounded-xl border border-border/60 font-medium">
              <ExternalLink className="h-3.5 w-3.5" />
              Bull-Board
            </Button>
          </a>
        </div>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Pending */}
        <Card className="relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-card to-card hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Pending in DB
            </CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                {stats?.database.pending || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Campaigns drafted or awaiting queueing
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Delayed Jobs */}
        <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-card to-card hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Delayed Jobs
            </CardTitle>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Sliders className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-purple-600 dark:text-purple-400">
                {stats?.bullmq.delayed || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Scheduled for future delivery windows
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Processing (Active) */}
        <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Processing (Active)
            </CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                {stats?.bullmq.active || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Under execution by BullMQ workers right now
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Completed */}
        <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Completed
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {stats?.bullmq.completed || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Dispatched with 200 OK from SMTP
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Failed */}
        <Card className="relative overflow-hidden border-destructive/20 bg-gradient-to-br from-destructive/5 via-card to-card hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Failed (DLQ)
            </CardTitle>
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <XCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-destructive">
                {stats?.bullmq.dlq || stats?.bullmq.failed || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Exhausted 5 exponential retries
            </p>
          </CardContent>
        </Card>

        {/* Card 6: Retry Queue */}
        <Card className="relative overflow-hidden border-border/70 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Retrying
            </CardTitle>
            <div className="p-2 rounded-xl bg-muted text-muted-foreground border border-border/60">
              <RotateCcw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {stats?.database.retrying || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Backed off exponentially (5s, 10s, 20s...)
            </p>
          </CardContent>
        </Card>

        {/* Card 7: Workers Status */}
        <Card className="relative overflow-hidden border-border/70 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Workers Pool
            </CardTitle>
            <div className="p-2 rounded-xl bg-muted text-muted-foreground border border-border/60">
              <Cpu className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {stats?.worker.isPaused ? '0' : '1'} Pool
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              State: {isPaused ? 'Paused' : 'Consuming Redis streams'}
            </p>
          </CardContent>
        </Card>

        {/* Card 8: Concurrency */}
        <Card className="relative overflow-hidden border-border/70 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Worker Concurrency
            </CardTitle>
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-primary">
                {stats?.worker.concurrency || 5}x
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Simultaneous async dispatch threads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Queue Event Audit Log */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60 bg-card/60 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Real-Time Queue Event Trail</CardTitle>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync (3s)
                </div>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Audited timeline of BullMQ enqueues, auto-rollovers, delivery attempts, and DLQ routings
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 text-xs rounded-xl border-border/70 shadow-2xs self-start sm:self-auto gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isRefetching ? 'animate-spin text-primary' : ''}`} />
              Refresh Log
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Event</th>
                  <th className="py-3.5 px-6">Message</th>
                  <th className="py-3.5 px-6">Recipient</th>
                  <th className="py-3.5 px-6 text-right">Job ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {!logsData?.data || logsData.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">
                      No queue activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  logsData.data.map((log: any) => (
                    <tr
                      key={log.id}
                      className="hover:bg-accent/30 transition-colors duration-150 text-xs group"
                    >
                      <td className="py-3.5 px-6 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge
                          variant={
                            log.event.includes('COMPLETED')
                              ? 'success'
                              : log.event.includes('ROLLOVER')
                              ? 'warning'
                              : log.event.includes('DLQ') || log.event.includes('FAILED')
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="font-medium text-[11px] px-2 py-0.5"
                        >
                          {log.event}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 text-foreground font-medium max-w-sm truncate">
                        {log.message}
                      </td>
                      <td className="py-3.5 px-6 text-muted-foreground font-medium">
                        {log.scheduledEmail?.recipientEmail || '—'}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-[11px]">
                        {log.bullJobId ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border/50">
                            {log.bullJobId.slice(0, 14)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
