import { Request, Response } from 'express';
import { campaignService } from './campaign.service';
import { ApiResponse } from '../../shared/response';
import { UnauthorizedError, BadRequestError } from '../../shared/errors';

export class CampaignController {
  /**
   * Parse recipients file (CSV/TXT) or string without scheduling
   */
  async parseRecipients(req: Request, res: Response): Promise<void> {
    let content = '';

    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    } else if (req.body && req.body.content) {
      content = req.body.content;
    } else {
      throw new BadRequestError('Please provide a file upload or text content in the request body');
    }

    const result = campaignService.parseRecipients(content);

    ApiResponse.success(
      res,
      {
        totalCount: result.totalCount,
        validCount: result.validCount,
        invalidCount: result.invalidCount,
        duplicatesRemoved: result.duplicateCount,
        validRecipients: result.valid.slice(0, 500),
        invalidRecipients: result.invalid.slice(0, 50),
      },
      'Recipient content parsed and validated successfully'
    );
  }

  /**
   * Create campaign and schedule BullMQ delayed delivery
   */
  async createCampaign(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const {
      title,
      subject,
      htmlBody,
      plainText,
      senderEmail,
      senderName,
      scheduledAt,
      delaySeconds,
      hourlyLimit,
      recipientsData,
    } = req.body;

    let effectiveRecipientsData = recipientsData;
    if (req.file) {
      effectiveRecipientsData = req.file.buffer.toString('utf-8');
    }

    if (!subject) throw new BadRequestError('Email subject is required');
    if (!htmlBody) throw new BadRequestError('Email HTML body is required');
    if (!effectiveRecipientsData) throw new BadRequestError('Recipient data is required');

    const result = await campaignService.createAndScheduleCampaign({
      userId: req.user.id,
      title: title || subject,
      subject,
      htmlBody,
      plainText,
      senderEmail,
      senderName,
      scheduledAt: scheduledAt || new Date().toISOString(),
      delaySeconds: delaySeconds !== undefined ? parseInt(String(delaySeconds), 10) : undefined,
      hourlyLimit: hourlyLimit !== undefined ? parseInt(String(hourlyLimit), 10) : undefined,
      recipientsData: effectiveRecipientsData,
    });

    ApiResponse.created(res, result, 'Campaign created and emails scheduled successfully');
  }

  /**
   * List campaigns
   */
  async getCampaigns(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await campaignService.getUserCampaigns(req.user.id, page, limit);

    ApiResponse.paginated(res, result.campaigns, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNext: result.page < result.totalPages,
      hasPrev: result.page > 1,
    });
  }

  /**
   * Get campaign detail
   */
  async getCampaignById(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const campaignId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const campaign = await campaignService.getCampaignById(campaignId, req.user.id);
    ApiResponse.success(res, campaign);
  }

  /**
   * Cancel campaign
   */
  async cancelCampaign(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const campaignId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await campaignService.cancelCampaign(campaignId, req.user.id);
    ApiResponse.success(res, result, 'Campaign cancelled successfully');
  }
}

export const campaignController = new CampaignController();
