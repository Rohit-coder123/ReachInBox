import { Request, Response } from 'express';
import { authService } from './auth.service';
import { ApiResponse } from '../../shared/response';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { UnauthorizedError } from '../../shared/errors';

export class AuthController {
  /**
   * Handle successful Google OAuth callback
   */
  async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any;
      if (!user) {
        throw new UnauthorizedError('Google authentication failed');
      }

      const token = authService.generateToken(user);
      authService.setAuthCookie(res, token);

      // Redirect to frontend login handler with token to initialize session
      const redirectUrl = `${config.app.frontendUrl}/login?token=${encodeURIComponent(token)}`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Error during Google callback handling:', { error });
      res.redirect(`${config.app.frontendUrl}/login?error=auth_failed`);
    }
  }

  /**
   * Dev/Mock login for local testing and developer environments
   */
  async devLogin(req: Request, res: Response): Promise<void> {
    const { email, name } = req.body || {};
    const { user, token } = await authService.devLogin(email, name);

    authService.setAuthCookie(res, token);
    ApiResponse.success(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
        token,
      },
      'Authenticated successfully'
    );
  }

  /**
   * Get authenticated user profile
   */
  async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const profile = await authService.getUserProfile(req.user.id);
    if (!profile) {
      throw new UnauthorizedError('User not found');
    }

    ApiResponse.success(res, profile);
  }

  /**
   * Logout user and clear cookies
   */
  async logout(_req: Request, res: Response): Promise<void> {
    authService.clearAuthCookie(res);
    ApiResponse.success(res, { loggedOut: true }, 'Logged out successfully');
  }
}

export const authController = new AuthController();
