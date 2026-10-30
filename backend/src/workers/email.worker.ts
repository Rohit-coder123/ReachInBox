import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { EMAIL_QUEUE_NAME, EmailJobPayload, dlqQueue } from '../queue/email.queue';
import { emailService } from '../modules/email/email.service';
import { elasticsearchService } from '../modules/search/elasticsearch.service';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { workerLogger } from '../utils/logger';
import { EmailStatus, LogLevel } from '@prisma/client';

export class EmailWorkerService {
  private worker: Worker<EmailJobPayload> | null = null;

  /**
   * Initialize and start the BullMQ worker
   */
  startWorker(): Worker<EmailJobPayload> {
    if (this.worker) return this.worker;

    const concurrency = config.scheduler.workerConcurrency;

    this.worker = new Worker<EmailJobPayload>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobPayload>) => {
        return this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency,
        limiter: {
          max: config.scheduler.maxEmailsPerHour,
          duration: 3600 * 1000,
        },
      }
    );

    this.worker.on('active', (job) => {
      workerLogger.info(`[Worker] Started processing job ${job.id} for ${job.data.recipientEmail}`);
    });

    this.worker.on('completed', (job, result) => {
      workerLogger.info(`[Worker] Successfully completed job ${job.id} (${result.messageId})`);
    });

    this.worker.on('failed', async (job, err) => {
      workerLogger.error(`[Worker] Job ${job?.id} failed: ${err.message}`, {
        attemptsMade: job?.attemptsMade,
        maxAttempts: job?.opts.attempts,
      });

      if (job) {
        await this.handleJobFailure(job, err);
      }
    });

    this.worker.on('error', (err) => {
      workerLogger.error('[Worker] Worker thread error:', { error: err.message });
    });

    workerLogger.info(`🚀 BullMQ Email Worker started with concurrency: ${concurrency}`);
    return this.worker;
  }

  /**
   * Process individual email job
   */
  private async processJob(job: Job<EmailJobPayload>): Promise<{ messageId: string; etherealUrl?: string | null }> {
    const { scheduledEmailId, campaignId, recipientEmail, recipientName, subject, htmlBody, senderEmail, senderName } = job.data;

    // 1. Mark status as PROCESSING in DB
    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: {
        status: EmailStatus.PROCESSING,
        attemptCount: { increment: 1 },
      },
    });

    await prisma.queueLog.create({
      data: {
        scheduledEmailId,
        bullJobId: job.id,
        event: 'PROCESSING',
        level: LogLevel.INFO,
        message: `Worker started delivery attempt #${job.attemptsMade + 1}`,
        details: { attempt: job.attemptsMade + 1, workerConcurrency: config.scheduler.workerConcurrency },
      },
    });

    // 2. Dispatch email via Nodemailer
    const result = await emailService.sendEmail({
      to: recipientEmail,
      from: senderEmail,
      senderName: senderName || undefined,
      subject,
      html: htmlBody,
    });

    // 3. Mark as SENT in database
    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        messageId: result.messageId,
        etherealUrl: result.etherealUrl,
      },
    });

    // 4. Update campaign sent counter
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: 1 },
      },
    });

    // 5. Audit queue completion
    await prisma.queueLog.create({
      data: {
        scheduledEmailId,
        bullJobId: job.id,
        event: 'COMPLETED',
        level: LogLevel.INFO,
        message: `Email dispatched successfully (Message ID: ${result.messageId})`,
        details: {
          messageId: result.messageId,
          etherealUrl: result.etherealUrl,
        },
      },
    });

    // 6. Asynchronously sync to Elasticsearch
    elasticsearchService
      .indexEmail({
        id: scheduledEmailId,
        campaignId,
        recipient: recipientEmail,
        recipientName,
        subject,
        sender: senderEmail,
        status: EmailStatus.SENT,
        scheduledTime: job.data.scheduledAt,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
      .catch((err) => {
        workerLogger.warn(`Failed to sync to Elasticsearch: ${err.message}`);
      });

    return {
      messageId: result.messageId,
      etherealUrl: result.etherealUrl,
    };
  }

  /**
   * Handle job failure & Dead Letter Queue (DLQ) routing
   */
  private async handleJobFailure(job: Job<EmailJobPayload>, error: Error): Promise<void> {
    const { scheduledEmailId, campaignId } = job.data;
    const maxAttempts = job.opts.attempts || 5;
    const isExhausted = job.attemptsMade >= maxAttempts;

    // Update DB with latest error
    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: {
        status: isExhausted ? EmailStatus.FAILED : EmailStatus.RETRYING,
        lastError: error.message,
      },
    });

    await prisma.queueLog.create({
      data: {
        scheduledEmailId,
        bullJobId: job.id,
        event: isExhausted ? 'MOVED_TO_DLQ' : 'RETRY_SCHEDULED',
        level: LogLevel.ERROR,
        message: isExhausted
          ? `All ${maxAttempts} delivery attempts failed. Moved to Dead Letter Queue.`
          : `Attempt ${job.attemptsMade} failed: ${error.message}. Scheduling exponential retry.`,
        details: {
          error: error.message,
          attemptsMade: job.attemptsMade,
          maxAttempts,
        },
      },
    });

    // If all retries exhausted, send to DLQ
    if (isExhausted) {
      await dlqQueue.add('dead-email', {
        ...job.data,
        error: error.message,
        failedAt: new Date().toISOString(),
      });

      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          failedCount: { increment: 1 },
        },
      });

      workerLogger.warn(`Job ${job.id} moved to Dead Letter Queue (DLQ)`);
    }
  }

  /**
   * Stop the worker gracefully
   */
  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      workerLogger.info('BullMQ Email Worker shut down gracefully');
    }
  }
}

export const emailWorkerService = new EmailWorkerService();
