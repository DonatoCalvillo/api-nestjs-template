import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';

import { dataSourceOptions } from './database/data-source';
import { LoggerModule } from 'nestjs-pino';

import { RequestContextMiddleware } from './modules/shared/infrastructure/audit/request-context.middleware';
import { RequestIdMiddleware } from './modules/shared/infrastructure/middlewares/request-id.middleware';
import { IpAllowlistMiddleware } from './modules/shared/infrastructure/middlewares/ip-allowlist.middleware';
import { ConditionalThrottlerGuard } from './modules/shared/infrastructure/guards/conditional-throttler.guard';
import { AuthModule } from './modules/auth/auth.module';
import { HealthyModule } from './modules/healthy/healthy.module';
import { SharedModule } from './modules/shared/shared.module';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthGuard } from './modules/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/infrastructure/guards/permissions.guard';
import { RolesGuard } from './modules/auth/infrastructure/guards/roles.guard';
import { loggerOptions } from './configuration/logger';
import { ENVIRONMENT_VARIABLES } from './configuration/environments-variables';
import { buildThrottlerModuleOptions } from './configuration/throttler.config';
import { HttpExceptionFilter } from './modules/shared/infrastructure/filters/http-exception.filter';
import { TransformResponseInterceptor } from './modules/shared/infrastructure/interceptors';
import { IdempotencyInterceptor } from './modules/shared/infrastructure/idempotency';
import { TracingInterceptor } from './modules/shared/infrastructure/tracing';
import { MetricsModule } from './modules/shared/infrastructure/metrics';
import {
  REDIS_CLIENT,
  RedisModule,
} from './modules/shared/infrastructure/redis';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    RedisModule.forRoot(),
    SharedModule,
    TypeOrmModule.forRoot(dataSourceOptions),
    LoggerModule.forRoot(loggerOptions),
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis | null) => buildThrottlerModuleOptions(redis),
    }),
    HealthyModule,
    UsersModule,
    AuthModule,
    ...(ENVIRONMENT_VARIABLES.METRICS_ENABLED ? [MetricsModule] : []),
  ],
  controllers: [],
  providers: [
    RequestContextMiddleware,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ConditionalThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        IpAllowlistMiddleware,
        RequestIdMiddleware,
        RequestContextMiddleware,
      )
      .forRoutes('*');
  }
}
