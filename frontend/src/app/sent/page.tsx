'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Send, ExternalLink, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { formatDate } from '@/lib/utils';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sent Emails Log</h2>
          <p className="text-sm text-muted-foreground">
            Audit delivered messages, inspect SMTP message IDs, and view Ethereal test inbox previews.
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sent recipient or subject..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-6">Recipient</th>
                  <th className="py-3 px-6">Subject</th>
                  <th className="py-3 px-6">Dispatched At</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Ethereal Preview</th>
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
                      <td className="py-4 px-6 text-right"><Skeleton className="h-8 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : emails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Send className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm font-medium">No sent emails recorded yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Dispatched emails will appear here with delivery timestamps and preview URLs.
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
                      <td className="py-3.5 px-6 text-xs text-muted-foreground">
                        {formatDate(email.sentAt || email.updatedAt)}
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge variant="success">SENT</Badge>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {email.etherealUrl ? (
                          <a
                            href={email.etherealUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-accent hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Email
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
              <div>
                Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} sent emails
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
