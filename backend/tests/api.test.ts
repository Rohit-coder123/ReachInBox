import request from 'supertest';
import { createApp } from '../src/app';
import { redisConnection } from '../src/config/redis';
import { emailQueueEvents, emailQueue, dlqQueue } from '../src/queue/email.queue';

describe('API Integration Tests', () => {
  const app = createApp();

  afterAll(async () => {
    try {
      if (emailQueueEvents) {
        await emailQueueEvents.close();
      }
      await emailQueue.close();
      await dlqQueue.close();
      redisConnection.disconnect();
    } catch {
      // Ignore during test tear down
    }
  });

  it('GET / should return 200 with service information', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('ReachInbox Email Scheduling Engine');
    expect(res.body.status).toBe('ONLINE');
  });

  it('GET /api/health should return UP status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
  });

  it('GET /api/non-existent-route should return 404', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ERR_404');
  });
});
