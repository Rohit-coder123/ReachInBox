import { Router } from 'express';
import { emailController } from '../modules/email/email.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { asyncHandler } from '../shared/response';

export const emailRouter = Router();

emailRouter.use(authenticateJwt);

// Scheduled emails table
emailRouter.get('/scheduled', asyncHandler(emailController.getScheduledEmails.bind(emailController)));

// Sent emails table
emailRouter.get('/sent', asyncHandler(emailController.getSentEmails.bind(emailController)));

// Single email detail
emailRouter.get('/:id', asyncHandler(emailController.getEmailById.bind(emailController)));

// Actions
emailRouter.post('/:id/cancel', asyncHandler(emailController.cancelEmail.bind(emailController)));
emailRouter.post('/:id/reschedule', asyncHandler(emailController.rescheduleEmail.bind(emailController)));

export default emailRouter;
