'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Sparkles, Filter, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { formatDate } from '@/lib/utils';

export default function SearchPage() {
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Autocomplete suggestions query
  const { data: suggestions = [] } = useQuery({
    queryKey: ['autocomplete', query],
    queryFn: () => api.search.autocomplete(query),
    enabled: query.trim().length >= 2,
    staleTime: 10000,
  });

  // Elasticsearch search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['elasticsearch', debouncedQuery, statusFilter, page],
    queryFn: () =>
      api.search.query({
        q: debouncedQuery || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      }),
  });

  const hits = searchResults?.data || [];
  const meta = searchResults?.meta;

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Elasticsearch Global Search</h2>
          <Badge variant="purple" className="gap-1 text-[11px]">
            <Sparkles className="h-3 w-3" />
            Edge-NGram Autocomplete
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Perform fuzzy and autocomplete searches across recipients, subjects, status, and dates.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input with Autocomplete Dropdown */}
            <div className="relative flex-1 max-w-lg">
              <SearchIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, recipient name, or subject..."
                className="pl-10 h-10 text-sm"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 z-50 rounded-lg border border-border bg-popover shadow-xl overflow-hidden py-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    Suggestions
                  </div>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
                    >
                      <SearchIcon className="h-3 w-3 text-muted-foreground" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground mr-1" />
              {[
                { label: 'All Statuses', value: '' },
                { label: 'Queued', value: 'QUEUED' },
                { label: 'Delayed', value: 'DELAYED' },
                { label: 'Sent', value: 'SENT' },
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
                  <th className="py-3 px-6">Recipient</th>
                  <th className="py-3 px-6">Subject</th>
                  <th className="py-3 px-6">Scheduled / Sent</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Sender</th>
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
                      <td className="py-4 px-6 text-right"><Skeleton className="h-5 w-28 ml-auto" /></td>
                    </tr>
                  ))
                ) : hits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Mail className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm font-medium">No results found in Elasticsearch index</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try searching by a different keyword or recipient domain.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  hits.map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-foreground">
                        <div>{item.recipient}</div>
                        {item.recipientName && (
                          <div className="text-xs text-muted-foreground">{item.recipientName}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-6 max-w-sm truncate text-muted-foreground font-normal">
                        {item.subject}
                      </td>
                      <td className="py-3.5 px-6 text-xs text-muted-foreground">
                        {formatDate(item.sentAt || item.scheduledTime)}
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge
                          variant={
                            item.status === 'SENT'
                              ? 'success'
                              : item.status === 'DELAYED'
                              ? 'purple'
                              : item.status === 'QUEUED'
                              ? 'info'
                              : item.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 text-right text-xs text-muted-foreground font-mono">
                        {item.sender}
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
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} search results
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
