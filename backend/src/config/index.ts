import { env } from './env';

export const config = {
  app: {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
    apiBaseUrl: env.API_BASE_URL,
  },
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL || undefined,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
  },
  elasticsearch: {
    node: env.ELASTICSEARCH_NODE,
    username: env.ELASTICSEARCH_USERNAME || undefined,
    password: env.ELASTICSEARCH_PASSWORD || undefined,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    cookieSecret: env.COOKIE_SECRET,
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
  },
  slack: {
    clientId: env.SLACK_CLIENT_ID,
    clientSecret: env.SLACK_CLIENT_SECRET,
    signingSecret: env.SLACK_SIGNING_SECRET,
    redirectUri: env.SLACK_REDIRECT_URI,
    defaultWebhookUrl: env.DEFAULT_SLACK_WEBHOOK_URL,
  },
  email: {
    defaultSenderEmail: env.DEFAULT_SENDER_EMAIL,
    defaultSenderName: env.DEFAULT_SENDER_NAME,
    useEthereal: env.USE_ETHEREAL_EMAIL,
    etherealUser: env.ETHEREAL_USER,
    etherealPass: env.ETHEREAL_PASS,
  },
  scheduler: {
    maxEmailsPerHour: env.MAX_EMAILS_PER_HOUR,
    maxEmailsPerSender: env.MAX_EMAILS_PER_SENDER,
    emailDelaySeconds: env.EMAIL_DELAY_SECONDS,
    workerConcurrency: env.WORKER_CONCURRENCY,
  },
} as const;

export default config;
