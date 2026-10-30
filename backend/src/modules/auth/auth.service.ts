import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { prisma } from '../../database/prisma';
import { config } from '../../config';
import { Role, User } from '@prisma/client';
import { JwtPayload } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';

export interface GoogleProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
}

export class AuthService {
  /**
   * Find existing user by googleId or email, or create new user
   */
  async findOrCreateGoogleUser(profile: GoogleProfile): Promise<User> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('Google profile does not contain an email address');
    }

    const avatar = profile.photos?.[0]?.value || null;
    const name = profile.displayName || email.split('@')[0];

    // Check if user exists by googleId
    let user = await prisma.user.findUnique({
      where: { googleId: profile.id },
    });

    if (user) {
      // Update avatar/name if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name, avatar },
      });
      return user;
    }

    // Check if user exists by email (link Google ID)
    user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          avatar: user.avatar || avatar,
        },
      });
      return user;
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        googleId: profile.id,
        email,
        name,
        avatar,
        role: Role.USER,
      },
    });

    logger.info(`New user registered via Google OAuth: ${email}`, { userId: user.id });

    // Create initial audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AUTH_REGISTER_GOOGLE',
        entity: 'User',
        entityId: user.id,
      },
    });

    return user;
  }

  /**
   * Generate signed JWT access token
   */
  generateToken(user: { id: string; email: string; role: Role }): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: '7d',
    });
  }

  /**
   * Set secure authentication cookie on response
   */
  setAuthCookie(res: Response, token: string): void {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: config.app.isProduction,
      sameSite: config.app.isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  /**
   * Clear authentication cookie
   */
  clearAuthCookie(res: Response): void {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: config.app.isProduction,
      sameSite: config.app.isProduction ? 'none' : 'lax',
    });
  }

  /**
   * Get user profile along with summary stats
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        slackConfig: {
          select: {
            isConnected: true,
            channelName: true,
            teamName: true,
          },
        },
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Demo/Dev login helper for local evaluation when Google credentials are not set in dev
   */
  async devLogin(email = 'admin@reachinbox.ai', name = 'Senior Staff Engineer'): Promise<{ user: User; token: string }> {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: Role.ADMIN,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        },
      });
    }

    const token = this.generateToken(user);
    return { user, token };
  }
}

export const authService = new AuthService();
