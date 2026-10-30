import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

// Log queries and errors
prisma.$on('error' as never, (e: unknown) => {
  logger.error('Prisma Error', { error: e });
});

prisma.$on('warn' as never, (e: unknown) => {
  logger.warn('Prisma Warning', { warning: e });
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected successfully via Prisma');
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL database:', { error });
    // Don't crash immediately in dev/test to allow graceful bootstrap
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected gracefully');
  } catch (error) {
    logger.error('Error during PostgreSQL disconnect:', { error });
  }
};

export default prisma;
