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
  AlertCircle,
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
          <h2 className="text-2xl font-bold tracking-tight">Scheduled Emails Queue</h2>
          <p className="text-sm text-muted-foreground">
            Manage upcoming BullMQ delayed dispatches, monitor timing, and cancel queued jobs.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipient or subject..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground mr-1" />
              {[
                { label: 'All Active', value: '' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Delayed', value: 'DELAYED' },
                { label: 'Queued', value: 'QUEUED' },
                { label: 'Failed', value: 'FAILED' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th
                    className="py-3 px-6 cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('recipientEmail')}
                  >
                    <div className="flex items-center gap-1.5">
                      Recipient
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-6">Subject</th>
                  <th
                    className="py-3 px-6 cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('scheduledAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      Scheduled Delivery
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-6 cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-44" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-52" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-32" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-4 px-6 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : emails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Mail className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm font-medium">No scheduled emails found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search || statusFilter ? 'Try clearing your active filters' : 'Ready to compose your first campaign'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  emails.map((email: any) => (
                    <tr key={email.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-foreground">
                        <div>{email.recipientEmail}</div>
                        {email.recipientName && (
                          <div className="text-xs text-muted-foreground">{email.recipientName}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-6 max-w-xs truncate text-muted-foreground font-normal">
                        {email.subject}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-medium text-xs text-foreground">
                          {formatDate(email.scheduledAt)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(email.scheduledAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
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
                        >
                          {email.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                          onClick={() => cancelMutation.mutate(email.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
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
            <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
              <div>
                Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} scheduled emails
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!meta.hasPrev}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold px-2">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!meta.hasNext}
                  className="h-8 w-8 p-0"
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
