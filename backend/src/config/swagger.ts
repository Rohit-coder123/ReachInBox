import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './index';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ReachInbox Email Scheduling Engine API',
    version: '1.0.0',
    description:
      'Production Grade Distributed Email Scheduler API built with Express, TypeScript, BullMQ, Redis, Elasticsearch, and PostgreSQL.',
    contact: {
      name: 'ReachInbox Engineering',
      url: 'https://reachinbox.ai',
    },
  },
  servers: [
    {
      url: config.app.apiBaseUrl,
      description: 'Current Environment Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options: swaggerJSDoc.Options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/modules/**/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
