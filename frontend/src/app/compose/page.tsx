'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  Sparkles,
  Sliders,
  Send,
  Eye,
  Code,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface ParseMetrics {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  duplicatesRemoved: number;
  validRecipients: Array<{ email: string; name?: string }>;
  invalidRecipients: Array<{ raw: string; reason: string }>;
}

export default function ComposePage() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [htmlBody, setHtmlBody] = React.useState(
    '<h2>Hello {{name}},</h2>\n<p>We are thrilled to welcome you to ReachInbox Enterprise!</p>\n<p>Best regards,<br/>ReachInbox Team</p>'
  );
  const [manualRecipients, setManualRecipients] = React.useState('');
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);

  // Scheduling Configuration
  const [scheduleDate, setScheduleDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = React.useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toTimeString().slice(0, 5);
  });
  const [delaySeconds, setDelaySeconds] = React.useState(2);
  const [hourlyLimit, setHourlyLimit] = React.useState(100);

  // Validation / Parse Metrics
  const [metrics, setMetrics] = React.useState<ParseMetrics | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isScheduling, setIsScheduling] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'write' | 'preview'>('write');

  // Trigger real-time recipient analysis whenever file or manual text changes
  const analyzeRecipients = React.useCallback(async (file: File | null, text: string) => {
    if (!file && !text.trim()) {
      setMetrics(null);
      return;
    }

    try {
      setIsParsing(true);
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('content', text);
      }

      const result = await api.campaigns.parseRecipients(formData);
      setMetrics(result);
    } catch {
      // Don't toast error on transient typing
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        toast.error('Only CSV and TXT files are supported');
        return;
      }
      setUploadedFile(file);
      analyzeRecipients(file, '');
    }
  };

  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setManualRecipients(val);
    setUploadedFile(null);
    analyzeRecipients(null, val);
  };

  const handleScheduleCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error('Email subject is required');
      return;
    }
    if (!htmlBody.trim()) {
      toast.error('Email body is required');
      return;
    }
    if (!metrics || metrics.validCount === 0) {
      toast.error('Please upload or input at least one valid recipient email address');
      return;
    }

    try {
      setIsScheduling(true);

      const scheduledAtDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);

      const formData = new FormData();
      formData.append('title', title || subject);
      formData.append('subject', subject);
      formData.append('htmlBody', htmlBody);
      formData.append('scheduledAt', scheduledAtDateTime.toISOString());
      formData.append('delaySeconds', String(delaySeconds));
      formData.append('hourlyLimit', String(hourlyLimit));

      if (uploadedFile) {
        formData.append('file', uploadedFile);
      } else {
        formData.append('recipientsData', manualRecipients);
      }

      const res = await api.campaigns.create(formData);
      toast.success(
        `Campaign created! ${res.parseMetrics.validCount} emails queued with BullMQ.`
      );
      router.push('/scheduled');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to schedule campaign');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <form onSubmit={handleScheduleCampaign} className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Compose Email Campaign</h2>
            <Badge variant="purple" className="gap-1 font-semibold text-[10px]">
              <Sparkles className="h-3 w-3" /> Auto-Rollover
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Schedule bulk dispatches with automatic BullMQ delayed delivery, multi-sender rate limiting, and zero dropped jobs.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          isLoading={isScheduling}
          className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 font-semibold self-start sm:self-auto"
        >
          <Send className="h-4 w-4" />
          Schedule Campaign
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Email Content (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="hover:border-border/90 transition-all duration-200">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-base font-bold">Campaign Details</CardTitle>
              <CardDescription>Specify the subject line and recipient facing metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Name (Internal)</Label>
                <Input
                  id="title"
                  placeholder="e.g. Q4 Enterprise Launch Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line *</Label>
                <Input
                  id="subject"
                  required
                  placeholder="e.g. Exclusive Invitation to ReachInbox Enterprise Platform"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-border/90 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
              <div>
                <CardTitle className="text-base font-bold">Email Body</CardTitle>
                <CardDescription>Rich HTML markup with personalizations</CardDescription>
              </div>

              <div className="flex items-center rounded-xl border border-border/70 p-1 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    activeTab === 'write'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Code className="h-3.5 w-3.5" /> HTML Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    activeTab === 'preview'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              {activeTab === 'write' ? (
                <div className="space-y-2.5">
                  <textarea
                    id="htmlBody"
                    required
                    rows={13}
                    className="w-full rounded-xl border border-border/70 bg-background/80 dark:bg-background/40 p-3.5 text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all duration-150 shadow-inner"
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    placeholder="Enter valid HTML email content..."
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Supports inline CSS styles and modern HTML email tags.</span>
                    <span>
                      Variable tag: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{'{{name}}'}</code>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-card/80 p-6 min-h-[300px] shadow-sm">
                  <div
                    className="prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: htmlBody }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recipients Upload & Scheduler Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recipient File Upload & Text Input */}
          <Card className="hover:border-border/90 transition-all duration-200">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold">Recipients List</CardTitle>
              <CardDescription>Upload CSV/TXT or paste comma/newline separated emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {/* File Drop Area */}
              <div className="relative group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 p-6 text-center transition-all duration-200 cursor-pointer">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform duration-200">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-foreground">
                  {uploadedFile ? uploadedFile.name : 'Choose CSV or TXT file'}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  Drag and drop or click to browse (up to 15MB)
                </span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
              </div>

              {/* Or manual input */}
              <div className="space-y-2">
                <Label htmlFor="manualEmails">Or paste recipient list directly</Label>
                <textarea
                  id="manualEmails"
                  rows={4}
                  placeholder="alice@reachinbox.ai, Bob <bob@example.com>&#10;carol@company.org"
                  className="w-full rounded-xl border border-border/70 bg-background/80 dark:bg-background/40 p-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all duration-150 shadow-inner"
                  value={manualRecipients}
                  onChange={handleManualTextChange}
                />
              </div>

              {/* Live Extraction & Validation Metrics */}
              {isParsing ? (
                <div className="py-3 text-xs text-muted-foreground animate-pulse text-center font-medium">
                  Validating RFC-5322 syntax and deduplicating...
                </div>
              ) : metrics ? (
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-3.5">
                  <div className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Validation Summary</span>
                    <Badge variant={metrics.validCount > 0 ? 'success' : 'destructive'}>
                      {metrics.validCount} Ready to Schedule
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 shadow-sm">
                      <div className="text-emerald-600 dark:text-emerald-400 font-extrabold text-lg">{metrics.validCount}</div>
                      <div className="text-[10px] font-semibold text-muted-foreground">Valid Emails</div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 shadow-sm">
                      <div className="text-destructive font-extrabold text-lg">{metrics.invalidCount}</div>
                      <div className="text-[10px] font-semibold text-muted-foreground">Invalid Syntax</div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 shadow-sm">
                      <div className="text-amber-500 font-extrabold text-lg">{metrics.duplicatesRemoved}</div>
                      <div className="text-[10px] font-semibold text-muted-foreground">Duplicates Dropped</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* BullMQ Scheduling Controls */}
          <Card className="hover:border-border/90 transition-all duration-200">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-base font-bold">Scheduling Policies</CardTitle>
              </div>
              <CardDescription>Rate-limit constraints and delivery window</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-2">
                  <Label htmlFor="date">Schedule Date</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Schedule Time (UTC)</Label>
                  <Input
                    id="time"
                    type="time"
                    required
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label htmlFor="delay">Delay Between Emails</Label>
                  <Badge variant="secondary" className="font-bold font-mono">
                    {delaySeconds} seconds
                  </Badge>
                </div>
                <input
                  id="delay"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Staggers outgoing connections to protect sender domain reputation.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label htmlFor="limit">Hourly Rate Limit</Label>
                  <Badge variant="secondary" className="font-bold font-mono">
                    {hourlyLimit} emails/hr
                  </Badge>
                </div>
                <input
                  id="limit"
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  If recipients exceed cap, jobs automatically rollover to next available hour.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
