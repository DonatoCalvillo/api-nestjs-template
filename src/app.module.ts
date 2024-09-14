import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dataSourceOptions } from './database/data-source';
import { LoggerModule } from 'nestjs-pino';

import { RequestIdMiddleware } from './modules/shared/infrastructure/middlewares/request-id.middleware';
import { HealthyModule } from './modules/healthy/healthy.module';
import { loggerOptions } from './configuration/logger';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    LoggerModule.forRoot(loggerOptions),
    HealthyModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
