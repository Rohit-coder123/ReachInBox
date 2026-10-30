import { Request, Response } from 'express';
import { prisma } from '../../database/prisma';
import { emailScheduler } from '../../scheduler/email.scheduler';
import { ApiResponse } from '../../shared/response';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../../shared/errors';
import { EmailStatus } from '@prisma/client';

export class EmailController {
  /**
   * List scheduled emails with filters, search, pagination, and sorting
   */
  async getScheduledEmails(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const { status, search, sortBy = 'scheduledAt', sortOrder = 'asc' } = req.query;

    const where: any = {
      campaign: { userId: req.user.id },
      status: status
        ? (status as EmailStatus)
        : { in: [EmailStatus.PENDING, EmailStatus.QUEUED, EmailStatus.DELAYED, EmailStatus.RETRYING] },
    };

    if (search) {
      where.OR = [
        { recipientEmail: { contains: String(search), mode: 'insensitive' } },
        { subject: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'scheduledAt' || sortBy === 'recipientEmail' || sortBy === 'status') {
      orderBy[String(sortBy)] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.scheduledAt = 'asc';
    }

    const [emails, total] = await Promise.all([
      prisma.scheduledEmail.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          campaign: {
            select: { title: true, id: true },
          },
        },
      }),
      prisma.scheduledEmail.count({ where }),
    ]);

    ApiResponse.paginated(res, emails, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    });
  }

  /**
   * List sent emails
   */
  async getSentEmails(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const { search } = req.query;

    const where: any = {
      campaign: { userId: req.user.id },
      status: EmailStatus.SENT,
    };

    if (search) {
      where.OR = [
        { recipientEmail: { contains: String(search), mode: 'insensitive' } },
        { subject: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.scheduledEmail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
        include: {
          campaign: {
            select: { title: true, id: true },
          },
        },
      }),
      prisma.scheduledEmail.count({ where }),
    ]);

    ApiResponse.paginated(res, emails, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    });
  }

  /**
   * Get single email detail with queue logs
   */
  async getEmailById(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const emailId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const email = await prisma.scheduledEmail.findFirst({
      where: {
        id: emailId,
        campaign: { userId: req.user.id },
      },
      include: {
        campaign: true,
        queueLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!email) {
      throw new NotFoundError('Email');
    }

    ApiResponse.success(res, email);
  }

  /**
   * Cancel an individual scheduled email
   */
  async cancelEmail(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const emailId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const email = await prisma.scheduledEmail.findFirst({
      where: {
        id: emailId,
        campaign: { userId: req.user.id },
      },
    });

    if (!email) throw new NotFoundError('Email');

    await emailScheduler.cancelJob(email.id);
    ApiResponse.success(res, { cancelled: true }, 'Scheduled email cancelled successfully');
  }

  /**
   * Reschedule an email to a new date/time
   */
  async rescheduleEmail(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    const { newScheduledAt } = req.body;

    if (!newScheduledAt) throw new BadRequestError('New scheduled time is required');

    const emailId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const email = await prisma.scheduledEmail.findFirst({
      where: {
        id: emailId,
        campaign: { userId: req.user.id },
      },
    });

    if (!email) throw new NotFoundError('Email');

    // Remove existing job
    await emailScheduler.cancelJob(email.id);

    // Reschedule
    const scheduleDate = new Date(newScheduledAt);
    await emailScheduler.scheduleCampaign({
      campaignId: email.campaignId,
      senderEmail: email.senderEmail,
      baseScheduledAt: scheduleDate,
    });

    ApiResponse.success(res, { rescheduled: true }, 'Email rescheduled successfully');
  }
}

export const emailController = new EmailController();
