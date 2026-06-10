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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
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

    if (requestId) {
      response.setHeader(REQUEST_ID_HEADER, requestId);
    }

    this.logger.error(
      {
        err: exception,
        statusCode: status,
        method: request.method,
        path: request.url,
      },
      Array.isArray(message) ? message.join(', ') : message,
    );

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
