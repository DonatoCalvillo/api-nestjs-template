import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { dataSourceOptions } from './database/data-source';
import { LoggerModule } from 'nestjs-pino';

import { RequestIdMiddleware } from './modules/shared/infrastructure/middlewares/request-id.middleware';
import { IpAllowlistMiddleware } from './modules/shared/infrastructure/middlewares/ip-allowlist.middleware';
import { ConditionalThrottlerGuard } from './modules/shared/infrastructure/guards/conditional-throttler.guard';
import { HealthyModule } from './modules/healthy/healthy.module';
import { SharedModule } from './modules/shared/shared.module';
import { loggerOptions } from './configuration/logger';
import { ENVIRONMENT_VARIABLES } from './configuration/environments-variables';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forRoot(dataSourceOptions),
    LoggerModule.forRoot(loggerOptions),
    ThrottlerModule.forRoot([
      {
        ttl: ENVIRONMENT_VARIABLES.THROTTLE_TTL * 1000,
        limit: ENVIRONMENT_VARIABLES.THROTTLE_LIMIT,
      },
    ]),
    HealthyModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ConditionalThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(IpAllowlistMiddleware, RequestIdMiddleware).forRoutes('*');
  }
}
