import {
  Controller,
  Get,
  INestApplication,
  NotFoundException,
  Module,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { MetricsModule } from '../src/modules/shared/infrastructure/metrics';

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

@Module({
  imports: [MetricsModule],
  controllers: [SampleController],
})
class MetricsTestModule {}

describe('Metrics (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MetricsTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
