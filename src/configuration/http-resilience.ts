import { ENVIRONMENT_VARIABLES } from './environments-variables';

export interface HttpResilienceConfig {
  enabled: boolean;
  timeoutMs: number;
  retryMaxAttempts: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerResetTimeoutMs: number;
}

export const getHttpResilienceConfig = (): HttpResilienceConfig => ({
  enabled: ENVIRONMENT_VARIABLES.HTTP_RESILIENCE_ENABLED,
  timeoutMs: ENVIRONMENT_VARIABLES.HTTP_TIMEOUT_MS,
  retryMaxAttempts: ENVIRONMENT_VARIABLES.HTTP_RETRY_MAX_ATTEMPTS,
  retryDelayMs: ENVIRONMENT_VARIABLES.HTTP_RETRY_DELAY_MS,
  retryBackoffMultiplier: ENVIRONMENT_VARIABLES.HTTP_RETRY_BACKOFF_MULTIPLIER,
  circuitBreakerFailureThreshold:
    ENVIRONMENT_VARIABLES.HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  circuitBreakerResetTimeoutMs:
    ENVIRONMENT_VARIABLES.HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
});
