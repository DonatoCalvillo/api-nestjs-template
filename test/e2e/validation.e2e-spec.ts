import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/create-test-app';

describe('Validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns validation errors for invalid register payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: '',
        email: 'not-an-email',
        password: 'short',
        extraField: 'forbidden',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      code: 'E-VALIDATION',
      message: 'Validation failed',
    });
    expect(response.body.data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'extraField' }),
      ]),
    );
  });
});
