import { Router } from 'express';
import { queueController } from '../modules/queue/queue.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { asyncHandler } from '../shared/response';

export const queueRouter = Router();

queueRouter.use(authenticateJwt);

// Get real-time queue stats
queueRouter.get('/stats', asyncHandler(queueController.getQueueStats.bind(queueController)));

// Queue logs
queueRouter.get('/logs', asyncHandler(queueController.getQueueLogs.bind(queueController)));

// Queue actions
queueRouter.post('/pause', asyncHandler(queueController.pauseQueue.bind(queueController)));
queueRouter.post('/resume', asyncHandler(queueController.resumeQueue.bind(queueController)));
queueRouter.post('/retry-failed', asyncHandler(queueController.retryFailedJobs.bind(queueController)));

export default queueRouter;
