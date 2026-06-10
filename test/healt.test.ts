import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LoggerModule } from 'nestjs-pino';
import { HealthyModule } from '../src/modules/healthy/healthy.module';

describe('HealthyController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
        HealthyModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('/healthy (GET)', () => {
    return request(app.getHttpServer()).get('/healthy').expect(204);
  });
});
