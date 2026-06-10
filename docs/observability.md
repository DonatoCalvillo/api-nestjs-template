# Observability

This template exposes Prometheus metrics at `GET /metrics`, structured Pino logs, and OpenTelemetry traces. Business-level metrics complement the HTTP layer for outbox relay, audit writes, and circuit breaker health.

## Environment variables

```env
METRICS_ENABLED=true
METRICS_IP_FILTER_ENABLED=false
METRICS_IP_ALLOWLIST=127.0.0.1,10.0.0.0/8
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
| `outbox_messages_pending` | Gauge | `status` | Backlog by status (`pending`, `processing`, `failed`) |
| `outbox_messages_published_total` | Counter | `event_name` | Successfully relayed outbox messages |
| `outbox_messages_failed_total` | Counter | `event_name` | Messages marked as permanently failed |
| `audit_log_writes_total` | Counter | `action`, `entity_type`, `actor_type` | Audit entries persisted |
| `audit_log_write_errors_total` | Counter | — | Failed audit persistence attempts |
| `circuit_breaker_state` | Gauge | `circuit_breaker_key` | `0` = closed, `1` = open |
| `circuit_breaker_opened_total` | Counter | `circuit_breaker_key` | Times a circuit opened |

### Limitations

- **Circuit breaker state** is inferred in-process when `ResilientHttpClient` observes an open circuit or a successful request. Half-open state is not distinguished. State is per Node.js process and per `circuit_breaker_key`.
- **Outbox pending gauge** refreshes at the start of each outbox relay cron tick. If the relay is disabled, the gauge is not updated until relay runs again.

## Structured domain failure logs

Expected domain failures (`Result.fail` → `BaseController`) emit a structured `warn` log:

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

`HttpExceptionFilter` does not duplicate logs for domain errors. Unexpected errors still log at `error` level with `errorCode` from the response body.

## Example Prometheus alerting rules

Save as `prometheus-rules.yml` and load from your Prometheus `rule_files` config:

```yaml
groups:
  - name: api-business-alerts
    rules:
      - alert: OutboxBacklogHigh
        expr: sum(outbox_messages_pending{status="pending"}) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Outbox backlog above threshold
          description: More than 100 pending outbox messages for 5 minutes.

      - alert: OutboxFailuresSpiking
        expr: rate(outbox_messages_failed_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: Outbox publish failures increasing
          description: Check broker connectivity and outbox relay logs.

      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: Circuit breaker open for {{ $labels.circuit_breaker_key }}
          description: External service calls are being rejected by the circuit breaker.

      - alert: AuditWriteErrors
        expr: rate(audit_log_write_errors_total[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: Audit log writes failing
          description: Inspect database connectivity and audit_logs table constraints.

      - alert: HighHttp5xxRate
        expr: |
          sum(rate(http_errors_total{status_class="5xx"}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: HTTP 5xx rate above 5%
          description: Check application logs filtered by requestId and traceId.
```

## Runbook

| Alert | What to check |
|-------|----------------|
| `OutboxBacklogHigh` | `outbox_messages` table (`status = pending`), relay cron (`OUTBOX_RELAY_ENABLED`), broker publisher logs |
| `OutboxFailuresSpiking` | `last_error` column on failed rows, message broker credentials, network egress |
| `CircuitBreakerOpen` | External service health, `HTTP_CIRCUIT_BREAKER_*` settings, logs with `circuitBreakerKey` |
| `AuditWriteErrors` | PostgreSQL readiness, migration state for `audit_logs`, use case `@AuditLog` configuration |
| `HighHttp5xxRate` | Pino logs with `statusCode >= 500`, recent deploys, DB/Redis connectivity |

### Useful queries

```promql
# Pending outbox depth
sum(outbox_messages_pending{status="pending"})

# Audit write rate by action
sum by (action) (rate(audit_log_writes_total[5m]))

# Open circuits
circuit_breaker_state == 1
```

## Related docs

- [Distributed tracing](./tracing.md) — OpenTelemetry, `traceparent`, outbound `x-request-id`
- [HTTP resilience](./http-resilience.md) — circuit breaker and retry configuration
- [Audit log](./audit-log.md) — audit persistence and correlation fields
