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
    <form onSubmit={handleScheduleCampaign} className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compose Email Campaign</h2>
          <p className="text-sm text-muted-foreground">
            Schedule bulk emails with automatic BullMQ delayed delivery and rollover protection.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          isLoading={isScheduling}
          className="gap-2 shadow-md shadow-primary/20"
        >
          <Send className="h-4 w-4" />
          Schedule Campaign
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Email Content (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Campaign Details</CardTitle>
              <CardDescription>Specify the subject line and recipient facing metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Campaign Name (Internal)</Label>
                <Input
                  id="title"
                  placeholder="e.g. Q4 Product Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject Line *</Label>
                <Input
                  id="subject"
                  required
                  placeholder="e.g. Exclusive Invitation to ReachInbox Enterprise"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Email Body</CardTitle>
                <CardDescription>Rich HTML markup with personalizations</CardDescription>
              </div>

              <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
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
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {activeTab === 'write' ? (
                <div className="space-y-2">
                  <textarea
                    id="htmlBody"
                    required
                    rows={12}
                    className="w-full rounded-md border border-input bg-background p-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    placeholder="Enter valid HTML email content..."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tip: Personalize with <code className="bg-muted px-1 rounded">{'{{name}}'}</code> placeholder.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-border bg-card p-6 min-h-[280px]">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recipients List</CardTitle>
              <CardDescription>Upload CSV/TXT or paste comma/newline separated emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Drop Area */}
              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-6 text-center hover:bg-muted/40 transition-colors">
                <Upload className="h-8 w-8 text-primary/70 mb-2" />
                <span className="text-sm font-semibold text-foreground">
                  {uploadedFile ? uploadedFile.name : 'Upload CSV or TXT file'}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  Drag and drop or browse from disk (up to 15MB)
                </span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
              </div>

              {/* Or manual input */}
              <div className="space-y-1.5">
                <Label htmlFor="manualEmails" className="text-xs">Or paste recipient emails</Label>
                <textarea
                  id="manualEmails"
                  rows={4}
                  placeholder="alice@reachinbox.ai, Bob <bob@example.com>&#10;carol@company.org"
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={manualRecipients}
                  onChange={handleManualTextChange}
                />
              </div>

              {/* Live Extraction & Validation Metrics */}
              {isParsing ? (
                <div className="py-2 text-xs text-muted-foreground animate-pulse text-center">
                  Parsing and validating recipients...
                </div>
              ) : metrics ? (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Validation Summary</span>
                    <Badge variant={metrics.validCount > 0 ? 'success' : 'destructive'}>
                      {metrics.validCount} Ready to Schedule
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded border border-border/60 bg-background/50 p-2">
                      <div className="text-emerald-500 font-bold text-base">{metrics.validCount}</div>
                      <div className="text-[10px] text-muted-foreground">Valid Emails</div>
                    </div>
                    <div className="rounded border border-border/60 bg-background/50 p-2">
                      <div className="text-destructive font-bold text-base">{metrics.invalidCount}</div>
                      <div className="text-[10px] text-muted-foreground">Invalid Syntax</div>
                    </div>
                    <div className="rounded border border-border/60 bg-background/50 p-2">
                      <div className="text-amber-500 font-bold text-base">{metrics.duplicatesRemoved}</div>
                      <div className="text-[10px] text-muted-foreground">Duplicates Dropped</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* BullMQ Scheduling Controls */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-base">Scheduling Policies</CardTitle>
              </div>
              <CardDescription>Rate-limit constraints and delivery window</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-xs">Schedule Date</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time" className="text-xs">Schedule Time (UTC)</Label>
                  <Input
                    id="time"
                    type="time"
                    required
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="delay">Delay Between Emails</Label>
                  <span className="font-semibold text-primary">{delaySeconds} seconds</span>
                </div>
                <input
                  id="delay"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  className="w-full accent-primary"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10))}
                />
                <p className="text-[10px] text-muted-foreground">
                  Staggers outgoing connections to protect sender domain reputation.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="limit">Hourly Rate Limit</Label>
                  <span className="font-semibold text-primary">{hourlyLimit} emails/hr</span>
                </div>
                <input
                  id="limit"
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  className="w-full accent-primary"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10))}
                />
                <p className="text-[10px] text-muted-foreground">
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
