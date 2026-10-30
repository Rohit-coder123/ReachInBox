import { Request, Response } from 'express';
import { config } from '../../config';
import { ApiResponse } from '../../shared/response';
import { UnauthorizedError } from '../../shared/errors';

// In-memory runtime settings overlay (merged with config)
const runtimeSettings = {
  maxEmailsPerHour: config.scheduler.maxEmailsPerHour,
  maxEmailsPerSender: config.scheduler.maxEmailsPerSender,
  emailDelaySeconds: config.scheduler.emailDelaySeconds,
  workerConcurrency: config.scheduler.workerConcurrency,
  defaultSenderEmail: config.email.defaultSenderEmail,
  defaultSenderName: config.email.defaultSenderName,
  useEthereal: config.email.useEthereal,
};

export class SettingsController {
  /**
   * Get application settings
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    ApiResponse.success(res, {
      rateLimits: {
        maxEmailsPerHour: runtimeSettings.maxEmailsPerHour,
        maxEmailsPerSender: runtimeSettings.maxEmailsPerSender,
        emailDelaySeconds: runtimeSettings.emailDelaySeconds,
        workerConcurrency: runtimeSettings.workerConcurrency,
      },
      sender: {
        defaultSenderEmail: runtimeSettings.defaultSenderEmail,
        defaultSenderName: runtimeSettings.defaultSenderName,
      },
      smtp: {
        useEthereal: runtimeSettings.useEthereal,
        provider: runtimeSettings.useEthereal ? 'Ethereal SMTP (Test Sandbox)' : 'Custom Production SMTP',
      },
    });
  }

  /**
   * Update configurable settings
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();

    const {
      maxEmailsPerHour,
      maxEmailsPerSender,
      emailDelaySeconds,
      workerConcurrency,
      defaultSenderEmail,
      defaultSenderName,
    } = req.body;

    if (maxEmailsPerHour !== undefined) {
      runtimeSettings.maxEmailsPerHour = Math.max(1, parseInt(String(maxEmailsPerHour), 10));
    }
    if (maxEmailsPerSender !== undefined) {
      runtimeSettings.maxEmailsPerSender = Math.max(1, parseInt(String(maxEmailsPerSender), 10));
    }
    if (emailDelaySeconds !== undefined) {
      runtimeSettings.emailDelaySeconds = Math.max(0, parseInt(String(emailDelaySeconds), 10));
    }
    if (workerConcurrency !== undefined) {
      runtimeSettings.workerConcurrency = Math.max(1, parseInt(String(workerConcurrency), 10));
    }
    if (defaultSenderEmail) {
      runtimeSettings.defaultSenderEmail = String(defaultSenderEmail);
    }
    if (defaultSenderName) {
      runtimeSettings.defaultSenderName = String(defaultSenderName);
    }

    ApiResponse.success(res, runtimeSettings, 'Settings updated successfully');
  }
}

export const settingsController = new SettingsController();
