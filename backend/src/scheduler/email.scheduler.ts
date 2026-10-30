import { redisConnection } from '../config/redis';
import { emailQueue, EmailJobPayload } from '../queue/email.queue';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { queueLogger } from '../utils/logger';
import { EmailStatus, CampaignStatus, LogLevel } from '@prisma/client';

export interface ScheduleOptions {
  campaignId: string;
  senderEmail: string;
  senderName?: string | null;
  baseScheduledAt: Date;
  delaySeconds?: number;
  hourlyLimit?: number;
  maxSenderLimit?: number;
}

export class EmailScheduler {
  /**
   * Helper: Format Date to 'YYYY-MM-DD-HH' string for Redis hour bucket keys
   */
  private getHourKey(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${d}-${h}`;
  }

  /**
   * Schedule all recipients for an email campaign using BullMQ delayed jobs
   * with automatic next-hour rate limit rollover.
   */
  async scheduleCampaign(options: ScheduleOptions): Promise<{
    totalScheduled: number;
    totalRollovers: number;
    firstDelivery: Date;
    lastDelivery: Date;
  }> {
    const { campaignId, senderEmail, senderName, baseScheduledAt } = options;

    const delaySeconds = options.delaySeconds ?? config.scheduler.emailDelaySeconds;
    const globalHourlyLimit = options.hourlyLimit ?? config.scheduler.maxEmailsPerHour;
    const senderHourlyLimit = options.maxSenderLimit ?? config.scheduler.maxEmailsPerSender;

    queueLogger.info(`Beginning scheduling for campaign ${campaignId}`, {
      senderEmail,
      baseScheduledAt: baseScheduledAt.toISOString(),
      delaySeconds,
      globalHourlyLimit,
      senderHourlyLimit,
    });

    // 1. Fetch pending scheduled emails for this campaign
    const pendingEmails = await prisma.scheduledEmail.findMany({
      where: {
        campaignId,
        status: { in: [EmailStatus.PENDING, EmailStatus.FAILED] },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (pendingEmails.length === 0) {
      queueLogger.warn(`No pending emails found to schedule for campaign ${campaignId}`);
      return {
        totalScheduled: 0,
        totalRollovers: 0,
        firstDelivery: baseScheduledAt,
        lastDelivery: baseScheduledAt,
      };
    }

    let candidateTime = new Date(Math.max(baseScheduledAt.getTime(), Date.now()));
    let totalRollovers = 0;
    let emailsScheduledInCurrentHour = 0;
    let firstDelivery: Date | null = null;
    let lastDelivery: Date | null = null;

    const now = Date.now();

    for (let i = 0; i < pendingEmails.length; i++) {
      const emailRecord = pendingEmails[i];
      let assignedHour = false;
      let didRolloverForThisEmail = false;

      while (!assignedHour) {
        const hourKey = this.getHourKey(candidateTime);
        const globalKey = `rate:global:${hourKey}`;
        const senderKey = `rate:sender:${senderEmail}:${hourKey}`;

        // Get current counts atomically via multi
        const results = await redisConnection.multi().get(globalKey).get(senderKey).exec();
        const globalCount = parseInt((results?.[0]?.[1] as string) || '0', 10);
        const senderCount = parseInt((results?.[1]?.[1] as string) || '0', 10);

        if (globalCount >= globalHourlyLimit || senderCount >= senderHourlyLimit) {
          // Limit exceeded for this hour! Move candidate time to the next hour window
          didRolloverForThisEmail = true;
          totalRollovers++;

          // Roll forward to the top of the next hour
          candidateTime = new Date(candidateTime.getTime() + 3600 * 1000);
          candidateTime.setUTCMinutes(0, 0, 0);
          emailsScheduledInCurrentHour = 0;

          queueLogger.info(
            `Rate limit reached for ${hourKey} (global: ${globalCount}/${globalHourlyLimit}, sender: ${senderCount}/${senderHourlyLimit}). Rolling job over to next hour: ${this.getHourKey(candidateTime)}`,
            { emailId: emailRecord.id, recipient: emailRecord.recipientEmail }
          );
          continue;
        }

        // Capacity available in candidate hour! Increment Redis counters
        await redisConnection
          .multi()
          .incr(globalKey)
          .expire(globalKey, 48 * 3600)
          .incr(senderKey)
          .expire(senderKey, 48 * 3600)
          .exec();

        assignedHour = true;
      }

      // Calculate exact dispatch time with inter-email delay
      const emailDeliveryTimestamp = candidateTime.getTime() + emailsScheduledInCurrentHour * (delaySeconds * 1000);
      emailsScheduledInCurrentHour++;

      const scheduledDate = new Date(emailDeliveryTimestamp);
      if (!firstDelivery) firstDelivery = scheduledDate;
      lastDelivery = scheduledDate;

      // BullMQ delayed job delay in milliseconds
      const delayMs = Math.max(0, emailDeliveryTimestamp - now);

      const jobPayload: EmailJobPayload = {
        scheduledEmailId: emailRecord.id,
        campaignId,
        recipientEmail: emailRecord.recipientEmail,
        recipientName: emailRecord.recipientName,
        subject: emailRecord.subject,
        htmlBody: emailRecord.htmlBody,
        senderEmail,
        senderName,
        scheduledAt: scheduledDate.toISOString(),
      };

      // Create BullMQ Delayed Job (Jobs survive Redis restart via appendonly persistence)
      const job = await emailQueue.add('send-email', jobPayload, {
        delay: delayMs,
        jobId: `email:${emailRecord.id}`,
      });

      // Update PostgreSQL ScheduledEmail record
      await prisma.scheduledEmail.update({
        where: { id: emailRecord.id },
        data: {
          bullJobId: job.id,
          scheduledAt: scheduledDate,
          status: delayMs > 1000 ? EmailStatus.DELAYED : EmailStatus.QUEUED,
        },
      });

      // Persist Queue Log
      await prisma.queueLog.create({
        data: {
          scheduledEmailId: emailRecord.id,
          bullJobId: job.id,
          event: didRolloverForThisEmail ? 'ROLLOVER_AND_ENQUEUED' : 'ENQUEUED',
          level: didRolloverForThisEmail ? LogLevel.WARN : LogLevel.INFO,
          message: didRolloverForThisEmail
            ? `Email rolled over to next hour window and scheduled with ${Math.round(delayMs / 1000)}s delay`
            : `Email enqueued with ${Math.round(delayMs / 1000)}s delay`,
          details: {
            delayMs,
            scheduledDate: scheduledDate.toISOString(),
            didRollover: didRolloverForThisEmail,
            jobId: job.id,
          },
        },
      });
    }

    // Update Campaign status to SCHEDULED
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: firstDelivery || baseScheduledAt,
      },
    });

    queueLogger.info(
      `Campaign ${campaignId} scheduling complete. ${pendingEmails.length} emails scheduled, ${totalRollovers} rollovers occurred.`
    );

    return {
      totalScheduled: pendingEmails.length,
      totalRollovers,
      firstDelivery: firstDelivery || baseScheduledAt,
      lastDelivery: lastDelivery || baseScheduledAt,
    };
  }

  /**
   * Cancel an enqueued job by removing it from BullMQ and marking DB record as CANCELLED
   */
  async cancelJob(scheduledEmailId: string): Promise<boolean> {
    const email = await prisma.scheduledEmail.findUnique({
      where: { id: scheduledEmailId },
    });

    if (!email || !email.bullJobId) {
      return false;
    }

    const job = await emailQueue.getJob(email.bullJobId);
    if (job) {
      await job.remove();
    }

    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: { status: EmailStatus.PENDING, bullJobId: null },
    });

    await prisma.queueLog.create({
      data: {
        scheduledEmailId,
        event: 'JOB_CANCELLED',
        level: LogLevel.INFO,
        message: 'Scheduled job was cancelled and removed from queue',
      },
    });

    return true;
  }
}

export const emailScheduler = new EmailScheduler();
