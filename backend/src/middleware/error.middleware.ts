import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApplicationError } from '../shared/errors';
import { ApiResponse } from '../shared/response';
import { logger } from '../utils/logger';
import { config } from '../config';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const reqId = req.id || 'N/A';
  const duration = req.startTime ? `${Date.now() - req.startTime}ms` : 'N/A';

  // Handle Application Custom Errors
  if (err instanceof ApplicationError) {
    logger.warn(`Operational Error: ${err.message}`, {
      requestId: reqId,
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
      details: err.details,
      duration,
    });
    ApiResponse.error(res, err.message, err.statusCode, err.details);
    return;
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    logger.warn('Request Validation Error', {
      requestId: reqId,
      path: req.path,
      issues: formattedIssues,
      duration,
    });

    ApiResponse.error(res, 'Validation failed', 400, formattedIssues);
    return;
  }

  // Handle Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      logger.warn(`Unique constraint violation on: ${target}`, { requestId: reqId });
      ApiResponse.error(res, `A record with this ${target} already exists`, 409);
      return;
    }
    if (err.code === 'P2025') {
      ApiResponse.error(res, 'Record not found in database', 404);
      return;
    }
    logger.error('Prisma Known Error', { code: err.code, meta: err.meta, requestId: reqId });
    ApiResponse.error(res, 'Database operation failed', 500);
    return;
  }

  // Handle Syntax Error (JSON body parse failure)
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    ApiResponse.error(res, 'Malformed JSON payload received', 400);
    return;
  }

  // Unhandled / Unexpected Errors
  logger.error(`Unhandled Exception: ${err.message}`, {
    requestId: reqId,
    path: req.path,
    method: req.method,
    stack: err.stack,
    duration,
  });

  const responseMessage = config.app.isProduction
    ? 'An unexpected error occurred on the server'
    : err.message;

  ApiResponse.error(res, responseMessage, 500, config.app.isProduction ? undefined : { stack: err.stack });
};
