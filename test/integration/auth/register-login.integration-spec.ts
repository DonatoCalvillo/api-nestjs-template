import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../helpers/create-test-app';
import { truncateTables } from '../../helpers/db-cleanup';
import { seedUserRole } from '../../helpers/seed-roles';
import { createTestDataSource } from '../../helpers/test-data-source';

describe('Auth register/login (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncateTables(dataSource);
    await seedUserRole(dataSource);
  });

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });

  it('registers a user and logs in with the same credentials', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.accessToken).toEqual(expect.any(String));
    expect(registerResponse.body.data.refreshToken).toEqual(expect.any(String));

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.data.refreshToken).toEqual(expect.any(String));
  });
});
