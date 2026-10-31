'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Send,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { formatDate, formatRelativeTime } from '@/lib/utils';

export default function SentEmailsPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sent-emails', page, debouncedSearch],
    queryFn: () =>
      api.emails.getSent({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
      }),
  });

  const emails = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Sent Dispatches Log
            </h2>
            <Badge variant="success" className="gap-1 text-[11px] font-medium py-0.5">
              <CheckCircle2 className="h-3 w-3" />
              Delivered
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Audit delivered messages, inspect SMTP message IDs, and view live Ethereal sandbox previews.
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Search sent recipient or subject..."
                className="pl-10 h-10 rounded-xl bg-background/70 border-border/70 text-sm focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 self-end sm:self-auto">
              <Inbox className="h-3.5 w-3.5 text-primary" />
              Ethereal Test Inbox Previews Enabled
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="py-3.5 px-6">Recipient</th>
                  <th className="py-3.5 px-6">Subject</th>
                  <th className="py-3.5 px-6">Dispatched At</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Ethereal Preview</th>
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
                      <td className="py-4 px-6 text-right"><Skeleton className="h-8 w-24 ml-auto rounded-lg" /></td>
                    </tr>
                  ))
                ) : emails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-muted/60 border border-border/70 flex items-center justify-center mb-3 text-muted-foreground/50">
                          <Send className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">No sent emails recorded yet</p>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          Dispatched emails will appear here with delivery timestamps, sender headers, and one-click Ethereal preview links.
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
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {email.recipientEmail}
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
                          {formatDate(email.sentAt || email.updatedAt)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          {formatRelativeTime(email.sentAt || email.updatedAt)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="success" className="font-medium text-xs px-2.5 py-0.5">
                          SENT
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {email.etherealUrl ? (
                          <a
                            href={email.etherealUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/40 active:scale-95 transition-all shadow-2xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Preview
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/70 px-6 py-3.5 text-xs text-muted-foreground gap-3 bg-card/40">
              <div>
                Showing <span className="font-semibold text-foreground">{(meta.page - 1) * meta.limit + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(meta.page * meta.limit, meta.total)}</span> of{' '}
                <span className="font-semibold text-foreground">{meta.total}</span> sent emails
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
