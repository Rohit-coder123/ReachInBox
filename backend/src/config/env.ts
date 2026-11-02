import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  API_BASE_URL: z.string().default('http://localhost:5000'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public'),

  REDIS_URL: z.string().optional().default(''),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
  ELASTICSEARCH_USERNAME: z.string().optional().default(''),
  ELASTICSEARCH_PASSWORD: z.string().optional().default(''),

  JWT_SECRET: z.string().min(16).default('super_secret_production_ready_jwt_key_32_chars_min!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16).default('super_secret_cookie_signing_key_reachinbox!'),

  GOOGLE_CLIENT_ID: z.string().optional().default('mock_google_client_id'),
  GOOGLE_CLIENT_SECRET: z.string().optional().default('mock_google_client_secret'),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/auth/google/callback'),

  SLACK_CLIENT_ID: z.string().optional().default(''),
  SLACK_CLIENT_SECRET: z.string().optional().default(''),
  SLACK_SIGNING_SECRET: z.string().optional().default(''),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:5000/api/slack/oauth/callback'),
  DEFAULT_SLACK_WEBHOOK_URL: z.string().optional().default(''),

  DEFAULT_SENDER_EMAIL: z.string().email().default('scheduler@reachinbox.ai'),
  DEFAULT_SENDER_NAME: z.string().default('ReachInbox Engine'),
  USE_ETHEREAL_EMAIL: z.coerce.boolean().default(true),
  ETHEREAL_USER: z.string().optional().default(''),
  ETHEREAL_PASS: z.string().optional().default(''),

  MAX_EMAILS_PER_HOUR: z.coerce.number().default(200),
  MAX_EMAILS_PER_SENDER: z.coerce.number().default(50),
  EMAIL_DELAY_SECONDS: z.coerce.number().default(2),
  WORKER_CONCURRENCY: z.coerce.number().default(5),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment validation failed:', JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
