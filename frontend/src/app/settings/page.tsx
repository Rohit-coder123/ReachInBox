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
        <h2 className="text-2xl font-bold tracking-tight">System & Integration Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure BullMQ rate-limiting policies, multi-sender defaults, and real-time Slack alerting.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Section 1: Slack Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Slack Alerting Integration</CardTitle>
                  <CardDescription>
                    Receive instant notifications whenever a sender reaches an hourly limit and auto-rollover triggers
                  </CardDescription>
                </div>
              </div>

              <Badge variant={slackStatus?.isConnected ? 'success' : 'secondary'}>
                {slackStatus?.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {slackStatus?.isConnected ? (
              <div className="rounded-lg border border-border bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Connected to {slackStatus.teamName || 'Workspace'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Channel: <span className="font-mono text-foreground">{slackStatus.channelName || '#general'}</span> • Auto-rollover alerts enabled
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testSlackMutation.mutate()}
                    isLoading={testSlackMutation.isPending}
                  >
                    Send Test Alert
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => disconnectSlackMutation.mutate()}
                    isLoading={disconnectSlackMutation.isPending}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    onClick={handleConnectSlackOAuth}
                    className="gap-2 bg-[#4A154B] hover:bg-[#3D113E] text-white"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
                    </svg>
                    Connect with Slack OAuth
                  </Button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-medium">Or configure Incoming Webhook manually</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="webhookUrl" className="text-xs">Slack Incoming Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="channelName" className="text-xs">Channel (Optional)</Label>
                    <Input
                      id="channelName"
                      placeholder="#alerts"
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
                >
                  Save Webhook URL
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Rate Limiting & Concurrency Policies */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Rate Limits & Scheduling Engine</CardTitle>
                <CardDescription>
                  Tune throughput and concurrency rules. Zero jobs are ever dropped when limits are exceeded.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxPerHour" className="text-xs font-semibold">
                  Global Hourly Limit (MAX_EMAILS_PER_HOUR)
                </Label>
                <Input
                  id="maxPerHour"
                  type="number"
                  min="1"
                  max="10000"
                  value={maxEmailsPerHour}
                  onChange={(e) => setMaxEmailsPerHour(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Global cap across all campaigns per UTC hour bucket.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPerSender" className="text-xs font-semibold">
                  Per Sender Hourly Limit (MAX_EMAILS_PER_SENDER)
                </Label>
                <Input
                  id="maxPerSender"
                  type="number"
                  min="1"
                  max="5000"
                  value={maxEmailsPerSender}
                  onChange={(e) => setMaxEmailsPerSender(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Max emails any individual sender address may dispatch per hour.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay" className="text-xs font-semibold">
                  Delay Between Emails (EMAIL_DELAY_SECONDS)
                </Label>
                <Input
                  id="delay"
                  type="number"
                  min="0"
                  max="60"
                  value={emailDelaySeconds}
                  onChange={(e) => setEmailDelaySeconds(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Inter-email pacing interval (seconds) to respect SMTP receiver rate limits.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="concurrency" className="text-xs font-semibold">
                  Worker Concurrency (WORKER_CONCURRENCY)
                </Label>
                <Input
                  id="concurrency"
                  type="number"
                  min="1"
                  max="50"
                  value={workerConcurrency}
                  onChange={(e) => setWorkerConcurrency(parseInt(e.target.value, 10))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Number of parallel BullMQ job execution threads in worker pool.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Default Sender & SMTP */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Sender & Nodemailer SMTP Provider</CardTitle>
                <CardDescription>Default outbound email credentials and preview environment</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="senderEmail" className="text-xs font-semibold">Default Sender Email</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  value={defaultSenderEmail}
                  onChange={(e) => setDefaultSenderEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderName" className="text-xs font-semibold">Default Sender Name</Label>
                <Input
                  id="senderName"
                  value={defaultSenderName}
                  onChange={(e) => setDefaultSenderName(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-foreground">
                  Ethereal SMTP Sandbox Active
                </span>
                <p className="text-xs text-muted-foreground">
                  Emails are safely captured in ethereal.email with instant preview URLs.
                </p>
              </div>
              <Badge variant="info">SANDBOX MODE</Badge>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => updateSettingsMutation.mutate()}
                isLoading={updateSettingsMutation.isPending}
                className="gap-2"
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
