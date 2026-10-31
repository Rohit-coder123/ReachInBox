'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Sliders,
  Send,
  Bell,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Save,
  MessageSquare,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api, API_BASE_URL } from '@/services/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Settings query
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  });

  // Slack status query
  const { data: slackStatus, refetch: refetchSlack } = useQuery({
    queryKey: ['slack-status'],
    queryFn: () => api.slack.getStatus(),
  });

  // Form State
  const [maxEmailsPerHour, setMaxEmailsPerHour] = React.useState(200);
  const [maxEmailsPerSender, setMaxEmailsPerSender] = React.useState(50);
  const [emailDelaySeconds, setEmailDelaySeconds] = React.useState(2);
  const [workerConcurrency, setWorkerConcurrency] = React.useState(5);
  const [defaultSenderEmail, setDefaultSenderEmail] = React.useState('');
  const [defaultSenderName, setDefaultSenderName] = React.useState('');
  const [webhookUrl, setWebhookUrl] = React.useState('');
  const [channelName, setChannelName] = React.useState('');

  React.useEffect(() => {
    if (settingsData) {
      setMaxEmailsPerHour(settingsData.rateLimits.maxEmailsPerHour);
      setMaxEmailsPerSender(settingsData.rateLimits.maxEmailsPerSender);
      setEmailDelaySeconds(settingsData.rateLimits.emailDelaySeconds);
      setWorkerConcurrency(settingsData.rateLimits.workerConcurrency);
      setDefaultSenderEmail(settingsData.sender.defaultSenderEmail);
      setDefaultSenderName(settingsData.sender.defaultSenderName);
    }
  }, [settingsData]);

  // Update Settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      api.settings.update({
        maxEmailsPerHour,
        maxEmailsPerSender,
        emailDelaySeconds,
        workerConcurrency,
        defaultSenderEmail,
        defaultSenderName,
      }),
    onSuccess: () => {
      toast.success('Rate limit and sender settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  // Save Slack webhook mutation
  const saveWebhookMutation = useMutation({
    mutationFn: () => api.slack.configureWebhook(webhookUrl, channelName || undefined),
    onSuccess: () => {
      toast.success('Slack webhook configured successfully!');
      refetchSlack();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to configure Slack webhook');
    },
  });

  // Test Slack notification mutation
  const testSlackMutation = useMutation({
    mutationFn: () => api.slack.testNotification(),
    onSuccess: () => {
      toast.success('Test Slack message delivered successfully to your channel!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch Slack message');
    },
  });

  // Disconnect Slack mutation
  const disconnectSlackMutation = useMutation({
    mutationFn: () => api.slack.disconnect(),
    onSuccess: () => {
      toast.success('Slack disconnected successfully');
      refetchSlack();
    },
  });

  const handleConnectSlackOAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || '';
    if (!clientId) {
      toast.info('Slack OAuth app credentials not set in env. You can enter an Incoming Webhook URL below!');
      return;
    }
    const redirectUri = `${API_BASE_URL}/api/slack/oauth/callback`;
    window.location.href = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=incoming-webhook,chat:write&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            System Settings & Integrations
          </h2>
          <Badge variant="outline" className="gap-1 text-[11px] font-medium py-0.5">
            <Sliders className="h-3 w-3" />
            Config Engine
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure BullMQ rate-limiting policies, multi-sender concurrency, and real-time Slack alerting.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Section 1: Slack Integration */}
        <Card className="border-border/70 shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-border/60 bg-card/60 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Slack Alerting Integration</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Receive instant notifications whenever a sender reaches an hourly limit and auto-rollover triggers
                  </CardDescription>
                </div>
              </div>

              <Badge
                variant={slackStatus?.isConnected ? 'success' : 'secondary'}
                className="self-start sm:self-auto font-medium text-xs px-2.5 py-0.5"
              >
                {slackStatus?.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {slackStatus?.isConnected ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Connected to {slackStatus.teamName || 'Workspace'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Channel: <span className="font-mono text-foreground font-semibold">{slackStatus.channelName || '#general'}</span> • Auto-rollover alerts active
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testSlackMutation.mutate()}
                    isLoading={testSlackMutation.isPending}
                    className="rounded-xl border-border/80 shadow-xs hover:border-border text-xs font-semibold"
                  >
                    Send Test Alert
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 text-xs font-semibold rounded-xl"
                    onClick={() => disconnectSlackMutation.mutate()}
                    isLoading={disconnectSlackMutation.isPending}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    onClick={handleConnectSlackOAuth}
                    className="gap-2.5 bg-[#4A154B] hover:bg-[#3D113E] text-white rounded-xl shadow-xs font-semibold px-4 py-2.5 h-11"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
                    </svg>
                    Connect with Slack OAuth
                  </Button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/70" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-semibold text-[11px] tracking-wider">
                      Or configure Incoming Webhook manually
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="webhookUrl" className="text-xs font-semibold">
                      Slack Incoming Webhook URL
                    </Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                      className="rounded-xl border-border/70 bg-background/70 text-sm focus-visible:ring-primary/20"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="channelName" className="text-xs font-semibold">
                      Channel (Optional)
                    </Label>
                    <Input
                      id="channelName"
                      placeholder="#alerts"
                      className="rounded-xl border-border/70 bg-background/70 text-sm focus-visible:ring-primary/20"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveWebhookMutation.mutate()}
                  isLoading={saveWebhookMutation.isPending}
                  className="rounded-xl border-border/80 shadow-xs hover:border-border font-medium"
                >
                  Save Webhook URL
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Rate Limiting & Concurrency Policies */}
        <Card className="border-border/70 shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-border/60 bg-card/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Rate Limits & Scheduling Engine</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Tune throughput and worker pool rules. Zero jobs are ever dropped when limits are exceeded.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 p-4 rounded-xl border border-border/50 bg-muted/20">
                <Label htmlFor="maxPerHour" className="text-xs font-bold text-foreground">
                  Global Hourly Limit (MAX_EMAILS_PER_HOUR)
                </Label>
                <Input
                  id="maxPerHour"
                  type="number"
                  min="1"
                  max="10000"
                  className="rounded-xl border-border/70 bg-background/70 font-mono text-sm"
                  value={maxEmailsPerHour}
                  onChange={(e) => setMaxEmailsPerHour(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Global cap across all campaigns per UTC hour bucket. Excess rolls over automatically.
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-xl border border-border/50 bg-muted/20">
                <Label htmlFor="maxPerSender" className="text-xs font-bold text-foreground">
                  Per Sender Hourly Limit (MAX_EMAILS_PER_SENDER)
                </Label>
                <Input
                  id="maxPerSender"
                  type="number"
                  min="1"
                  max="5000"
                  className="rounded-xl border-border/70 bg-background/70 font-mono text-sm"
                  value={maxEmailsPerSender}
                  onChange={(e) => setMaxEmailsPerSender(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Max emails any individual sender address may dispatch per hour before rollover.
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-xl border border-border/50 bg-muted/20">
                <Label htmlFor="delay" className="text-xs font-bold text-foreground">
                  Delay Between Emails (EMAIL_DELAY_SECONDS)
                </Label>
                <Input
                  id="delay"
                  type="number"
                  min="0"
                  max="60"
                  className="rounded-xl border-border/70 bg-background/70 font-mono text-sm"
                  value={emailDelaySeconds}
                  onChange={(e) => setEmailDelaySeconds(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Inter-email pacing interval (seconds) to respect SMTP receiver rate limits.
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-xl border border-border/50 bg-muted/20">
                <Label htmlFor="concurrency" className="text-xs font-bold text-foreground">
                  Worker Concurrency (WORKER_CONCURRENCY)
                </Label>
                <Input
                  id="concurrency"
                  type="number"
                  min="1"
                  max="50"
                  className="rounded-xl border-border/70 bg-background/70 font-mono text-sm"
                  value={workerConcurrency}
                  onChange={(e) => setWorkerConcurrency(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Number of parallel BullMQ job execution threads in the active worker pool.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Default Sender & SMTP */}
        <Card className="border-border/70 shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-border/60 bg-card/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Sender & Nodemailer SMTP Provider</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Default outbound email credentials and preview environment
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="senderEmail" className="text-xs font-bold text-foreground">
                  Default Sender Email
                </Label>
                <Input
                  id="senderEmail"
                  type="email"
                  className="rounded-xl border-border/70 bg-background/70 text-sm"
                  value={defaultSenderEmail}
                  onChange={(e) => setDefaultSenderEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderName" className="text-xs font-bold text-foreground">
                  Default Sender Name
                </Label>
                <Input
                  id="senderName"
                  className="rounded-xl border-border/70 bg-background/70 text-sm"
                  value={defaultSenderName}
                  onChange={(e) => setDefaultSenderName(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4.5 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Ethereal SMTP Sandbox Active
                </span>
                <p className="text-xs text-muted-foreground">
                  All dispatched messages generate live Ethereal inbox links with zero risk of sending real spam.
                </p>
              </div>
              <Badge variant="info" className="font-semibold text-xs px-2.5 py-0.5 shrink-0">
                SANDBOX MODE
              </Badge>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => updateSettingsMutation.mutate()}
                isLoading={updateSettingsMutation.isPending}
                className="gap-2 rounded-xl shadow-sm shadow-primary/20 px-5 font-semibold"
              >
                <Save className="h-4 w-4" />
                Save All Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
