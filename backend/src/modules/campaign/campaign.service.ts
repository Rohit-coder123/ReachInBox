import { prisma } from '../../database/prisma';
import { emailScheduler } from '../../scheduler/email.scheduler';
import { EmailParser } from '../../utils/email-parser';
import { CampaignStatus, EmailStatus, LogLevel } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface CreateCampaignDto {
  userId: string;
  title: string;
  subject: string;
  htmlBody: string;
  plainText?: string;
  senderEmail?: string;
  senderName?: string;
  scheduledAt: string | Date;
  delaySeconds?: number;
  hourlyLimit?: number;
  recipientsData: string; // CSV/TXT content or email list string
}

export class CampaignService {
  /**
   * Parse recipient list and return validation metrics
   */
  parseRecipients(content: string) {
    return EmailParser.parseTextOrCsv(content);
  }

  /**
   * Create campaign and schedule email jobs
   */
  async createAndScheduleCampaign(dto: CreateCampaignDto) {
    const parseResult = this.parseRecipients(dto.recipientsData);

    if (parseResult.validCount === 0) {
      throw new BadRequestError('No valid email recipients found in provided content', {
        invalid: parseResult.invalid.slice(0, 10),
      });
    }

    const scheduledDate = new Date(dto.scheduledAt);
    const effectiveScheduleDate = isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now()
      ? new Date()
      : scheduledDate;

    const senderEmail = dto.senderEmail || config.email.defaultSenderEmail;
    const senderName = dto.senderName || config.email.defaultSenderName;
    const delaySeconds = dto.delaySeconds ?? config.scheduler.emailDelaySeconds;
    const hourlyLimit = dto.hourlyLimit ?? config.scheduler.maxEmailsPerHour;

    // 1. Create EmailCampaign record
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId: dto.userId,
        title: dto.title || dto.subject,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        plainText: dto.plainText,
        senderEmail,
        senderName,
        status: CampaignStatus.DRAFT,
        scheduledAt: effectiveScheduleDate,
        delaySeconds,
        hourlyLimit,
        totalRecipients: parseResult.validCount,
      },
    });

    // 2. Bulk insert EmailRecipient records
    await prisma.emailRecipient.createMany({
      data: parseResult.valid.map((r) => ({
        campaignId: campaign.id,
        email: r.email,
        name: r.name,
      })),
    });

    // 3. Bulk insert ScheduledEmail records
    await prisma.scheduledEmail.createMany({
      data: parseResult.valid.map((r) => ({
        campaignId: campaign.id,
        recipientEmail: r.email,
        recipientName: r.name,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        senderEmail,
        status: EmailStatus.PENDING,
        scheduledAt: effectiveScheduleDate,
      })),
    });

    // 4. Audit Log
    await prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: 'CAMPAIGN_CREATED',
        entity: 'EmailCampaign',
        entityId: campaign.id,
        metadata: {
          recipientCount: parseResult.validCount,
          scheduledAt: effectiveScheduleDate.toISOString(),
        },
      },
    });

    // 5. Schedule via BullMQ delayed jobs
    const scheduleResult = await emailScheduler.scheduleCampaign({
      campaignId: campaign.id,
      senderEmail,
      senderName,
      baseScheduledAt: effectiveScheduleDate,
      delaySeconds,
      hourlyLimit,
    });

    logger.info(`Campaign ${campaign.id} created and scheduled with ${parseResult.validCount} recipients`);

    return {
      campaign,
      parseMetrics: {
        totalFound: parseResult.totalCount,
        validCount: parseResult.validCount,
        invalidCount: parseResult.invalidCount,
        duplicatesRemoved: parseResult.duplicateCount,
      },
      scheduling: scheduleResult,
    };
  }

  /**
   * Get campaigns for user
   */
  async getUserCampaigns(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { scheduledEmails: true },
          },
        },
      }),
      prisma.emailCampaign.count({ where: { userId } }),
    ]);

    return {
      campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get campaign detail by id
   */
  async getCampaignById(campaignId: string, userId?: string) {
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id: campaignId,
        ...(userId ? { userId } : {}),
      },
      include: {
        recipients: { take: 50 },
        scheduledEmails: {
          take: 50,
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    return campaign;
  }

  /**
   * Cancel campaign and all pending scheduled emails
   */
  async cancelCampaign(campaignId: string, userId: string) {
    const campaign = await this.getCampaignById(campaignId, userId);

    // Cancel all pending jobs in BullMQ
    const pendingEmails = await prisma.scheduledEmail.findMany({
      where: {
        campaignId,
        status: { in: [EmailStatus.PENDING, EmailStatus.QUEUED, EmailStatus.DELAYED] },
      },
    });

    for (const email of pendingEmails) {
      await emailScheduler.cancelJob(email.id);
    }

    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.CANCELLED },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CAMPAIGN_CANCELLED',
        entity: 'EmailCampaign',
        entityId: campaign.id,
      },
    });

    return { cancelled: true, emailsCancelled: pendingEmails.length };
  }
}

export const campaignService = new CampaignService();
