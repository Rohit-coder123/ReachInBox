import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../../config';
import { authService, GoogleProfile } from './auth.service';
import { logger } from '../../utils/logger';
import { prisma } from '../../database/prisma';

export const configurePassport = (): void => {
  // Check if real Google credentials are configured
  if (
    config.google.clientId &&
    config.google.clientId !== 'mock_google_client_id' &&
    config.google.clientSecret &&
    config.google.clientSecret !== 'mock_google_client_secret'
  ) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
          scope: ['profile', 'email'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await authService.findOrCreateGoogleUser(profile as unknown as GoogleProfile);
            return done(null, user);
          } catch (error) {
            logger.error('Google OAuth strategy verification error:', { error });
            return done(error as Error, undefined);
          }
        }
      )
    );
    logger.info('✅ Real Google OAuth Strategy initialized in Passport');
  } else {
    logger.warn('⚠️ Google OAuth credentials not set; Passport initialized in fallback mode');
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, avatar: true, role: true },
      });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
