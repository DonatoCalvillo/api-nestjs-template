import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseDto } from '../../../src/modules/shared/domain/response/response';
import { TransformResponseInterceptor } from '../../../src/modules/shared/infrastructure/interceptors/transform-response.interceptor';
import { TraceContextService } from '../../../src/modules/shared/infrastructure/tracing/trace-context.service';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor;
  let traceContext: jest.Mocked<TraceContextService>;

  beforeEach(() => {
    traceContext = {
      getTraceId: jest.fn().mockReturnValue('trace-1'),
      getSpanId: jest.fn().mockReturnValue('span-1'),
      getTraceparent: jest.fn(),
    } as unknown as jest.Mocked<TraceContextService>;

    interceptor = new TransformResponseInterceptor(traceContext);
  });

  const createExecutionContext = (path: string): ExecutionContext =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          path,
          url: path,
          headers: {
            'x-request-id': 'req-1',
          },
        }),
      }),
    }) as unknown as ExecutionContext;

  const createCallHandler = (result: unknown): CallHandler => ({
    handle: () => of(result),
  });

  it('wraps plain handler data in ResponseDto with meta', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(
        createExecutionContext('/api/v1/auth/login'),
        createCallHandler({ accessToken: 'token' }),
      ),
    );

    expect(result).toEqual(
      ResponseDto.success(
        'Request successful',
        { accessToken: 'token' },
        {
          timestamp: expect.any(String),
          path: '/api/v1/auth/login',
          requestId: 'req-1',
          traceId: 'trace-1',
          spanId: 'span-1',
        },
      ),
    );
  });

  it('adds meta to an existing success ResponseDto without double wrapping', async () => {
    const existing = ResponseDto.success('Created', { id: '1' });

    const result = await lastValueFrom(
      interceptor.intercept(
        createExecutionContext('/items'),
        createCallHandler(existing),
      ),
    );

    expect(result).toEqual({
      ...existing,
      meta: {
        timestamp: expect.any(String),
        path: '/items',
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
      },
    });
  });

  it('does not transform excluded paths', async () => {
    const healthBody = { status: 'ok', details: {} };

    const result = await lastValueFrom(
      interceptor.intercept(
        createExecutionContext('/health/ready'),
        createCallHandler(healthBody),
      ),
    );

    expect(result).toBe(healthBody);
  });
});
