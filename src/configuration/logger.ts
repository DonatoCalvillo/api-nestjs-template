import { trace } from '@opentelemetry/api';
import { IncomingMessage } from 'http';
import { REQUEST_ID_HEADER } from '../modules/shared/infrastructure/request-context';
import {
  RequestWithTrace,
  TRACE_ID_HEADER,
} from '../modules/shared/infrastructure/tracing/trace-context.constants';
import { SENSITIVE_LOG_FIELDS } from '../modules/shared/infrastructure/logging/sensitive-fields.constants';
import { ENVIRONMENT_VARIABLES } from './environments-variables';

const buildRedactPaths = (): string[] => {
  const fieldPaths = SENSITIVE_LOG_FIELDS.flatMap((field) => [
    field,
    `*.${field}`,
    `*.*.${field}`,
  ]);

  return ['req.headers.authorization', 'req.headers.cookie', ...fieldPaths];
};

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

const isProduction = ENVIRONMENT_VARIABLES.NODE_ENV === 'production';

export const loggerOptions = {
  pinoHttp: {
    ...(isProduction
      ? { level: ENVIRONMENT_VARIABLES.LOG_LEVEL }
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              messageKey: 'message',
              colorize: true,
            },
          },
        }),
    messageKey: 'message',
    customProps(req: IncomingMessage) {
      const request = req as RequestWithContext;

      return {
        requestId: request[REQUEST_ID_HEADER],
        ...getTraceFields(request),
      };
    },
    autoLogging: false,
    redact: {
      paths: buildRedactPaths(),
      censor: '***REDACTED***',
    },
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },
  },
};
