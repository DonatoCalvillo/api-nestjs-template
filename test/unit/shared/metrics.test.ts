import {
  Controller,
  Get,
  INestApplication,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import request from 'supertest';
import {
  BUSINESS_METRICS,
  IBusinessMetrics,
} from '../../../src/modules/shared/infrastructure/metrics';
import { createMetricsTestApp } from '../../helpers/metrics-test-harness';

@Controller()
class SampleController {
  @Get('sample')
  getSample(): { ok: boolean } {
    return { ok: true };
  }

  @Get('not-found')
  getNotFound(): never {
    throw new NotFoundException();
  }
}

@Controller()
class MetricsProbeController implements OnModuleInit {
  constructor(
    @Inject(BUSINESS_METRICS)
    private readonly businessMetrics: IBusinessMetrics,
  ) {}

  onModuleInit(): void {
    this.businessMetrics.setOutboxPending('pending', 3);
    this.businessMetrics.recordAuditWrite('user.update', 'User', 'user');
    this.businessMetrics.recordCircuitOpen('payment-api');
  }

  @Get('probe')
  probe(): { ok: boolean } {
    return { ok: true };
  }
}

describe('Metrics HTTP instrumentation (unit)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createMetricsTestApp(SampleController);
  });

  afterEach(async () => {
    await app?.close();
  });

  it('GET /metrics returns default and custom prometheus metrics', async () => {
    await request(app.getHttpServer()).get('/sample').expect(200);

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text/);
    expect(response.text).toContain('# HELP');
    expect(response.text).toMatch(/process_cpu|nodejs_/);
    expect(response.text).toContain('http_request_duration_seconds');
    expect(response.text).toContain('http_requests_total');
  });

  it('GET /metrics includes http_errors_total after a 4xx response', async () => {
    await request(app.getHttpServer()).get('/not-found').expect(404);

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(response.text).toContain('http_errors_total');
    expect(response.text).toContain('status_class="4xx"');
  });
});

describe('Business metrics (unit)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createMetricsTestApp(MetricsProbeController);
  });

  afterEach(async () => {
    await app?.close();
  });

  it('GET /metrics exposes business metrics', async () => {
    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(response.text).toContain('outbox_messages_pending');
    expect(response.text).toContain('audit_log_writes_total');
    expect(response.text).toContain('circuit_breaker_state');
    expect(response.text).toContain(
      'outbox_messages_pending{status="pending"} 3',
    );
    expect(response.text).toContain(
      'audit_log_writes_total{action="user.update",entity_type="User",actor_type="user"} 1',
    );
    expect(response.text).toContain(
      'circuit_breaker_state{circuit_breaker_key="payment-api"} 1',
    );
  });
});
