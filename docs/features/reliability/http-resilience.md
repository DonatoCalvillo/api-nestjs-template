# HTTP resilience

When your API consumes microservices or third-party APIs, an external outage should not take down your backend. The template includes a resilience layer based on [`nestjs-resilience`](https://www.npmjs.com/package/nestjs-resilience) (retry, timeout, circuit breaker) and `@nestjs/axios`.

## What it is

Outbound HTTP calls go through `IHttpClient`, implemented by `ResilientHttpClient` with configurable timeout → retry → circuit breaker policies.

## How it works

```
src/
├── configuration/
│   ├── environments-variables.ts   # HTTP_RESILIENCE_* variables
│   └── http-resilience.ts          # Typed config for policies
└── modules/shared/
    ├── application/ports/
    │   └── http-client.port.ts     # IHttpClient + HTTP_CLIENT token
    ├── domain/errors/
    │   └── external-service.error.ts
    └── infrastructure/http/
        ├── resilience-policy.factory.ts
        └── resilient-http.client.ts
```

`SharedModule` registers globally:

- `HTTP_CLIENT` → `ResilientHttpClient`
- `ResilienceModule` from `nestjs-resilience`
- `HttpModule` from `@nestjs/axios`

### Pipeline (Polly-style)

Each outbound request passes through these strategies in order:

1. **Timeout** — cuts calls exceeding `HTTP_TIMEOUT_MS`
2. **Retry** — retries transient failures (network, 5xx, 408, 429) with exponential backoff
3. **Circuit breaker** — opens after N failures and responds fail-fast

The circuit breaker is **independent per service** using `circuitBreakerKey`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_RESILIENCE_ENABLED` | `true` | Enable/disable policies |
| `HTTP_TIMEOUT_MS` | `5000` | Per-request timeout (ms) |
| `HTTP_RETRY_MAX_ATTEMPTS` | `3` | Max retries |
| `HTTP_RETRY_DELAY_MS` | `500` | Initial delay between retries (ms) |
| `HTTP_RETRY_BACKOFF_MULTIPLIER` | `2` | Exponential multiplier |
| `HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | `5` | Failures to open circuit |
| `HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | `30000` | Time in open state (ms) |

Copy the block from [`example.env`](../../../example.env).

## Usage in a feature module

### 1. Create a gateway

Place the gateway in `infrastructure/gateways/` of the feature module:

```typescript
// src/modules/orders/infrastructure/gateways/payment.gateway.ts
import { Inject, Injectable } from '@nestjs/common';
import { HTTP_CLIENT, IHttpClient } from '../../../shared/application';

@Injectable()
export class PaymentGateway {
  constructor(@Inject(HTTP_CLIENT) private readonly http: IHttpClient) {}

  async charge(orderId: string, amount: number) {
    return this.http.post<{ transactionId: string }>(
      `${process.env.PAYMENT_API_URL}/charges`,
      { orderId, amount },
      { circuitBreakerKey: 'payment-api' },
    );
  }
}
```

### 2. Register and consume from a use case

```typescript
import { Result } from '../../../shared/application/use-cases';
import {
  CircuitBreakerOpenError,
  ExternalServiceError,
} from '../../../shared/domain/errors/external-service.error';

try {
  const payment = await this.paymentGateway.charge(input.orderId, input.amount);
  return Result.ok(payment);
} catch (error) {
  if (error instanceof CircuitBreakerOpenError || error instanceof ExternalServiceError) {
    return Result.fail(error);
  }
  throw error;
}
```

`BaseController.handleResult()` maps `Result.fail()` to HTTP `503` with code `E-CIRCUIT-OPEN` or `E-EXT-SERVICE`.

## Conventions

### `circuitBreakerKey`

Use a stable identifier per external service (`payment-api`, `inventory-api`). If omitted, the URL hostname is used. Each key maintains its own in-memory circuit state.

### Retry and idempotency (outbound)

By default only idempotent methods are retried:

- `GET`, `HEAD`, `OPTIONS` → retry enabled
- `POST`, `PUT`, `PATCH`, `DELETE` → no retry

Force retry on a specific request:

```typescript
this.http.post(url, body, { retry: true, circuitBreakerKey: 'my-api' });
```

For **inbound** client retries, see [idempotency.md](./idempotency.md).

### Disable in development

```env
HTTP_RESILIENCE_ENABLED=false
```

## Domain errors

| Error | Code | HTTP | When |
|-------|------|------|------|
| `ExternalServiceError` | `E-EXT-SERVICE` | 503 | Failure after retries or network error |
| `CircuitBreakerOpenError` | `E-CIRCUIT-OPEN` | 503 | Circuit open; fail-fast |

## Observability

Circuit breaker state is exposed as Prometheus gauges. See [observability/metrics-and-logging.md](../observability/metrics-and-logging.md).

Outbound calls propagate `traceparent` and `x-request-id`. See [observability/distributed-tracing.md](../observability/distributed-tracing.md).

## Troubleshooting

| Symptom | Action |
|---------|--------|
| Circuit opens too fast | Increase `HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD`; check external service health |
| Circuit stays open | Wait `HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS` for half-open; restart resets in-memory state |
| Retries are slow | Reduce `HTTP_RETRY_MAX_ATTEMPTS` or `HTTP_RETRY_DELAY_MS` |
| Multiple replicas | Circuit breaker is in-memory per instance; shared Redis store requires custom `ResilienceModule` config |

## Related guides

- [Use cases](../../guides/use-cases.md) — Return `Result.fail()` for graceful degradation
- [Domain errors](../../guides/domain-errors.md) — Extend error types

## Reference

- [nestjs-resilience](https://www.npmjs.com/package/nestjs-resilience) — Strategies: `TimeoutStrategy`, `RetryStrategy`, `CircuitBreakerStrategy`
