import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import {
  ExponentialBackoff,
  ResilienceFactory,
  Strategy,
  TimeoutException,
} from 'nestjs-resilience';
import { getHttpResilienceConfig } from '../../../../configuration/http-resilience';

@Injectable()
export class ResiliencePolicyFactory {
  private readonly policyCache = new Map<string, Strategy[]>();

  createPolicies(circuitBreakerKey: string, enableRetry: boolean): Strategy[] {
    const cacheKey = `${circuitBreakerKey}:retry:${enableRetry}`;
    const cached = this.policyCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const config = getHttpResilienceConfig();
    const policies: Strategy[] = [
      ResilienceFactory.createTimeoutStrategy(config.timeoutMs),
    ];

    if (enableRetry && config.retryMaxAttempts > 0) {
      policies.push(
        ResilienceFactory.createRetryStrategy({
          maxRetries: config.retryMaxAttempts,
          scaleFactor: config.retryDelayMs,
          backoff: ExponentialBackoff,
          maxDelay: config.retryDelayMs * config.retryBackoffMultiplier ** 10,
          retryable: (error) => this.isTransientError(error),
        }),
      );
    }

    policies.push(
      ResilienceFactory.createCircuitBreakerStrategy({
        requestVolumeThreshold: config.circuitBreakerFailureThreshold,
        sleepWindowInMilliseconds: config.circuitBreakerResetTimeoutMs,
        errorThresholdPercentage: 100,
      }),
    );

    this.policyCache.set(cacheKey, policies);
    return policies;
  }

  private isTransientError(error: Error): boolean {
    if (error instanceof TimeoutException) {
      return true;
    }

    if (error instanceof AxiosError) {
      if (!error.response) {
        return true;
      }

      const status = error.response.status;
      return status >= 500 || status === 408 || status === 429;
    }

    return false;
  }
}
