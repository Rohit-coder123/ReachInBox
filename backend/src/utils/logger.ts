import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, stack, context, ...meta }) => {
    const ctx = context ? `[${context}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${ctx}${message}${metaStr}${stack ? `\n${stack}` : ''}`;
  })
);

export const logger = winston.createLogger({
  level: config.app.isProduction ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'reachinbox-backend' },
  transports: [
    new winston.transports.Console({
      format: config.app.isProduction ? logFormat : consoleFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
  ],
});

export const createScopedLogger = (moduleName: string) => {
  return {
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, { context: moduleName, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, { context: moduleName, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, { context: moduleName, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, { context: moduleName, ...meta }),
  };
};

export const queueLogger = createScopedLogger('Queue');
export const workerLogger = createScopedLogger('Worker');
export const apiLogger = createScopedLogger('API');
export const slackLogger = createScopedLogger('Slack');
export const smtpLogger = createScopedLogger('SMTP');

export default logger;
