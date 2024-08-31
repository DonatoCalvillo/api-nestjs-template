import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dataSourceOptions } from './database/data-source';
import { LoggerModule } from 'nestjs-pino';

import { Request } from 'express';

import {
  REQUEST_ID_HEADER,
  RequestIdMiddleware,
} from './modules/shared/infrastructure/middlewares/request-id.middleware';
import { HealthyModule } from './modules/healthy/healthy.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            messageKey: 'message',
            colorize: true,
          },
        },
        messageKey: 'message',
        customProps(req: Request) {
          return {
            requestId: req[REQUEST_ID_HEADER],
          };
        },
        autoLogging: false,
        serializers: {
          req: () => undefined,
          res: () => undefined,
        },
      },
    }),
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
