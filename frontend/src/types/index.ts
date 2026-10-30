export type Role = 'USER' | 'ADMIN';

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAUSED'
  | 'CANCELLED'
  | 'FAILED';

export type EmailStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'DELAYED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RETRYING'
  | 'BOUNCED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: Role;
  createdAt: string;
  slackConfig?: {
    isConnected: boolean;
    channelName?: string | null;
    teamName?: string | null;
  } | null;
  _count?: {
    campaigns: number;
  };
}

export interface EmailCampaign {
  id: string;
  userId: string;
  title: string;
  subject: string;
  htmlBody: string;
  plainText?: string | null;
  senderEmail: string;
  senderName?: string | null;
  status: CampaignStatus;
  scheduledAt: string;
  delaySeconds: number;
  hourlyLimit: number;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledEmail {
  id: string;
  campaignId: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  htmlBody: string;
  senderEmail: string;
  status: EmailStatus;
  bullJobId?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string | null;
  messageId?: string | null;
  etherealUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    title: string;
    id: string;
  };
}

export interface QueueStats {
  bullmq: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
    dlq: number;
  };
  database: {
    pending: number;
    queued: number;
    delayed: number;
    processing: number;
    sent: number;
    failed: number;
    retrying: number;
  };
  worker: {
    concurrency: number;
    maxEmailsPerHour: number;
    maxEmailsPerSender: number;
    emailDelaySeconds: number;
    isPaused: boolean;
  };
}

export interface QueueLogItem {
  id: string;
  scheduledEmailId?: string | null;
  bullJobId?: string | null;
  event: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  details?: any;
  createdAt: string;
  scheduledEmail?: {
    recipientEmail: string;
    subject: string;
    senderEmail: string;
  } | null;
}

export interface SettingsData {
  rateLimits: {
    maxEmailsPerHour: number;
    maxEmailsPerSender: number;
    emailDelaySeconds: number;
    workerConcurrency: number;
  };
  sender: {
    defaultSenderEmail: string;
    defaultSenderName: string;
  };
  smtp: {
    useEthereal: boolean;
    provider: string;
  };
}

export interface SlackStatus {
  isConnected: boolean;
  teamName: string | null;
  channelName: string | null;
  hasWebhook: boolean;
  alertOnRateLimit: boolean;
  alertOnFailure: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error?: {
    code: string;
    details?: any;
  };
}
