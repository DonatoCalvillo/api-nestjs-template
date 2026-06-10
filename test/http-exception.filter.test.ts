import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ErrorCodes } from '../src/modules/shared/domain/enum/error-codes';
import { UnexpectedError } from '../src/modules/shared/domain/errors/unexpected.error';
import { ResponseDto } from '../src/modules/shared/domain/response/response';
import { InvalidCredentialsError } from '../src/modules/auth/domain/errors/auth.errors';
import { HttpExceptionFilter } from '../src/modules/shared/infrastructure/filters/http-exception.filter';
import { TraceContextService } from '../src/modules/shared/infrastructure/tracing/trace-context.service';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let logger: jest.Mocked<PinoLogger>;
  let traceContext: jest.Mocked<TraceContextService>;
  let json: jest.Mock;
  let status: jest.Mock;
  let setHeader: jest.Mock;

  beforeEach(() => {
    logger = {
      setContext: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    traceContext = {
      getTraceId: jest.fn().mockReturnValue('trace-1'),
      getSpanId: jest.fn().mockReturnValue('span-1'),
      getTraceparent: jest.fn().mockReturnValue('00-trace-1-span-1-01'),
    } as unknown as jest.Mocked<TraceContextService>;

    filter = new HttpExceptionFilter(logger, traceContext);

    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    setHeader = jest.fn();
  });

  const createHost = (path: string): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          path,
          url: path,
          method: 'POST',
          headers: {
            'x-request-id': 'req-1',
          },
        }),
        getResponse: () => ({
          status,
          setHeader,
        }),
      }),
    }) as unknown as ArgumentsHost;

  it('logs request.path without query string on errors', () => {
    filter.catch(new InvalidCredentialsError(), {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/api/v1/auth/login',
          url: '/api/v1/auth/login?token=secret',
          method: 'POST',
          headers: { 'x-request-id': 'req-1' },
        }),
        getResponse: () => ({ status, setHeader }),
      }),
    } as unknown as ArgumentsHost);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/v1/auth/login' }),
      expect.any(String),
    );
  });

  it('maps DomainError to ResponseDto with code and meta', () => {
    filter.catch(
      new InvalidCredentialsError(),
      createHost('/api/v1/auth/login'),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid email or password',
        code: 'E-AUTH-001',
        meta: expect.objectContaining({
          path: '/api/v1/auth/login',
          requestId: 'req-1',
          traceId: 'trace-1',
          spanId: 'span-1',
          timestamp: expect.any(String),
        }),
      }),
    );
  });

  it('preserves ResponseDto validation payload from BadRequestException', () => {
    const validationBody = ResponseDto.error(
      'Validation failed',
      ErrorCodes.VALIDATION,
      {
        errors: [{ field: 'email', message: 'email must be an email' }],
      },
    );

    filter.catch(
      new BadRequestException(validationBody),
      createHost('/api/v1/auth/register'),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation failed',
        code: ErrorCodes.VALIDATION,
        data: {
          errors: [{ field: 'email', message: 'email must be an email' }],
        },
      }),
    );
  });

  it('maps unexpected DomainError thrown directly to E-UNEXPECTED', () => {
    filter.catch(new UnexpectedError('boom'), createHost('/items'));

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'boom',
        code: ErrorCodes.UNEXPECTED_ERROR,
      }),
    );
  });

  it('keeps Terminus health check body on /health/ready', () => {
    const terminusBody = {
      status: 'error',
      error: { database: { status: 'down' } },
      details: { database: { status: 'down' } },
    };

    filter.catch(
      new HttpException(terminusBody, HttpStatus.SERVICE_UNAVAILABLE),
      createHost('/health/ready'),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(terminusBody);
    expect(json.mock.calls[0][0].success).toBeUndefined();
  });

  it('keeps shutting_down Terminus body on /health/ready', () => {
    const terminusBody = {
      status: 'shutting_down',
      info: {},
      error: { app: { status: 'down', message: 'Server is shutting down' } },
      details: { app: { status: 'down', message: 'Server is shutting down' } },
    };

    filter.catch(
      new HttpException(terminusBody, HttpStatus.SERVICE_UNAVAILABLE),
      createHost('/health/ready'),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(terminusBody);
  });
});
