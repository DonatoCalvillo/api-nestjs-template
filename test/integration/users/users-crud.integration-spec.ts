import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { assignUserRole } from '../../helpers/assign-user-role';
import { createTestApp } from '../../helpers/create-test-app';
import { truncateTables } from '../../helpers/db-cleanup';
import { seedRbac } from '../../helpers/seed-roles';
import { createTestDataSource } from '../../helpers/test-data-source';

type RegisteredUser = {
  accessToken: string;
  id: string;
  version: number;
};

const registerUser = async (
  app: INestApplication,
  email: string,
  name = 'Test User',
): Promise<RegisteredUser> => {
  const registerResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      name,
      email,
      password: 'password123',
    })
    .expect(201);

  const accessToken = registerResponse.body.data.accessToken as string;

  const meResponse = await request(app.getHttpServer())
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return {
    accessToken,
    id: meResponse.body.data.id as string,
    version: meResponse.body.data.version as number,
  };
};

describe('Users CRUD (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncateTables(dataSource);
    await seedRbac(dataSource);
  });

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });

  it('returns the authenticated profile from GET /users/me', async () => {
    const user = await registerUser(app, 'me@example.com', 'Me User');

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: user.id,
      email: 'me@example.com',
      name: 'Me User',
      roles: ['user'],
      version: 1,
    });
  });

  it('returns 401 for GET /users/me without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('returns 403 when a regular user lists all users', async () => {
    const user = await registerUser(app, 'regular@example.com');

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);
  });

  it('returns a paginated list for admin users', async () => {
    await registerUser(app, 'user-a@example.com', 'User A');
    await registerUser(app, 'user-b@example.com', 'User B');

    const admin = await registerUser(app, 'admin@example.com', 'Admin User');
    await assignUserRole(dataSource, admin.id, 'admin');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123',
      })
      .expect(200);

    const adminToken = loginResponse.body.data.accessToken as string;

    const response = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&perPage=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.total).toBe(3);
    expect(response.body.data.page).toBe(1);
    expect(response.body.data.perPage).toBe(2);
    expect(response.body.data.totalPages).toBe(2);
  });

  it('allows users to update their own profile', async () => {
    const user = await registerUser(app, 'self@example.com', 'Old Name');

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'New Name',
        version: user.version,
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: user.id,
      name: 'New Name',
      email: 'self@example.com',
      version: 2,
    });
  });

  it('returns 403 when updating another user without admin role', async () => {
    const userA = await registerUser(app, 'user-a2@example.com');
    const userB = await registerUser(app, 'user-b2@example.com');

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userB.id}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({
        name: 'Hacked',
        version: 1,
      })
      .expect(403);
  });

  it('allows admin to update another user profile', async () => {
    const target = await registerUser(app, 'target@example.com', 'Target User');
    const admin = await registerUser(app, 'admin2@example.com', 'Admin Two');
    await assignUserRole(dataSource, admin.id, 'admin');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin2@example.com',
        password: 'password123',
      })
      .expect(200);

    const adminToken = loginResponse.body.data.accessToken as string;

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/users/${target.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated By Admin',
        version: target.version,
      })
      .expect(200);

    expect(response.body.data.name).toBe('Updated By Admin');
  });

  it('returns 409 when the optimistic-lock version is stale', async () => {
    const user = await registerUser(app, 'stale@example.com');

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'First Update',
        version: user.version,
      })
      .expect(200);

    const conflictResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'Stale Update',
        version: user.version,
      })
      .expect(409);

    expect(conflictResponse.body.code).toBe('E-CONCURRENCY');
  });

  it('replays PATCH responses when Idempotency-Key is reused', async () => {
    const user = await registerUser(app, 'idempotent@example.com', 'Before');
    const idempotencyKey = randomUUID();

    const firstResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        name: 'After Idempotent',
        version: user.version,
      })
      .expect(200);

    expect(firstResponse.headers['idempotency-replayed']).toBe('false');

    const replayResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        name: 'After Idempotent',
        version: user.version,
      })
      .expect(200);

    expect(replayResponse.headers['idempotency-replayed']).toBe('true');
    expect(replayResponse.body.data).toEqual(firstResponse.body.data);
  });

  it('persists an audit log entry after a successful update', async () => {
    const user = await registerUser(app, 'audit@example.com', 'Audit User');

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'Audited Name',
        version: user.version,
      })
      .expect(200);

    const auditRows = await dataSource.query<
      { action: string; entity_type: string; entity_id: string }[]
    >(
      `SELECT action, entity_type, entity_id
       FROM audit_logs
       WHERE action = $1 AND entity_id = $2`,
      ['user.update', user.id],
    );

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].entity_type).toBe('User');
  });
});
