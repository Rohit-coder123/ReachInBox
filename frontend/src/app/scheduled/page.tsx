'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Search,
  ArrowUpDown,
  Filter,
  XCircle,
  RefreshCw,
  Mail,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function ScheduledEmailsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState('scheduledAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Query scheduled emails
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['scheduled-emails', page, debouncedSearch, statusFilter, sortBy, sortOrder],
    queryFn: () =>
      api.emails.getScheduled({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
      }),
  });

  // Cancel email mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.emails.cancel(id),
    onSuccess: () => {
      toast.success('Scheduled email job cancelled and removed from queue');
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel email job');
    },
  });

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const emails = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Scheduled Queue
            </h2>
            <Badge variant="purple" className="gap-1 text-[11px] font-medium py-0.5">
              <Clock className="h-3 w-3" />
              Delayed Dispatches
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage upcoming BullMQ delayed dispatches, monitor execution timing, and cancel queued jobs.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2 self-start sm:self-auto rounded-xl border-border/80 shadow-xs hover:border-border transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-primary' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60 bg-card/60 backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Search recipient or subject..."
                className="pl-10 h-10 rounded-xl bg-background/70 border-border/70 text-sm focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1.5 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                Filter:
              </span>
              {[
                { label: 'All Active', value: '' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Delayed', value: 'DELAYED' },
                { label: 'Queued', value: 'QUEUED' },
                { label: 'Failed', value: 'FAILED' },
              ].map((filter) => {
                const isActive = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => {
                      setStatusFilter(filter.value);
                      setPage(1);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/20 font-semibold'
                        : 'border border-border/60 bg-muted/30 text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th
                    className="py-3.5 px-6 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort('recipientEmail')}
                  >
                    <div className="flex items-center gap-1.5">
                      Recipient
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                    </div>
                  </th>
                  <th className="py-3.5 px-6">Subject</th>
                  <th
                    className="py-3.5 px-6 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort('scheduledAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      Scheduled Delivery
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-6 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                    </div>
                  </th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6"><Skeleton className="h-5 w-44 rounded-lg" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-52 rounded-lg" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-32 rounded-lg" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-20 rounded-lg" /></td>
                      <td className="py-4 px-6 text-right"><Skeleton className="h-8 w-16 ml-auto rounded-lg" /></td>
                    </tr>
                  ))
                ) : emails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-muted/60 border border-border/70 flex items-center justify-center mb-3 text-muted-foreground/50">
                          <Mail className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">No scheduled emails found</p>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          {search || statusFilter
                            ? 'No matches found for your current search or status filter. Try clearing filters.'
                            : 'All scheduled jobs have been dispatched. Ready to compose your next campaign!'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  emails.map((email: any) => (
                    <tr
                      key={email.id}
                      className="hover:bg-accent/30 transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {email.recipientEmail}
                          </span>
                        </div>
                        {email.recipientName && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {email.recipientName}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate text-muted-foreground font-normal">
                        <span className="text-foreground/90 font-medium">{email.subject}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(email.scheduledAt)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          {formatRelativeTime(email.scheduledAt)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant={
                            email.status === 'DELAYED'
                              ? 'purple'
                              : email.status === 'QUEUED'
                              ? 'info'
                              : email.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="font-medium text-xs px-2.5 py-0.5"
                        >
                          {email.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 rounded-lg transition-colors"
                          onClick={() => cancelMutation.mutate(email.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/70 px-6 py-3.5 text-xs text-muted-foreground gap-3 bg-card/40">
              <div>
                Showing <span className="font-semibold text-foreground">{(meta.page - 1) * meta.limit + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(meta.page * meta.limit, meta.total)}</span> of{' '}
                <span className="font-semibold text-foreground">{meta.total}</span> scheduled emails
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!meta.hasPrev}
                  className="h-8 w-8 p-0 rounded-lg border-border/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold px-3 text-xs text-foreground">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!meta.hasNext}
                  className="h-8 w-8 p-0 rounded-lg border-border/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
