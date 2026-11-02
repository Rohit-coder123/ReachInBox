import { Router } from 'express';
import { slackController } from '../modules/slack/slack.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { asyncHandler } from '../shared/response';

export const slackRouter = Router();

// OAuth callback (unauthenticated or state-based)
slackRouter.get('/oauth/callback', asyncHandler(slackController.oauthCallback.bind(slackController)));

// Authenticated Slack routes
slackRouter.get('/status', authenticateJwt, asyncHandler(slackController.getStatus.bind(slackController)));
slackRouter.post('/webhook', authenticateJwt, asyncHandler(slackController.configureWebhook.bind(slackController)));
slackRouter.post('/test', authenticateJwt, asyncHandler(slackController.sendTestNotification.bind(slackController)));
slackRouter.post('/disconnect', authenticateJwt, asyncHandler(slackController.disconnect.bind(slackController)));
slackRouter.post('/demo-connect', authenticateJwt, asyncHandler(slackController.connectDemo.bind(slackController)));

export default slackRouter;
