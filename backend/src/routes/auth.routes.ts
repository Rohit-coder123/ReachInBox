import { Router } from 'express';
import passport from 'passport';
import { authController } from '../modules/auth/auth.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limiter.middleware';
import { asyncHandler } from '../shared/response';

export const authRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and Google OAuth flows
 */

// Google OAuth initiate
authRouter.get(
  '/google',
  authRateLimiter,
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

// Google OAuth callback
authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/auth/failure',
  }),
  asyncHandler(authController.googleCallback.bind(authController))
);

authRouter.get('/failure', (_req, res) => {
  res.status(401).json({
    success: false,
    message: 'Google authentication failed or was cancelled',
  });
});

// Dev / local login
authRouter.post('/dev-login', authRateLimiter, asyncHandler(authController.devLogin.bind(authController)));

// Authenticated current user
authRouter.get('/me', authenticateJwt, asyncHandler(authController.getMe.bind(authController)));

// Logout
authRouter.post('/logout', asyncHandler(authController.logout.bind(authController)));

export default authRouter;
