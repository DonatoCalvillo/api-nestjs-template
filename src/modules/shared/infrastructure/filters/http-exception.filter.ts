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
import {
  RequestWithTrace,
  TRACE_ID_HEADER,
  TRACEPARENT_HEADER,
} from '../tracing/trace-context.constants';
import { TraceContextService } from '../tracing/trace-context.service';

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

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] }).message ??
          'Internal server error');

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
