import { trace } from '@opentelemetry/api';
import { IncomingMessage } from 'http';
import { REQUEST_ID_HEADER } from '../modules/shared/infrastructure/request-context';
import {
  RequestWithTrace,
  TRACE_ID_HEADER,
} from '../modules/shared/infrastructure/tracing/trace-context.constants';
type RequestWithContext = IncomingMessage &
  Record<string, string> &
  RequestWithTrace;

const getTraceFields = (req: RequestWithContext) => {
  if (req.traceId && req.spanId) {
    return {
      traceId: req.traceId,
      spanId: req.spanId,
    };
  }

  const span = trace.getActiveSpan();

  if (span) {
    const spanContext = span.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  const traceIdHeader = req.headers[TRACE_ID_HEADER];

  if (typeof traceIdHeader === 'string') {
    return { traceId: traceIdHeader };
  }

  return {};
};

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
      const request = req as RequestWithContext;

      return {
        requestId: request[REQUEST_ID_HEADER],
        ...getTraceFields(request),
      };
    },
    autoLogging: false,
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },
  },
};
