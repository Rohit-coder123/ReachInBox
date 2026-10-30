import Redis, { RedisOptions } from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

const redisOptions: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: config.app.isTest,
  retryStrategy: (times: number) => {
    if (config.app.isTest || times > 3) {
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis connection retry attempt #${times} in ${delay}ms`);
    return delay;
  },
};

export const redisConnection = new Redis(redisOptions);

redisConnection.on('connect', () => {
  logger.info(`✅ Connected to Redis at ${config.redis.host}:${config.redis.port}`);
});

redisConnection.on('error', (err) => {
  if (!config.app.isTest) {
    logger.error('❌ Redis error:', { error: err.message });
  }
});

export const getRedisClient = (): Redis => redisConnection;

export default redisConnection;
