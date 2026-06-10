# Distributed tracing

OpenTelemetry-based distributed tracing gives every inbound HTTP request a `traceId` and `spanId`, propagated automatically to outbound HTTP calls and PostgreSQL queries.

## What it is

Tracing is bootstrapped before Nest starts. Auto-instrumentation covers Express, outbound HTTP (axios), and `pg` (TypeORM). A `TracingInterceptor` adds per-handler child spans and stores context in CLS.

## Headers

| Header | Description |
|--------|-------------|
| `traceparent` | W3C Trace Context (`00-{traceId}-{spanId}-{flags}`) |
| `x-trace-id` | Trace ID in responses for debugging |
| `x-request-id` | Business correlation ID (independent from trace ID) |

Incoming `traceparent` headers are respected. Incoming `x-request-id` is preserved when present.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_TRACES_ENABLED` | `true` | Enable/disable tracing (set `false` in tests) |
| `OTEL_SERVICE_NAME` | `nestjs-api-template` | Service name in spans |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | OTLP HTTP endpoint |

## Architecture

1. `src/instrumentation.ts` bootstraps the OpenTelemetry SDK before Nest starts.
2. Auto-instrumentation covers Express, `http`/`https`, and `pg`.
3. `TracingInterceptor` enriches each controller handler with a child span.
4. `ResilientHttpClient` injects W3C `traceparent` and `x-request-id` on outbound calls.
5. Pino logs include `traceId` and `spanId` when available.

## Outbound propagation

| Header | Source |
|--------|--------|
| `traceparent` | OpenTelemetry active span + `TraceContextService` |
| `x-request-id` | `ActorContextService` |

Explicit headers in `options.headers` take precedence.

## APM integration

### Grafana Tempo

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Correlate logs with traces in Grafana via Loki derived field on `traceId`.

### Datadog

Enable OTLP intake in the Datadog Agent and point `OTEL_EXPORTER_OTLP_ENDPOINT` to the agent.

### New Relic

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318/v1/traces
OTEL_EXPORTER_OTLP_HEADERS=api-key=<YOUR_LICENSE_KEY>
```

## Usage in application code

```typescript
constructor(private readonly traceContext: TraceContextService) {}

someMethod() {
  const traceId = this.traceContext.getTraceId();
  const spanId = this.traceContext.getSpanId();
}
```

## Local verification

1. Start an OTLP collector (Grafana Tempo dev stack or `otelcol`).
2. Set env vars and run `pnpm start:dev`.
3. Call any endpoint and inspect `traceparent` and `x-trace-id` response headers.
4. Confirm spans appear in your APM backend.

Deep health check optionally pings the OTLP endpoint when tracing is enabled. See [health-checks.md](../operations/health-checks.md).

## Related

- [Metrics and logging](./metrics-and-logging.md) — Prometheus and structured logs
- [API contract](../api-contract.md) — `traceId` in response `meta`

## Reference implementation

- `src/instrumentation.ts`
- `src/configuration/tracing.ts`
- `src/modules/shared/infrastructure/tracing/trace-context.service.ts`
