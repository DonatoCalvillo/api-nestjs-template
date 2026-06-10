import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { context, propagation, defaultTextMapSetter } from '@opentelemetry/api';
import { AxiosError } from 'axios';
import { PinoLogger } from 'nestjs-pino';
import {
  CircuitOpenedException,
  ResilienceCommand,
  Strategy,
  TimeoutException,
} from 'nestjs-resilience';
import { firstValueFrom } from 'rxjs';
import { getHttpResilienceConfig } from '../../../../configuration/http-resilience';
import {
  HttpMethod,
  HttpRequestOptions,
  IHttpClient,
} from '../../application/ports/http-client.port';
import {
  CircuitBreakerOpenError,
  ExternalServiceError,
} from '../../domain/errors/external-service.error';
import { ActorContextService } from '../audit/actor-context.service';
import {
  BUSINESS_METRICS,
  IBusinessMetrics,
} from '../metrics/business-metrics.port';
import { REQUEST_ID_HEADER } from '../request-context';
import { TRACEPARENT_HEADER } from '../tracing/trace-context.constants';
import { TraceContextService } from '../tracing/trace-context.service';
import { ResiliencePolicyFactory } from './resilience-policy.factory';

const IDEMPOTENT_METHODS: HttpMethod[] = ['GET', 'HEAD', 'OPTIONS'];
const DEFAULT_CIRCUIT_BREAKER_KEY = 'default';

class HttpResilienceCommand extends ResilienceCommand {
  constructor(
    strategies: Strategy[],
    group: string,
    private readonly task: () => Promise<unknown>,
  ) {
    super(strategies, group, 'HttpRequest');
  }

  async run(): Promise<unknown> {
    return this.task();
  }
}

@Injectable()
export class ResilientHttpClient implements IHttpClient {
  constructor(
    private readonly httpService: HttpService,
    private readonly policyFactory: ResiliencePolicyFactory,
    private readonly traceContext: TraceContextService,
    private readonly actorContext: ActorContextService,
    @Inject(BUSINESS_METRICS)
    private readonly businessMetrics: IBusinessMetrics,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResilientHttpClient.name);
  }

  async request<T>(options: HttpRequestOptions): Promise<T> {
    const method = options.method ?? 'GET';
    const circuitBreakerKey =
      options.circuitBreakerKey ?? this.resolveCircuitBreakerKey(options.url);
    const enableRetry = options.retry ?? IDEMPOTENT_METHODS.includes(method);

    this.logger.debug(
      {
        method,
        url: options.url,
        circuitBreakerKey,
        enableRetry,
        traceId: this.traceContext.getTraceId(),
        spanId: this.traceContext.getSpanId(),
      },
      'Executing outbound HTTP request',
    );

    const execute = () => this.executeRequest<T>(options, method);

    if (!getHttpResilienceConfig().enabled) {
      try {
        const result = await execute();
        this.businessMetrics.recordCircuitClosed(circuitBreakerKey);
        return result;
      } catch (error) {
        throw this.mapError(error, circuitBreakerKey);
      }
    }

    try {
      const policies = this.policyFactory.createPolicies(
        circuitBreakerKey,
        enableRetry,
      );
      const command = new HttpResilienceCommand(
        policies,
        circuitBreakerKey,
        execute,
      );

      const result = (await command.execute()) as T;
      this.businessMetrics.recordCircuitClosed(circuitBreakerKey);
      return result;
    } catch (error) {
      throw this.mapError(error, circuitBreakerKey);
    }
  }

  async get<T>(
    url: string,
    options?: Omit<HttpRequestOptions, 'url' | 'method'>,
  ): Promise<T> {
    return this.request<T>({ ...options, url, method: 'GET' });
  }

  async post<T>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'url' | 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>({ ...options, url, method: 'POST', body });
  }

  private async executeRequest<T>(
    options: HttpRequestOptions,
    method: HttpMethod,
  ): Promise<T> {
    const config = getHttpResilienceConfig();
    const timeout = options.timeout ?? config.timeoutMs;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    propagation.inject(context.active(), headers, defaultTextMapSetter);

    const traceparent = this.traceContext.getTraceparent();

    if (traceparent && !headers[TRACEPARENT_HEADER]) {
      headers[TRACEPARENT_HEADER] = traceparent;
    }

    const requestId = this.actorContext.getRequestId();

    if (requestId && !headers[REQUEST_ID_HEADER]) {
      headers[REQUEST_ID_HEADER] = requestId;
    }

    const response = await firstValueFrom(
      this.httpService.request<T>({
        url: options.url,
        method,
        headers,
        data: options.body,
        params: options.params,
        timeout,
        validateStatus: (status) => status >= 200 && status < 300,
      }),
    );

    return response.data;
  }

  private resolveCircuitBreakerKey(url: string): string {
    try {
      return new URL(url).hostname || DEFAULT_CIRCUIT_BREAKER_KEY;
    } catch {
      return DEFAULT_CIRCUIT_BREAKER_KEY;
    }
  }

  private mapError(error: unknown, circuitBreakerKey: string): Error {
    if (error instanceof CircuitBreakerOpenError) {
      return error;
    }

    if (error instanceof ExternalServiceError) {
      return error;
    }

    if (error instanceof CircuitOpenedException) {
      this.businessMetrics.recordCircuitOpen(circuitBreakerKey);
      this.logger.warn(
        { circuitBreakerKey },
        'Circuit breaker is open for external service',
      );
      return new CircuitBreakerOpenError(circuitBreakerKey);
    }

    if (error instanceof TimeoutException) {
      return new ExternalServiceError(
        `Request timed out for service: ${circuitBreakerKey}`,
        error,
      );
    }

    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = status
        ? `External service returned ${status} (${circuitBreakerKey})`
        : `External service request failed (${circuitBreakerKey})`;

      return new ExternalServiceError(message, error);
    }

    if (error instanceof Error) {
      return new ExternalServiceError(error.message, error);
    }

    return new ExternalServiceError(
      `External service request failed (${circuitBreakerKey})`,
    );
  }
}
