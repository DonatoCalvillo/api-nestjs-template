import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { getMetricsConfig } from '../../../../configuration/metrics';
import { BUSINESS_METRICS } from './business-metrics.port';
import { PrometheusBusinessMetricsService } from './prometheus-business-metrics.service';
import {
  AUDIT_LOG_WRITE_ERRORS_TOTAL,
  AUDIT_LOG_WRITES_TOTAL,
  CIRCUIT_BREAKER_OPENED_TOTAL,
  CIRCUIT_BREAKER_STATE,
  HTTP_DURATION_BUCKETS,
  HTTP_ERRORS_TOTAL,
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_REQUESTS_TOTAL,
  OUTBOX_MESSAGES_FAILED_TOTAL,
  OUTBOX_MESSAGES_PENDING,
  OUTBOX_MESSAGES_PUBLISHED_TOTAL,
} from './metrics.constants';
import { MetricsMiddleware } from './metrics.middleware';

const metricsConfig = getMetricsConfig();

@Module({
  imports: [
    PrometheusModule.register({
      path: metricsConfig.path,
      defaultMetrics: {
        enabled: metricsConfig.defaultMetricsEnabled,
      },
    }),
  ],
  providers: [
    MetricsMiddleware,
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION_SECONDS,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: HTTP_DURATION_BUCKETS,
    }),
    makeCounterProvider({
      name: HTTP_REQUESTS_TOTAL,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeCounterProvider({
      name: HTTP_ERRORS_TOTAL,
      help: 'Total number of HTTP error responses',
      labelNames: ['method', 'route', 'status_class'],
    }),
    makeGaugeProvider({
      name: OUTBOX_MESSAGES_PENDING,
      help: 'Number of outbox messages by status',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: OUTBOX_MESSAGES_PUBLISHED_TOTAL,
      help: 'Total number of outbox messages published',
      labelNames: ['event_name'],
    }),
    makeCounterProvider({
      name: OUTBOX_MESSAGES_FAILED_TOTAL,
      help: 'Total number of outbox messages marked as failed',
      labelNames: ['event_name'],
    }),
    makeCounterProvider({
      name: AUDIT_LOG_WRITES_TOTAL,
      help: 'Total number of audit log entries written',
      labelNames: ['action', 'entity_type', 'actor_type'],
    }),
    makeCounterProvider({
      name: AUDIT_LOG_WRITE_ERRORS_TOTAL,
      help: 'Total number of audit log write failures',
    }),
    makeGaugeProvider({
      name: CIRCUIT_BREAKER_STATE,
      help: 'Circuit breaker state (0=closed, 1=open)',
      labelNames: ['circuit_breaker_key'],
    }),
    makeCounterProvider({
      name: CIRCUIT_BREAKER_OPENED_TOTAL,
      help: 'Total number of times a circuit breaker opened',
      labelNames: ['circuit_breaker_key'],
    }),
    PrometheusBusinessMetricsService,
    {
      provide: BUSINESS_METRICS,
      useExisting: PrometheusBusinessMetricsService,
    },
  ],
  exports: [MetricsMiddleware, BUSINESS_METRICS],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
