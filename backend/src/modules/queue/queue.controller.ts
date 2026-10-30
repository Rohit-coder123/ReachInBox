import { Request, Response } from 'express';
import { emailQueue, dlqQueue } from '../../queue/email.queue';
import { prisma } from '../../database/prisma';
import { ApiResponse } from '../../shared/response';
import { config } from '../../config';
import { EmailStatus } from '@prisma/client';

export class QueueController {
  /**
   * Get real-time queue metrics and worker stats
   */
  async getQueueStats(_req: Request, res: Response): Promise<void> {
    const [counts, dlqCounts, dbCounts] = await Promise.all([
      emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
      dlqQueue.getJobCounts('waiting', 'completed', 'failed'),
      prisma.scheduledEmail.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const dbStatusMap: Record<string, number> = {};
    dbCounts.forEach((item) => {
      dbStatusMap[item.status] = item._count.id;
    });

    const stats = {
      bullmq: {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0,
        dlq: dlqCounts.waiting || 0,
      },
      database: {
        pending: dbStatusMap[EmailStatus.PENDING] || 0,
        queued: dbStatusMap[EmailStatus.QUEUED] || 0,
        delayed: dbStatusMap[EmailStatus.DELAYED] || 0,
        processing: dbStatusMap[EmailStatus.PROCESSING] || 0,
        sent: dbStatusMap[EmailStatus.SENT] || 0,
        failed: dbStatusMap[EmailStatus.FAILED] || 0,
        retrying: dbStatusMap[EmailStatus.RETRYING] || 0,
      },
      worker: {
        concurrency: config.scheduler.workerConcurrency,
        maxEmailsPerHour: config.scheduler.maxEmailsPerHour,
        maxEmailsPerSender: config.scheduler.maxEmailsPerSender,
        emailDelaySeconds: config.scheduler.emailDelaySeconds,
        isPaused: await emailQueue.isPaused(),
      },
    };

    ApiResponse.success(res, stats);
  }

  /**
   * Pause the email dispatch queue
   */
  async pauseQueue(_req: Request, res: Response): Promise<void> {
    await emailQueue.pause();
    ApiResponse.success(res, { isPaused: true }, 'Email queue paused successfully');
  }

  /**
   * Resume the email dispatch queue
   */
  async resumeQueue(_req: Request, res: Response): Promise<void> {
    await emailQueue.resume();
    ApiResponse.success(res, { isPaused: false }, 'Email queue resumed successfully');
  }

  /**
   * Retry all failed jobs in queue
   */
  async retryFailedJobs(_req: Request, res: Response): Promise<void> {
    const failedJobs = await emailQueue.getFailed();
    let retriedCount = 0;

    for (const job of failedJobs) {
      await job.retry();
      retriedCount++;
    }

    ApiResponse.success(res, { retriedCount }, `Retried ${retriedCount} failed jobs`);
  }

  /**
   * Get queue event logs from QueueLog table
   */
  async getQueueLogs(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.queueLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          scheduledEmail: {
            select: {
              recipientEmail: true,
              subject: true,
              senderEmail: true,
            },
          },
        },
      }),
      prisma.queueLog.count(),
    ]);

    ApiResponse.paginated(
      res,
      logs,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    );
  }
}

export const queueController = new QueueController();
