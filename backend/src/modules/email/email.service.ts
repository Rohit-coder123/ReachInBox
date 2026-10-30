import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config';
import { smtpLogger } from '../../utils/logger';

export interface EmailSendOptions {
  to: string;
  from?: string;
  senderName?: string;
  subject: string;
  html: string;
  text?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}

export interface EmailSendResult {
  messageId: string;
  etherealUrl?: string | null;
  accepted: string[];
  rejected: string[];
}

export class EmailService {
  private defaultTransporter: Transporter | null = null;
  private etherealAccount: nodemailer.TestAccount | null = null;
  private isInitializing = false;

  /**
   * Initialize or retrieve Nodemailer transporter
   */
  async getTransporter(customConfig?: EmailSendOptions['smtpConfig']): Promise<Transporter> {
    if (customConfig) {
      return nodemailer.createTransport({
        host: customConfig.host,
        port: customConfig.port,
        secure: customConfig.secure,
        auth: {
          user: customConfig.user,
          pass: customConfig.pass,
        },
      });
    }

    if (this.defaultTransporter) {
      return this.defaultTransporter;
    }

    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.defaultTransporter) return this.defaultTransporter;
    }

    this.isInitializing = true;

    try {
      if (config.email.useEthereal) {
        if (config.email.etherealUser && config.email.etherealPass) {
          this.defaultTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: config.email.etherealUser,
              pass: config.email.etherealPass,
            },
          });
          smtpLogger.info(`Connected to Ethereal SMTP with user: ${config.email.etherealUser}`);
        } else {
          smtpLogger.info('Generating new Ethereal test account...');
          this.etherealAccount = await nodemailer.createTestAccount();
          this.defaultTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: this.etherealAccount.user,
              pass: this.etherealAccount.pass,
            },
          });
          smtpLogger.info(`Created Ethereal test account: ${this.etherealAccount.user}`);
        }
      } else {
        // Fallback default transport
        this.defaultTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
        });
      }

      return this.defaultTransporter;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Send an individual email
   */
  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    const transporter = await this.getTransporter(options.smtpConfig);

    const fromAddress = options.from || config.email.defaultSenderEmail;
    const fromName = options.senderName || config.email.defaultSenderName;
    const formattedFrom = `"${fromName}" <${fromAddress}>`;

    smtpLogger.info(`Sending email to ${options.to} from ${formattedFrom} with subject "${options.subject}"`);

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
    });

    let etherealUrl: string | null = null;
    if (config.email.useEthereal) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) {
        etherealUrl = url.toString();
        smtpLogger.info(`📬 Ethereal preview URL: ${etherealUrl}`);
      }
    }

    return {
      messageId: info.messageId,
      etherealUrl,
      accepted: (info.accepted as string[]) || [options.to],
      rejected: (info.rejected as string[]) || [],
    };
  }

  /**
   * Verify SMTP connectivity
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      smtpLogger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      smtpLogger.error('SMTP connection verification failed', { error });
      return false;
    }
  }
}

export const emailService = new EmailService();
