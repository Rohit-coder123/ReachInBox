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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">BullMQ Queue Engine</h2>
            <Badge variant={isPaused ? 'warning' : 'success'}>
              {isPaused ? 'PAUSED' : 'ONLINE & ACTIVE'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Distributed Redis broker state, worker pool concurrency, and delayed job execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isPaused ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => resumeMutation.mutate()}
              isLoading={resumeMutation.isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
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
              className="gap-1.5 text-amber-500 hover:text-amber-600 border-amber-500/30"
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
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry Failed Jobs
          </Button>

          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="secondary" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Bull-Board
            </Button>
          </a>
        </div>
      </div>

      {/* 8 Metric Cards Grid as requested */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Pending */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Pending in DB
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {stats?.database.pending || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Campaigns drafted or awaiting queueing
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Delayed Jobs */}
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Delayed Jobs
            </CardTitle>
            <Sliders className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                {stats?.bullmq.delayed || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Scheduled for future delivery windows
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Processing (Active) */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Processing (Active)
            </CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {stats?.bullmq.active || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Under execution by BullMQ workers right now
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Completed */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats?.bullmq.completed || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Dispatched with 200 OK from SMTP
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Failed */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Failed (DLQ)
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-extrabold text-destructive">
                {stats?.bullmq.dlq || stats?.bullmq.failed || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Exhausted 5 exponential retries
            </p>
          </CardContent>
        </Card>

        {/* Card 6: Retry Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Retrying
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-extrabold">
                {stats?.database.retrying || 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Backed off exponentially (5s, 10s, 20s...)
            </p>
          </CardContent>
        </Card>

        {/* Card 7: Workers Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Workers
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-extrabold text-foreground">
                {stats?.worker.isPaused ? '0' : '1'} Pool
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              State: {isPaused ? 'Paused' : 'Consuming Redis streams'}
            </p>
          </CardContent>
        </Card>

        {/* Card 8: Concurrency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Worker Concurrency
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-extrabold text-primary">
                {stats?.worker.concurrency || 5}x
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Simultaneous async dispatch threads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Queue Event Audit Log */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Real-Time Queue Event Trail</CardTitle>
              <CardDescription>
                Audited timeline of enqueues, auto-rollovers, delivery attempts, and DLQ routings
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
              Auto-refreshing (3s)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Event</th>
                  <th className="py-3 px-6">Message</th>
                  <th className="py-3 px-6">Recipient</th>
                  <th className="py-3 px-6 text-right">Job ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!logsData?.data || logsData.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                      No queue activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  logsData.data.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors text-xs">
                      <td className="py-3 px-6 text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3 px-6">
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
                        >
                          {log.event}
                        </Badge>
                      </td>
                      <td className="py-3 px-6 text-foreground font-medium max-w-sm truncate">
                        {log.message}
                      </td>
                      <td className="py-3 px-6 text-muted-foreground">
                        {log.scheduledEmail?.recipientEmail || '—'}
                      </td>
                      <td className="py-3 px-6 text-right font-mono text-[11px] text-muted-foreground">
                        {log.bullJobId?.slice(0, 14) || '—'}
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
