import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rate-limiter.middleware';
import { configurePassport } from './modules/auth/passport.config';
import { swaggerSpec } from './config/swagger';
import { authRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';
import { queueRouter } from './routes/queue.routes';
import { bullBoardRouter } from './queue/bull-board';
import { logger } from './utils/logger';

export const createApp = (): Application => {
  const app = express();

  // 1. Security & Header Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: config.app.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: [config.app.frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // 2. Parsers & Cookies
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));
  app.use(cookieParser(config.jwt.cookieSecret));

  // 3. Request Tracking Middleware
  app.use(requestIdMiddleware);

  // 4. Request Logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logFn = res.statusCode >= 500 ? logger.error : res.statusCode >= 400 ? logger.warn : logger.info;
      logFn(`${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, {
        requestId: req.id,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
      });
    });
    next();
  });

  // 5. Passport OAuth Setup
  configurePassport();
  app.use(passport.initialize());

  // 6. Global Rate Limiter
  app.use('/api/', apiRateLimiter);

  // 7. Swagger Documentation Route
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  // 8. Bull-Board Queue Dashboard
  app.use('/admin/queues', bullBoardRouter);

  // 9. Core API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/queue', queueRouter);

  // 9. Root Welcome Route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'ReachInbox Email Scheduling Engine',
      version: '1.0.0',
      status: 'ONLINE',
      docs: '/api/docs',
      health: '/api/health',
    });
  });

  // 10. 404 Route Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      error: { code: 'ERR_404' },
    });
  });

  // 11. Global Error Middleware
  app.use(errorMiddleware);

  return app;
};

export default createApp;
