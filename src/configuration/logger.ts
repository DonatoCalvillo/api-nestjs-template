import { Request } from 'express';
import { REQUEST_ID_HEADER } from '../modules/shared/infrastructure/middlewares/request-id.middleware';

export const loggerOptions = {
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
};
