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
import { ENVIRONMENT_VARIABLES } from '../../../src/configuration/environments-variables';
import { ShutdownStateModule } from '../../../src/configuration/shutdown/shutdown-state.module';
import { ShutdownStateService } from '../../../src/configuration/shutdown/shutdown-state.service';
import { HealthyModule } from '../../../src/modules/healthy/healthy.module';
import { HttpExceptionFilter } from '../../../src/modules/shared/infrastructure/filters/http-exception.filter';
import { TraceContextService } from '../../../src/modules/shared/infrastructure/tracing/trace-context.service';

const createTestingApp = async (
  overrides: {
    typeOrm?: Partial<TypeOrmHealthIndicator>;
    disk?: Partial<DiskHealthIndicator>;
    http?: Partial<HttpHealthIndicator>;
    shutdownState?: Partial<ShutdownStateService>;
  } = {},
) => {
  const shutdownState = {
    isShuttingDown: false,
    markShuttingDown: jest.fn(),
    ...overrides.shutdownState,
  };
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
      ShutdownStateModule,
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
    .overrideProvider(ShutdownStateService)
    .useValue(shutdownState)
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return {
    app,
    typeOrmIndicator: moduleFixture.get(TypeOrmHealthIndicator),
    diskIndicator: moduleFixture.get(DiskHealthIndicator),
    httpIndicator: moduleFixture.get(HttpHealthIndicator),
  };
};

describe('HealthyController (unit)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('/health/live (GET) always returns 200', async () => {
    ({ app } = await createTestingApp());

    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok' });
      });
  });

  it('/health/ready (GET) returns 200 when database is up', async () => {
    ({ app } = await createTestingApp());

    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.details.database.status).toBe('up');
        expect(res.body.details.storage).toBeUndefined();
      });
  });

  it('/health/ready (GET) returns 503 with shutting_down during graceful shutdown', async () => {
    ({ app } = await createTestingApp({
      shutdownState: {
        isShuttingDown: true,
        markShuttingDown: jest.fn(),
      },
    }));

    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(503)
      .expect((res) => {
        expect(res.body.status).toBe('shutting_down');
        expect(res.body.details.app.status).toBe('down');
        expect(res.body.statusCode).toBeUndefined();
      });
  });

  it('/health/ready (GET) returns 503 when database check fails', async () => {
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
      .get('/health/ready')
      .expect(503)
      .expect((res) => {
        expect(res.body.status).toBe('error');
        expect(res.body.error.database.status).toBe('down');
        expect(res.body.details.database.status).toBe('down');
        expect(res.body.statusCode).toBeUndefined();
      });
  });

  it('/health (GET) returns 200 with storage when deep checks pass', async () => {
    ({ app } = await createTestingApp());

    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.details.storage.status).toBe('up');
        expect(res.body.details.database).toBeUndefined();
      });
  });

  it('/health (GET) returns 503 when disk check fails', async () => {
    ({ app } = await createTestingApp({
      disk: {
        checkStorage: jest.fn().mockRejectedValue(
          new HealthCheckError('Disk check failed', {
            storage: { status: 'down', message: 'Threshold exceeded' },
          }),
        ),
      },
    }));

    return request(app.getHttpServer())
      .get('/health')
      .expect(503)
      .expect((res) => {
        expect(res.body.status).toBe('error');
        expect(res.body.error.storage.status).toBe('down');
        expect(res.body.details.storage.status).toBe('down');
      });
  });
});

describe('HealthyController OTLP check (unit)', () => {
  let app: INestApplication;
  let httpIndicator: HttpHealthIndicator;
  let typeOrmIndicator: TypeOrmHealthIndicator;
  const originalOtelEnabled = ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED;

  afterEach(async () => {
    ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED = originalOtelEnabled;
    await app?.close();
  });

  it('includes otlp in /health details when OTEL_TRACES_ENABLED is true', async () => {
    ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED = true;

    ({ app, httpIndicator } = await createTestingApp());

    await request(app.getHttpServer())
      .get('/health')
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

  it('skips otlp check on /health when OTEL_TRACES_ENABLED is false', async () => {
    ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED = false;

    ({ app, httpIndicator } = await createTestingApp());

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.details.otlp).toBeUndefined();
      });

    expect(httpIndicator.responseCheck).not.toHaveBeenCalled();
  });

  it('does not include otlp in /health/ready when OTEL fails on /health', async () => {
    ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED = true;

    ({ app, httpIndicator, typeOrmIndicator } = await createTestingApp({
      http: {
        responseCheck: jest.fn().mockRejectedValue(
          new HealthCheckError('OTLP check failed', {
            otlp: { status: 'down', message: 'Connection refused' },
          }),
        ),
      },
    }));

    await request(app.getHttpServer()).get('/health').expect(503);

    expect(httpIndicator.responseCheck).toHaveBeenCalled();

    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.details.database.status).toBe('up');
        expect(res.body.details.otlp).toBeUndefined();
      });

    expect(typeOrmIndicator.pingCheck).toHaveBeenCalled();
  });
});
