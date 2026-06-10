# Metrics and logging

The template exposes Prometheus metrics at `GET /metrics`, structured Pino logs, and business-level metrics for outbox relay, audit writes, and circuit breaker health.

## What it is

HTTP instrumentation runs on every business route. Domain failures are logged at `warn` with structured fields. Business metrics complement HTTP metrics for operational runbooks.

## Configuration

```env
METRICS_ENABLED=true
METRICS_IP_FILTER_ENABLED=false
METRICS_IP_ALLOWLIST=127.0.0.1,10.0.0.0/8
LOG_LEVEL=info
```

When `METRICS_ENABLED=false`, business metrics use a no-op implementation and `/metrics` is not registered.

## HTTP metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request latency |
| `http_requests_total` | Counter | `method`, `route`, `status_code` | Total requests |
| `http_errors_total` | Counter | `method`, `route`, `status_class` | 4xx/5xx responses |

Health probes (`/health`, `/health/live`, `/health/ready`) and `/metrics` itself are excluded from HTTP instrumentation.

## Business metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `outbox_messages_pending` | Gauge | `status` | Backlog (`pending`, `processing`, `failed`) |
| `outbox_messages_published_total` | Counter | `event_name` | Relayed messages |
| `outbox_messages_failed_total` | Counter | `event_name` | Permanently failed messages |
| `audit_log_writes_total` | Counter | `action`, `entity_type`, `actor_type` | Audit entries |
| `audit_log_write_errors_total` | Counter | — | Failed audit writes |
| `circuit_breaker_state` | Gauge | `circuit_breaker_key` | `0` = closed, `1` = open |
| `circuit_breaker_opened_total` | Counter | `circuit_breaker_key` | Times circuit opened |

### Limitations

- Circuit breaker state is per-process and inferred when open or on successful request. Half-open is not distinguished.
- Outbox pending gauge refreshes at each relay cron tick. If relay is disabled, gauge is stale.

## Structured logging

Pino logs include `requestId`, `traceId`, and `spanId` when available. Sensitive fields are redacted.

### Domain failure logs

Expected domain failures (`Result.fail` → `BaseController`) emit:

```json
{
  "event": "domain_failure",
  "errorCode": "E-AUTH-001",
  "httpStatus": 401,
  "requestId": "...",
  "traceId": "...",
  "spanId": "...",
  "message": "AuthController received domain failure"
}
```

`HttpExceptionFilter` does not duplicate logs for domain errors. Unexpected errors log at `error` level.

Implementation: `src/configuration/logger.ts`, `src/modules/shared/infrastructure/metrics/`.

## Alerting

Versioned rules: [`deploy/prometheus/alerts.yml`](../../../deploy/prometheus/alerts.yml).

```yaml
rule_files:
  - /etc/prometheus/alerts.yml
```

## Runbook

| Alert | What to check |
|-------|----------------|
| `OutboxBacklogHigh` | `outbox_messages` (`status = pending`), `OUTBOX_RELAY_ENABLED`, broker logs |
| `OutboxFailuresSpiking` | `last_error` on failed rows, broker credentials |
| `CircuitBreakerOpen` | External service health, `HTTP_CIRCUIT_BREAKER_*` settings |
| `AuditWriteErrors` | PostgreSQL readiness, `audit_logs` migration |
| `HighHttp5xxRate` | Pino logs with `statusCode >= 500`, DB/Redis connectivity |

### Useful queries

```promql
sum(outbox_messages_pending{status="pending"})
sum by (action) (rate(audit_log_writes_total[5m]))
circuit_breaker_state == 1
```

## Related

- [Distributed tracing](./distributed-tracing.md) — OpenTelemetry and correlation headers
- [HTTP resilience](../reliability/http-resilience.md) — Circuit breaker configuration
- [Audit log](../reliability/audit-log.md) — Audit persistence
