process.env.THROTTLE_ENABLED = 'true';
process.env.THROTTLE_LIMIT = '2';
process.env.THROTTLE_TTL = '60';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/create-test-app';

describe('Throttling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'a@example.com', password: 'short' })
      .expect(400);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'b@example.com', password: 'short' })
      .expect(400);

    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'c@example.com', password: 'short' })
      .expect(429);

    expect(response.body).toMatchObject({
      success: false,
      code: 'E-THROTTLE',
    });
  });
});
