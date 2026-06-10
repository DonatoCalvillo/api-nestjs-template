import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ErrorCodes } from '../../domain/enum/error-codes';
import { DomainError } from '../../domain/errors/error';
import { ResponseDto } from '../../domain/response/response';
import { isHealthProbePath } from '../metrics/metrics.constants';
import { inferErrorCodeFromStatus } from '../response/http-status-code.util';
import { buildResponseMeta } from '../response/response-meta.util';
import {
  acceptsProblemDetails,
  toProblemDetails,
} from '../response/problem-details.util';
import { setResponseTraceHeaders } from '../response/response-headers.util';
import { RequestWithTrace } from '../tracing/trace-context.constants';
import { TraceContextService } from '../tracing/trace-context.service';

interface TerminusHealthCheckBody {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details: Record<string, unknown>;
}

interface LegacyExceptionBody {
  message?: string | string[];
  success?: boolean;
  code?: string;
  data?: unknown;
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

const normalizeMessage = (message: string | string[]): string =>
  Array.isArray(message) ? message.join(', ') : message;

const toResponseDto = (
  exception: HttpException | unknown,
  status: number,
): ResponseDto => {
  if (!(exception instanceof HttpException)) {
    return ResponseDto.error(
      'Internal server error',
      ErrorCodes.UNEXPECTED_ERROR,
    );
  }

  const exceptionResponse = exception.getResponse();

  if (typeof exceptionResponse === 'string') {
    return ResponseDto.error(
      exceptionResponse,
      inferErrorCodeFromStatus(status),
    );
  }

  if (ResponseDto.isResponseDto(exceptionResponse)) {
    return exceptionResponse;
  }

  const body = exceptionResponse as LegacyExceptionBody;
  const message = body.message
    ? normalizeMessage(body.message)
    : 'Internal server error';

  if (Array.isArray(body.message)) {
    return ResponseDto.error(
      message,
      body.code ?? inferErrorCodeFromStatus(status),
      {
        errors: body.message.map((validationMessage) => ({
          field: 'unknown',
          message: validationMessage,
        })),
      },
    );
  }

  if (body.success === false) {
    return ResponseDto.error(message, body.code, body.data as never);
  }

  return ResponseDto.error(message, inferErrorCodeFromStatus(status));
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

    let isDomainError = false;

    if (exception instanceof DomainError) {
      isDomainError = true;
      exception = exception.toHttpException();
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const requestPath = request.path ?? request.url.split('?')[0];

    if (
      isHealthProbePath(requestPath) &&
      exception instanceof HttpException &&
      isTerminusHealthCheckBody(exceptionResponse)
    ) {
      const meta = buildResponseMeta(request, this.traceContext);
      setResponseTraceHeaders(response, meta, this.traceContext);
      response.status(status).json(exceptionResponse);
      return;
    }

    const responseBody = toResponseDto(exception, status);
    const meta = buildResponseMeta(request, this.traceContext);
    responseBody.meta = meta;

    setResponseTraceHeaders(response, meta, this.traceContext);

    if (!isDomainError) {
      this.logger.error(
        {
          err: exception,
          statusCode: status,
          method: request.method,
          path: request.path,
          errorCode: responseBody.code,
          traceId: meta.traceId,
          spanId: meta.spanId,
          requestId: meta.requestId,
        },
        responseBody.message,
      );
    }

    const acceptHeader =
      typeof request.header === 'function'
        ? request.header('accept')
        : request.headers?.accept;

    if (acceptsProblemDetails(acceptHeader)) {
      response
        .status(status)
        .type('application/problem+json')
        .json(
          toProblemDetails(
            responseBody,
            status,
            requestPath,
            meta.traceId,
            meta.requestId,
          ),
        );
      return;
    }

    response.status(status).json(responseBody);
  }
}
