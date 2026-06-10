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
