import { IncomingMessage } from 'http';
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
    customProps(req: IncomingMessage) {
      return {
        requestId: (req as IncomingMessage & Record<string, string>)[
          REQUEST_ID_HEADER
        ],
      };
    },
    autoLogging: false,
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },
  },
};
