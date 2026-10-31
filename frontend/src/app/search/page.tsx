'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  Sparkles,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  Zap,
  Clock,
  Send,
  User,
} from 'lucide-react';
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
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Elasticsearch Global Search
          </h2>
          <Badge variant="purple" className="gap-1 text-[11px] font-medium py-0.5">
            <Sparkles className="h-3 w-3" />
            Edge-NGram Autocomplete
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Perform high-speed fuzzy searches and instant prefix autocomplete across recipients, subjects, status, and dates.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60 bg-card/60 backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input with Autocomplete Dropdown */}
            <div className="relative flex-1 max-w-lg">
              <SearchIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Search by email, recipient name, or subject..."
                className="pl-10 h-10 rounded-xl bg-background/70 border-border/70 text-sm focus-visible:ring-primary/20"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 z-50 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-xl overflow-hidden py-1.5 animate-in fade-in-50 zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    Elasticsearch Suggestions
                  </div>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-accent/60 flex items-center gap-2.5 transition-colors"
                    >
                      <SearchIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1.5 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                Status:
              </span>
              {[
                { label: 'All Statuses', value: '' },
                { label: 'Queued', value: 'QUEUED' },
                { label: 'Delayed', value: 'DELAYED' },
                { label: 'Sent', value: 'SENT' },
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
                  <th className="py-3.5 px-6">Recipient</th>
                  <th className="py-3.5 px-6">Subject</th>
                  <th className="py-3.5 px-6">Scheduled / Sent</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Sender</th>
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
                      <td className="py-4 px-6 text-right"><Skeleton className="h-5 w-28 ml-auto rounded-lg" /></td>
                    </tr>
                  ))
                ) : hits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-muted/60 border border-border/70 flex items-center justify-center mb-3 text-muted-foreground/50">
                          <Mail className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">No matches found in Elasticsearch</p>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          Try searching by a recipient domain, partial subject keyword, or clearing the status filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  hits.map((item: any) => (
                    <tr
                      key={item.id}
                      className="hover:bg-accent/30 transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6 font-medium text-foreground">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.recipient}
                        </div>
                        {item.recipientName && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {item.recipientName}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 max-w-sm truncate text-muted-foreground font-normal">
                        <span className="text-foreground/90 font-medium">{item.subject}</span>
                      </td>
                      <td className="py-4 px-6 text-xs text-muted-foreground font-mono">
                        {formatDate(item.sentAt || item.scheduledTime)}
                      </td>
                      <td className="py-4 px-6">
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
                          className="font-medium text-xs px-2.5 py-0.5"
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right text-xs text-muted-foreground font-mono">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50">
                          {item.sender}
                        </span>
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
                <span className="font-semibold text-foreground">{meta.total}</span> search results
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
