import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { REQUEST_ID_HEADER } from '../request-context';
import { HEALTH_PATH } from '../metrics/metrics.constants';
import {
  RequestWithTrace,
  TRACE_ID_HEADER,
  TRACEPARENT_HEADER,
} from '../tracing/trace-context.constants';
import { TraceContextService } from '../tracing/trace-context.service';

interface TerminusHealthCheckBody {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details: Record<string, unknown>;
}

const isTerminusHealthCheckBody = (
  body: unknown,
): body is TerminusHealthCheckBody => {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const candidate = body as TerminusHealthCheckBody;

  return (
    typeof candidate.status === 'string' &&
    ['ok', 'error', 'shutting_down'].includes(candidate.status) &&
    typeof candidate.details === 'object' &&
    candidate.details !== null
  );
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly traceContext: TraceContextService,
  ) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & RequestWithTrace>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const requestId =
      (request[REQUEST_ID_HEADER] as string | undefined) ??
      (request.headers[REQUEST_ID_HEADER] as string | undefined);

    const traceId =
      request.traceId ??
      this.traceContext.getTraceId() ??
      (request.headers[TRACE_ID_HEADER] as string | undefined);

    const spanId = request.spanId ?? this.traceContext.getSpanId();
    const traceparent =
      request.traceparent ?? this.traceContext.getTraceparent();

    const requestPath = request.path ?? request.url.split('?')[0];

    if (
      requestPath === HEALTH_PATH &&
      exception instanceof HttpException &&
      isTerminusHealthCheckBody(exceptionResponse)
    ) {
      if (requestId) {
        response.setHeader(REQUEST_ID_HEADER, requestId);
      }

      if (traceparent) {
        response.setHeader(TRACEPARENT_HEADER, traceparent);
      }

      if (traceId) {
        response.setHeader(TRACE_ID_HEADER, traceId);
      }

      response.status(status).json(exceptionResponse);
      return;
    }

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] }).message ??
          'Internal server error');

    if (requestId) {
      response.setHeader(REQUEST_ID_HEADER, requestId);
    }

    if (traceparent) {
      response.setHeader(TRACEPARENT_HEADER, traceparent);
    }

    if (traceId) {
      response.setHeader(TRACE_ID_HEADER, traceId);
    }

    this.logger.error(
      {
        err: exception,
        statusCode: status,
        method: request.method,
        path: request.url,
        traceId,
        spanId,
        requestId,
      },
      Array.isArray(message) ? message.join(', ') : message,
    );

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
      traceId,
      spanId,
    });
  }
}
