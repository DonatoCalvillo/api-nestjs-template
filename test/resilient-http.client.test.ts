import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { LoggerModule } from 'nestjs-pino';
import { ResilienceModule } from 'nestjs-resilience';
import { of, throwError } from 'rxjs';
import * as httpResilienceConfig from '../src/configuration/http-resilience';
import { HTTP_CLIENT, IHttpClient } from '../src/modules/shared/application';
import {
  CircuitBreakerOpenError,
  ExternalServiceError,
} from '../src/modules/shared/domain/errors/external-service.error';
import {
  ResiliencePolicyFactory,
  ResilientHttpClient,
} from '../src/modules/shared/infrastructure/http';
import { ActorContextService } from '../src/modules/shared/infrastructure/audit/actor-context.service';
import { BUSINESS_METRICS } from '../src/modules/shared/infrastructure/metrics/business-metrics.port';
import { NoOpBusinessMetricsService } from '../src/modules/shared/infrastructure/metrics/noop-business-metrics.service';
import { TraceContextService } from '../src/modules/shared/infrastructure/tracing/trace-context.service';

describe('ResilientHttpClient', () => {
  let client: IHttpClient;
  let httpService: { request: jest.Mock };

  const createModule = async () => {
    httpService = {
      request: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
        ResilienceModule.forRoot({}),
      ],
      providers: [
        ResiliencePolicyFactory,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: TraceContextService,
          useValue: {
            getTraceId: jest.fn().mockReturnValue('a'.repeat(32)),
            getSpanId: jest.fn().mockReturnValue('b'.repeat(16)),
            getTraceparent: jest
              .fn()
              .mockReturnValue(`00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`),
            getActiveContext: jest.fn(),
            setContext: jest.fn(),
            attachToRequest: jest.fn(),
            setResponseHeaders: jest.fn(),
          },
        },
        {
          provide: ActorContextService,
          useValue: {
            getRequestId: jest.fn().mockReturnValue('req-correlation-1'),
          },
        },
        {
          provide: BUSINESS_METRICS,
          useClass: NoOpBusinessMetricsService,
        },
        {
          provide: HTTP_CLIENT,
          useClass: ResilientHttpClient,
        },
      ],
    }).compile();

    client = module.get<IHttpClient>(HTTP_CLIENT);
  };

  const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

  const axiosError = (status?: number): AxiosError => {
    const error = new AxiosError(
      status ? `Request failed with status ${status}` : 'Network error',
      status ? String(status) : 'ERR_NETWORK',
    );

    if (status) {
      error.response = {
        data: {},
        status,
        statusText: 'Error',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
    }

    return error;
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    await createModule();
  });

  it('returns parsed data on successful request', async () => {
    httpService.request.mockReturnValue(of(axiosResponse({ id: '123' })));

    const result = await client.get<{ id: string }>(
      'https://payment-api.example.com/charges/123',
      { circuitBreakerKey: 'payment-api' },
    );

    expect(result).toEqual({ id: '123' });
    expect(httpService.request).toHaveBeenCalledTimes(1);
  });

  it('injects trace propagation headers on outbound requests', async () => {
    httpService.request.mockReturnValue(of(axiosResponse({ ok: true })));

    await client.get('https://payment-api.example.com/status', {
      circuitBreakerKey: 'payment-api',
      headers: { 'x-custom': 'value' },
    });

    const requestConfig = httpService.request.mock.calls[0][0];
    expect(requestConfig.headers).toEqual(
      expect.objectContaining({
        'x-custom': 'value',
        traceparent: `00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`,
      }),
    );
  });

  it('injects x-request-id from actor context on outbound requests', async () => {
    httpService.request.mockReturnValue(of(axiosResponse({ ok: true })));

    await client.get('https://payment-api.example.com/status', {
      circuitBreakerKey: 'payment-api',
    });

    const requestConfig = httpService.request.mock.calls[0][0];
    expect(requestConfig.headers).toEqual(
      expect.objectContaining({
        'x-request-id': 'req-correlation-1',
      }),
    );
  });

  it('preserves explicit x-request-id header from caller', async () => {
    httpService.request.mockReturnValue(of(axiosResponse({ ok: true })));

    await client.get('https://payment-api.example.com/status', {
      circuitBreakerKey: 'payment-api',
      headers: { 'x-request-id': 'caller-request-id' },
    });

    const requestConfig = httpService.request.mock.calls[0][0];
    expect(requestConfig.headers['x-request-id']).toBe('caller-request-id');
  });

  it('retries transient failures for idempotent GET requests', async () => {
    httpService.request
      .mockReturnValueOnce(throwError(() => axiosError(503)))
      .mockReturnValueOnce(of(axiosResponse({ ok: true })));

    const result = await client.get<{ ok: boolean }>(
      'https://payment-api.example.com/status',
      { circuitBreakerKey: 'payment-api' },
    );

    expect(result).toEqual({ ok: true });
    expect(httpService.request).toHaveBeenCalledTimes(2);
  });

  it('does not retry POST requests by default', async () => {
    httpService.request.mockReturnValue(throwError(() => axiosError(503)));

    await expect(
      client.post(
        'https://payment-api.example.com/charges',
        { amount: 100 },
        { circuitBreakerKey: 'payment-api' },
      ),
    ).rejects.toBeInstanceOf(ExternalServiceError);

    expect(httpService.request).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit breaker after repeated failures', async () => {
    httpService.request.mockReturnValue(throwError(() => axiosError(503)));

    const request = () =>
      client.get('https://payment-api.example.com/status', {
        circuitBreakerKey: 'payment-api-cb',
      });

    await expect(request()).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(request()).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(request()).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });

  it('bypasses resilience policies when HTTP_RESILIENCE_ENABLED=false', async () => {
    jest
      .spyOn(httpResilienceConfig, 'getHttpResilienceConfig')
      .mockReturnValue({
        enabled: false,
        timeoutMs: 5000,
        retryMaxAttempts: 2,
        retryDelayMs: 10,
        retryBackoffMultiplier: 1,
        circuitBreakerFailureThreshold: 2,
        circuitBreakerResetTimeoutMs: 30000,
      });

    await createModule();

    httpService.request.mockReturnValue(throwError(() => axiosError(503)));

    await expect(
      client.get('https://payment-api.example.com/status', {
        circuitBreakerKey: 'payment-api-disabled',
      }),
    ).rejects.toBeInstanceOf(ExternalServiceError);

    expect(httpService.request).toHaveBeenCalledTimes(1);
  });
});
