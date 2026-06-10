import express from 'express';
import request from 'supertest';
import { getHelmetMiddleware } from '../../../src/configuration/helmet';

const createApp = (useHelmet: boolean) => {
  const app = express();

  if (useHelmet) {
    app.use(getHelmetMiddleware());
  }

  app.get('/test', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
};

describe('Helmet configuration', () => {
  it('sets security headers when helmet middleware is applied', async () => {
    const app = createApp(true);

    const response = await request(app).get('/test').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['cross-origin-resource-policy']).toBe(
      'cross-origin',
    );
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  it('does not set helmet headers when middleware is not applied', async () => {
    const app = createApp(false);

    const response = await request(app).get('/test').expect(200);

    expect(response.headers['x-content-type-options']).toBeUndefined();
    expect(response.headers['x-frame-options']).toBeUndefined();
    expect(response.headers['cross-origin-resource-policy']).toBeUndefined();
  });
});
