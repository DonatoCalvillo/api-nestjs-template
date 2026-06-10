import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { getMetricsConfig } from '../../../../configuration/metrics';
import {
  HTTP_DURATION_BUCKETS,
  HTTP_ERRORS_TOTAL,
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_REQUESTS_TOTAL,
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
  ],
  exports: [MetricsMiddleware],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
