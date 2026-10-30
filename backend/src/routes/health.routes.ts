import { Router, Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { asyncHandler, ApiResponse } from '../shared/response';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    ApiResponse.success(res, {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  })
);

healthRouter.get(
  '/deep',
  asyncHandler(async (_req: Request, res: Response) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // 1. PostgreSQL Check
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = { status: 'HEALTHY', latencyMs: Date.now() - dbStart };
    } catch (err: any) {
      checks.postgres = { status: 'UNHEALTHY', error: err.message };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'HEALTHY');

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: checks,
    });
  })
);

export default healthRouter;
