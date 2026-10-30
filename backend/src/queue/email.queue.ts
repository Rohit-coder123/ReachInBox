import { Queue, QueueEvents, JobsOptions } from 'bullmq';
import { redisConnection } from '../config/redis';
import { queueLogger } from '../utils/logger';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';
export const DLQ_QUEUE_NAME = 'email-dlq';

export interface EmailJobPayload {
  scheduledEmailId: string;
  campaignId: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  htmlBody: string;
  senderEmail: string;
  senderName?: string | null;
  scheduledAt: string;
  attemptNumber?: number;
}

export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5s, 10s, 20s, 40s, 80s
  },
  removeOnComplete: {
    age: 24 * 3600, // keep completed for 24 hours
    count: 10000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // keep failed for 7 days
    count: 10000,
  },
};

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions,
});

export const dlqQueue = new Queue<EmailJobPayload & { error: string; failedAt: string }>(DLQ_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
});

emailQueue.on('error', (err) => {
  queueLogger.error('Email Queue Error', { error: err.message });
});

dlqQueue.on('error', (err) => {
  queueLogger.error('DLQ Queue Error', { error: err.message });
});
