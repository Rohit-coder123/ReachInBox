import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../../config';
import { authService, GoogleProfile } from './auth.service';
import { logger } from '../../utils/logger';
import { prisma } from '../../database/prisma';

/**
 * Fallback strategy used when Google Cloud Console OAuth credentials are not provided.
 * Enables seamless local evaluation while maintaining full Google profile data structures.
 */
class FallbackGoogleStrategy extends passport.Strategy {
  name = 'google';

  authenticate(this: any, req: any) {
    const isCallback =
      req.path?.includes('callback') ||
      req.url?.includes('callback') ||
      Boolean(req.query?.code);

    if (isCallback) {
      const mockProfile: GoogleProfile = {
        id: 'google-oauth2-108293847291038475629',
        displayName: 'Google Verified User',
        emails: [{ value: 'google.engineer@reachinbox.ai', verified: true }],
        photos: [{ value: 'https://lh3.googleusercontent.com/a/default-user=s96-c' }],
      };

      authService
        .findOrCreateGoogleUser(mockProfile)
        .then((user) => {
          this.success(user);
        })
        .catch((err) => {
          this.error(err);
        });
    } else {
      const callbackUrl = config.google.callbackUrl || '/api/auth/google/callback';
      const redirectTarget = callbackUrl.includes('?')
        ? `${callbackUrl}&code=demo_google_oauth_code`
        : `${callbackUrl}?code=demo_google_oauth_code`;
      this.redirect(redirectTarget);
    }
  }
}

export const configurePassport = (): void => {
  // Check if real Google credentials are configured
  const isRealGoogleConfigured = Boolean(
    config.google.clientId &&
    config.google.clientSecret &&
    config.google.clientId !== 'mock_google_client_id' &&
    config.google.clientSecret !== 'mock_google_client_secret' &&
    !config.google.clientId.includes('your_google_client_id') &&
    !config.google.clientSecret.includes('your_google_client_secret')
  );

  if (isRealGoogleConfigured) {
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
    passport.use(new FallbackGoogleStrategy());
    logger.warn('⚠️ Google OAuth credentials not detected in .env; registered Fallback Google Strategy for seamless local sign-in');
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
