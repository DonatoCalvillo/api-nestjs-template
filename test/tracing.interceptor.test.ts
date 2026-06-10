import { CallHandler, ExecutionContext } from '@nestjs/common';
import { context, trace } from '@opentelemetry/api';
import { of, lastValueFrom } from 'rxjs';
import { TracingInterceptor } from '../src/modules/shared/infrastructure/tracing/tracing.interceptor';
import { TraceContextService } from '../src/modules/shared/infrastructure/tracing/trace-context.service';
import { buildTraceparent } from '../src/modules/shared/infrastructure/tracing/trace-context.utils';

describe('TracingInterceptor', () => {
  const traceId = '1'.repeat(32);
  const spanId = '2'.repeat(16);
  const traceparent = buildTraceparent(traceId, spanId);

  let interceptor: TracingInterceptor;
  let traceContext: jest.Mocked<TraceContextService>;
  let setHeader: jest.Mock;

  beforeEach(() => {
    traceContext = {
      setContext: jest.fn(),
      attachToRequest: jest.fn(),
      setResponseHeaders: jest.fn(),
      getActiveContext: jest.fn(),
      getTraceId: jest.fn(),
      getSpanId: jest.fn(),
      getTraceparent: jest.fn(),
    } as unknown as jest.Mocked<TraceContextService>;

    traceContext.setResponseHeaders.mockImplementation((callback) => {
      callback('traceparent', traceparent);
      callback('x-trace-id', traceId);
    });

    interceptor = new TracingInterceptor(traceContext);
    setHeader = jest.fn();
  });

  const createExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/health/live',
          route: { path: '/health/live' },
        }),
        getResponse: () => ({
          setHeader,
        }),
      }),
      getHandler: () => ({ name: 'check' }),
      getClass: () => ({ name: 'HealthyController' }),
    }) as unknown as ExecutionContext;

  const createCallHandler = (): CallHandler => ({
    handle: () => of({ status: 'ok' }),
  });

  it('enriches trace context and sets response headers', async () => {
    const tracer = trace.getTracer('test');
    const parentSpan = tracer.startSpan('parent');

    await context.with(
      trace.setSpan(context.active(), parentSpan),
      async () => {
        await lastValueFrom(
          interceptor.intercept(createExecutionContext(), createCallHandler()),
        );
      },
    );

    parentSpan.end();

    expect(traceContext.setContext).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: expect.any(String),
        spanId: expect.any(String),
        traceparent: expect.stringMatching(/^00-[a-f0-9]{32}-[a-f0-9]{16}-/),
      }),
    );
    expect(traceContext.attachToRequest).toHaveBeenCalled();
    expect(traceContext.setResponseHeaders).toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith('traceparent', traceparent);
    expect(setHeader).toHaveBeenCalledWith('x-trace-id', traceId);
  });

  it('stores trace context from the active span in CLS', async () => {
    const tracer = trace.getTracer('test');
    const parentSpan = tracer.startSpan('parent');

    await context.with(
      trace.setSpan(context.active(), parentSpan),
      async () => {
        await lastValueFrom(
          interceptor.intercept(createExecutionContext(), createCallHandler()),
        );
      },
    );

    parentSpan.end();

    expect(traceContext.setContext).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: parentSpan.spanContext().traceId,
      }),
    );
  });
});
