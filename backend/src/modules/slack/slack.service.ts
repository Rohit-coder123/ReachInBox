import { WebClient } from '@slack/web-api';
import { prisma } from '../../database/prisma';
import { config } from '../../config';
import { slackLogger } from '../../utils/logger';

export class SlackService {
  /**
   * Exchange OAuth authorization code for Slack access token
   */
  async exchangeOAuthCode(userId: string, code: string): Promise<boolean> {
    try {
      const client = new WebClient();
      const response = await client.oauth.v2.access({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code,
        redirect_uri: config.slack.redirectUri,
      });

      if (!response.ok) {
        slackLogger.error('Slack OAuth token exchange failed', { error: response.error });
        return false;
      }

      await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          accessToken: response.access_token,
          teamId: response.team?.id,
          teamName: response.team?.name,
          channelId: (response.incoming_webhook as any)?.channel_id,
          channelName: (response.incoming_webhook as any)?.channel,
          webhookUrl: (response.incoming_webhook as any)?.url,
          isConnected: true,
        },
        create: {
          userId,
          accessToken: response.access_token,
          teamId: response.team?.id,
          teamName: response.team?.name,
          channelId: (response.incoming_webhook as any)?.channel_id,
          channelName: (response.incoming_webhook as any)?.channel,
          webhookUrl: (response.incoming_webhook as any)?.url,
          isConnected: true,
        },
      });

      slackLogger.info(`Slack connected successfully for user ${userId} (Team: ${response.team?.name})`);
      return true;
    } catch (error: any) {
      slackLogger.error('Slack OAuth exchange exception', { error: error.message });
      return false;
    }
  }

  /**
   * Save incoming webhook URL directly (manual user configuration)
   */
  async saveWebhook(userId: string, webhookUrl: string, channelName?: string): Promise<void> {
    await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        webhookUrl,
        channelName: channelName || '#general',
        isConnected: true,
      },
      create: {
        userId,
        webhookUrl,
        channelName: channelName || '#general',
        isConnected: true,
      },
    });

    slackLogger.info(`Saved Slack webhook for user ${userId}`);
  }

  /**
   * Send notification to Slack via WebClient or Webhook URL
   * Wrapped in try/catch to NEVER crash if Slack is disconnected or failing
   */
  async sendNotification(userId: string, messageText: string, blocks?: any[]): Promise<boolean> {
    try {
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId },
      });

      const webhookUrl = integration?.webhookUrl || config.slack.defaultWebhookUrl;
      const accessToken = integration?.accessToken;

      if (!integration?.isConnected && !config.slack.defaultWebhookUrl) {
        slackLogger.debug(`Slack not connected for user ${userId}. Skipping alert.`);
        return false;
      }

      // 1. Try sending via Webhook URL if available
      if (webhookUrl) {
        if (webhookUrl.includes('/DEMO/') || webhookUrl.includes('SANDBOX')) {
          slackLogger.info(`[Demo Slack Sandbox] Dispatched alert to ${integration?.channelName || '#general'}: "${messageText}"`, {
            userId,
            blocks,
          });
          return true;
        }

        const payload: Record<string, unknown> = {
          text: messageText,
        };
        if (blocks && blocks.length > 0) {
          payload.blocks = blocks;
        }

        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          slackLogger.info(`Dispatched Slack webhook notification to user ${userId}`);
          return true;
        }
      }

      // 2. Try sending via Slack Web API client
      if (accessToken && integration?.channelId) {
        const client = new WebClient(accessToken);
        await client.chat.postMessage({
          channel: integration.channelId,
          text: messageText,
          blocks,
        });
        slackLogger.info(`Dispatched Slack WebClient notification to channel ${integration.channelId}`);
        return true;
      }

      return false;
    } catch (error: any) {
      slackLogger.warn(`Slack alert dispatch failed gracefully: ${error.message}`);
      return false;
    }
  }

  /**
   * Alert user when sender reaches hourly limit and auto-rollover triggers
   */
  async sendRateLimitAlert(params: {
    userId: string;
    senderEmail: string;
    hourlyLimit: number;
    currentHour: string;
    nextHour: string;
    campaignId?: string;
  }): Promise<void> {
    const text = `⚠️ [ReachInbox Alert] Sender ${params.senderEmail} reached hourly limit of ${params.hourlyLimit} emails/hour. Remaining emails have been automatically rolled over to ${params.nextHour}.`;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Sender Hourly Rate Limit Exceeded',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Sender:*\n\`${params.senderEmail}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Hourly Cap:*\n${params.hourlyLimit} emails/hr`,
          },
          {
            type: 'mrkdwn',
            text: `*Current Window:*\n\`${params.currentHour}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Rolled Over To:*\n\`${params.nextHour}\``,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '✨ *Zero Emails Dropped:* ReachInbox automatically staggered and delayed jobs into the next hour window.',
          },
        ],
      },
    ];

    await this.sendNotification(params.userId, text, blocks);
  }
}

export const slackService = new SlackService();
