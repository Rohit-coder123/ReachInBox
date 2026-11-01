import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../../config';
import { authService, GoogleProfile } from './auth.service';
import { logger } from '../../utils/logger';
import { prisma } from '../../database/prisma';

export const configurePassport = (): void => {
  // Always configure real Google OAuth 2.0 Strategy pointing directly to accounts.google.com
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId || 'your_google_client_id.apps.googleusercontent.com',
        clientSecret: config.google.clientSecret || 'your_google_client_secret',
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
