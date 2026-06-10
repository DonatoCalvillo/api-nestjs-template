import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import {
  DiskHealthIndicator,
  HealthCheckError,
  HttpHealthIndicator,
  TerminusModule,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import request from 'supertest';
import { LoggerModule } from 'nestjs-pino';
import { ENVIRONMENT_VARIABLES } from '../src/configuration/environments-variables';
import { HealthyModule } from '../src/modules/healthy/healthy.module';
import { HttpExceptionFilter } from '../src/modules/shared/infrastructure/filters/http-exception.filter';
import { TraceContextService } from '../src/modules/shared/infrastructure/tracing/trace-context.service';

const createTestingApp = async (
  overrides: {
    typeOrm?: Partial<TypeOrmHealthIndicator>;
    disk?: Partial<DiskHealthIndicator>;
    http?: Partial<HttpHealthIndicator>;
  } = {},
) => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
      TerminusModule,
      HttpModule,
      HealthyModule,
    ],
    providers: [
      {
        provide: APP_FILTER,
        useClass: HttpExceptionFilter,
      },
      {
        provide: TraceContextService,
        useValue: {
          getTraceId: jest.fn(),
          getSpanId: jest.fn(),
          getTraceparent: jest.fn(),
        },
      },
    ],
  })
    .overrideProvider(TypeOrmHealthIndicator)
    .useValue({
      pingCheck: jest.fn().mockResolvedValue({
        database: { status: 'up' },
      }),
      ...overrides.typeOrm,
    })
    .overrideProvider(DiskHealthIndicator)
    .useValue({
      checkStorage: jest.fn().mockResolvedValue({
        storage: { status: 'up' },
      }),
      ...overrides.disk,
    })
    .overrideProvider(HttpHealthIndicator)
    .useValue({
      responseCheck: jest.fn().mockResolvedValue({
        otlp: { status: 'up' },
      }),
      ...overrides.http,
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return {
    app,
    httpIndicator: moduleFixture.get(HttpHealthIndicator),
  };
};

describe('HealthyController (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('/healthy (GET) returns 200 with ok status when all checks pass', async () => {
    ({ app } = await createTestingApp());

    return request(app.getHttpServer())
      .get('/healthy')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.details.database.status).toBe('up');
        expect(res.body.details.storage.status).toBe('up');
      });
  });

  it('/healthy (GET) returns 503 when a check fails', async () => {
    ({ app } = await createTestingApp({
      typeOrm: {
        pingCheck: jest.fn().mockRejectedValue(
          new HealthCheckError('Database check failed', {
            database: { status: 'down', message: 'Connection refused' },
          }),
        ),
      },
    }));

    return request(app.getHttpServer())
      .get('/healthy')
      .expect(503)
      .expect((res) => {
        expect(res.body.status).toBe('error');
        expect(res.body.error.database.status).toBe('down');
        expect(res.body.details.database.status).toBe('down');
        expect(res.body.details.storage.status).toBe('up');
        expect(res.body.statusCode).toBeUndefined();
      });
  });
});

describe('HealthyController OTLP check', () => {
  let app: INestApplication;
  let httpIndicator: HttpHealthIndicator;
  const originalOtelEnabled = ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED;

  afterEach(async () => {
    ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED = originalOtelEnabled;
    await app?.close();
  });

  it('includes otlp in details when OTEL_TRACES_ENABLED is true', async () => {
    ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED = true;

    ({ app, httpIndicator } = await createTestingApp());

    await request(app.getHttpServer())
      .get('/healthy')
      .expect(200)
      .expect((res) => {
        expect(res.body.details.otlp.status).toBe('up');
      });

    expect(httpIndicator.responseCheck).toHaveBeenCalledWith(
      'otlp',
      'http://localhost:4318',
      expect.any(Function),
    );
  });

  it('skips otlp check when OTEL_TRACES_ENABLED is false', async () => {
    ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED = false;

    ({ app, httpIndicator } = await createTestingApp());

    await request(app.getHttpServer())
      .get('/healthy')
      .expect(200)
      .expect((res) => {
        expect(res.body.details.otlp).toBeUndefined();
      });

    expect(httpIndicator.responseCheck).not.toHaveBeenCalled();
  });
});
