import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { emailWorkerService } from './workers/email.worker';
import { elasticsearchService } from './modules/search/elasticsearch.service';
import { redisConnection } from './config/redis';

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Initialize Elasticsearch Index
    elasticsearchService.initializeIndex().catch((err) => {
      logger.warn(`Elasticsearch index initialization warning: ${err.message}`);
    });

    // 3. Start BullMQ Email Worker
    emailWorkerService.startWorker();

    // 3. Initialize Express application
    const app = createApp();
    const server = http.createServer(app);

    // 4. Start listening
    server.listen(config.app.port, () => {
      logger.info(`🚀 ReachInbox API Server running on port ${config.app.port} [${config.app.env}]`);
      logger.info(`📖 Swagger API Docs available at http://localhost:${config.app.port}/api/docs`);
      logger.info(`📊 Bull-Board Queue Dashboard at http://localhost:${config.app.port}/admin/queues`);
      logger.info(`🩺 Health check endpoint: http://localhost:${config.app.port}/api/health`);
    });

    // 5. Graceful Shutdown Handlers
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await emailWorkerService.stopWorker();
        await disconnectDatabase();
        redisConnection.disconnect();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force terminate if not closed within 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start ReachInbox server:', { error });
    process.exit(1);
  }
};

startServer();
