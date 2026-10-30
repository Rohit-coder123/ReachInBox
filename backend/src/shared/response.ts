import { Request, Response, NextFunction } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface StandardResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown> | PaginationMeta;
  error?: {
    code?: string;
    details?: unknown;
  };
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200,
    meta?: Record<string, unknown>
  ): Response {
    const payload: StandardResponse<T> = {
      success: true,
      ...(message ? { message } : {}),
      data,
      ...(meta ? { meta } : {}),
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(
    res: Response,
    data: T,
    message = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string
  ): Response {
    return res.status(200).json({
      success: true,
      ...(message ? { message } : {}),
      data,
      meta: pagination,
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode = 400,
    details?: unknown
  ): Response {
    const payload: StandardResponse = {
      success: false,
      message,
      error: {
        code: `ERR_${statusCode}`,
        ...(details !== undefined ? { details } : {}),
      },
    };
    return res.status(statusCode).json(payload);
  }
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
