import { Request, Response } from 'express';
import { slackService } from './slack.service';
import { prisma } from '../../database/prisma';
import { ApiResponse } from '../../shared/response';
import { config } from '../../config';
import { UnauthorizedError } from '../../shared/errors';

export class SlackController {
  /**
   * Get Slack integration status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: req.user.id },
    });

    ApiResponse.success(res, {
      isConnected: Boolean(integration?.isConnected),
      teamName: integration?.teamName || null,
      channelName: integration?.channelName || null,
      hasWebhook: Boolean(integration?.webhookUrl),
      alertOnRateLimit: integration?.alertOnRateLimit ?? true,
      alertOnFailure: integration?.alertOnFailure ?? true,
    });
  }

  /**
   * Save incoming webhook URL
   */
  async configureWebhook(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    const { webhookUrl, channelName } = req.body;

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
      ApiResponse.error(res, 'A valid HTTP(S) Slack webhook URL is required', 400);
      return;
    }

    await slackService.saveWebhook(req.user.id, webhookUrl, channelName);
    ApiResponse.success(res, { isConnected: true }, 'Slack webhook configured successfully');
  }

  /**
   * Send test notification to verify integration
   */
  async sendTestNotification(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const sent = await slackService.sendNotification(
      req.user.id,
      '🎉 ReachInbox Test: Slack integration is functioning perfectly!'
    );

    if (sent) {
      ApiResponse.success(res, { sent: true }, 'Test Slack notification sent successfully!');
    } else {
      ApiResponse.error(res, 'Could not deliver Slack notification. Please check webhook URL or bot permissions.', 400);
    }
  }

  /**
   * Disconnect Slack integration
   */
  async disconnect(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    await prisma.slackIntegration.deleteMany({
      where: { userId: req.user.id },
    });

    ApiResponse.success(res, { isConnected: false }, 'Slack disconnected successfully');
  }

  /**
   * Handle Slack OAuth callback
   */
  async oauthCallback(req: Request, res: Response): Promise<void> {
    const { code, state } = req.query;
    const userId = (state as string) || (req.user as any)?.id;

    if (!code || typeof code !== 'string') {
      res.redirect(`${config.app.frontendUrl}/settings?error=slack_code_missing`);
      return;
    }

    if (userId) {
      await slackService.exchangeOAuthCode(userId, code);
    }

    res.redirect(`${config.app.frontendUrl}/settings?slack=connected`);
  }
}

export const slackController = new SlackController();
