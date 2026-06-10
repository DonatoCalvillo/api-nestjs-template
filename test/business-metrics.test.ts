import {
  Controller,
  Get,
  INestApplication,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  BUSINESS_METRICS,
  IBusinessMetrics,
  MetricsModule,
} from '../src/modules/shared/infrastructure/metrics';

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

@Module({
  imports: [MetricsModule],
  controllers: [MetricsProbeController],
})
class BusinessMetricsTestModule {}

describe('Business metrics (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BusinessMetricsTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
