import {
  Controller,
  Get,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
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
import { ShutdownStateService } from '../../configuration/shutdown/shutdown-state.service';
import { Public } from '../auth/infrastructure/decorators/public.decorator';

@Public()
@SkipThrottle()
@ApiTags('health')
@Controller('health')
export class HealthyController {
  constructor(
    private readonly logger: PinoLogger,
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly http: HttpHealthIndicator,
    private readonly shutdownState: ShutdownStateService,
  ) {
    this.logger.setContext(HealthyController.name);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({
    description: 'Process is alive',
    schema: { example: { status: 'ok' } },
  })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({ description: 'Dependencies are healthy' })
  @ApiServiceUnavailableResponse({
    description: 'Database unavailable or server is shutting down',
  })
  ready(@Req() req: Request) {
    this.logger.info(`Readiness check request coming from: ${req.ip}`);

    if (this.shutdownState.isShuttingDown) {
      throw new ServiceUnavailableException({
        status: 'shutting_down',
        info: {},
        error: {
          app: { status: 'down', message: 'Server is shutting down' },
        },
        details: {
          app: { status: 'down', message: 'Server is shutting down' },
        },
      });
    }

    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Deep health check' })
  @ApiOkResponse({ description: 'Storage and optional OTLP checks passed' })
  @ApiServiceUnavailableResponse({ description: 'One or more checks failed' })
  deep(@Req() req: Request) {
    this.logger.info(`Deep health check request coming from: ${req.ip}`);

    const checks: HealthIndicatorFunction[] = [
      () =>
        this.disk.checkStorage('storage', {
          path: ENVIRONMENT_VARIABLES.HEALTH_DISK_PATH,
          thresholdPercent: ENVIRONMENT_VARIABLES.HEALTH_DISK_THRESHOLD_PERCENT,
        }),
    ];

    const otlpCheck = this.buildOtlpCheck();
    if (otlpCheck) {
      checks.push(otlpCheck);
    }

    return this.health.check(checks);
  }

  private buildOtlpCheck(): HealthIndicatorFunction | null {
    if (!ENVIRONMENT_VARIABLES.OTEL_TRACES_ENABLED) {
      return null;
    }

    const otlpOrigin = new URL(
      ENVIRONMENT_VARIABLES.OTEL_EXPORTER_OTLP_ENDPOINT,
    ).origin;

    return () =>
      this.http.responseCheck('otlp', otlpOrigin, (res) => res.status < 500);
  }
}
