# Graceful shutdown and request timeouts

The template supports controlled shutdown on `SIGTERM`/`SIGINT` and configurable inbound request timeouts so orchestrators can drain traffic safely.

## What it is

On shutdown, the process stops accepting new work, waits for in-flight requests to complete, closes connections, and flushes tracing. Readiness probes fail during shutdown so load balancers stop routing traffic.

## Graceful shutdown

| Variable | Default | Description |
|----------|---------|-------------|
| `SHUTDOWN_DRAIN_TIMEOUT_MS` | `30000` | Max wait for in-flight requests before force exit |

### Behavior

1. Process receives `SIGTERM` or `SIGINT`.
2. `ShutdownStateService` marks the app as shutting down.
3. `GET /health/ready` returns `503` with `shutting_down` status.
4. Cron jobs (outbox relay, idempotency cleanup) skip execution.
5. NestJS closes HTTP server and drains active connections.
6. OpenTelemetry SDK shuts down and flushes spans.

Implementation:

- `src/main.ts` — signal handlers
- `src/configuration/shutdown/shutdown.service.ts`
- `src/configuration/shutdown/shutdown-state.service.ts`
- `src/modules/healthy/healthy.controller.ts` — readiness check

### Kubernetes integration

```yaml
lifecycle:
  preStop:
    exec:
      command: ["sh", "-c", "sleep 5"]
terminationGracePeriodSeconds: 45
```

Use readiness probe on `/health/ready` and liveness on `/health/live`. Liveness should **not** check the database.

## Inbound request timeout

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_REQUEST_TIMEOUT_MS` | `30000` | RxJS timeout on inbound handlers |

Requests exceeding this limit receive a timeout response. Implementation: `src/modules/shared/infrastructure/interceptors/request-timeout.interceptor.ts`.

## Related features

- [Health checks](../operations/health-checks.md) — Probe endpoints
- [Domain events and outbox](./domain-events-and-outbox.md) — Relay skips during shutdown

## Reference implementation

- `src/modules/healthy/healthy.controller.ts`
- `src/modules/shared/infrastructure/outbox/outbox-relay.service.ts` — checks `shutdownState.isShuttingDown`
