import { Controller, Get, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ENVIRONMENT_VARIABLES } from '../../configuration/environments-variables';

@SkipThrottle()
@Controller('healthy')
export class HealthyController {
  constructor(
    private readonly logger: PinoLogger,
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly http: HttpHealthIndicator,
  ) {
    this.logger.setContext(HealthyController.name);
  }

  @Get()
  @HealthCheck()
  check(@Req() req: Request) {
    this.logger.info(`Healthy check request coming from: ${req.ip}`);

    const checks: HealthIndicatorFunction[] = [
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () =>
        this.disk.checkStorage('storage', {
          path: ENVIRONMENT_VARIABLES.HEALTH_DISK_PATH,
          thresholdPercent: ENVIRONMENT_VARIABLES.HEALTH_DISK_THRESHOLD_PERCENT,
        }),
    ];

    if (ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED) {
      const otlpOrigin = new URL(
        ENVIRONMENT_VARIABLES.OTEL_EXPORTER_OTLP_ENDPOINT,
      ).origin;

      checks.push(() =>
        this.http.responseCheck('otlp', otlpOrigin, (res) => res.status < 500),
      );
    }

    return this.health.check(checks);
  }
}
