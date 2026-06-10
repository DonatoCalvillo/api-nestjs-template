# Distributed tracing

This template ships with OpenTelemetry-based distributed tracing. Every inbound HTTP request gets a `traceId` and `spanId`, propagated automatically to outbound HTTP calls and PostgreSQL queries.

## Headers

| Header | Description |
|--------|-------------|
| `traceparent` | W3C Trace Context (`00-{traceId}-{spanId}-{flags}`) |
| `x-trace-id` | Trace ID exposed in responses for debugging |
| `x-request-id` | Business correlation ID (independent from trace ID) |

Incoming `traceparent` headers are respected by the OpenTelemetry SDK. Incoming `x-request-id` is preserved when present.

## Environment variables

```env
OTEL_TRACES_ENABLED=true
OTEL_SERVICE_NAME=dodo-schedule-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Set `OTEL_TRACES_ENABLED=false` to disable tracing (used in tests).

## Architecture

1. `src/instrumentation.ts` bootstraps the OpenTelemetry SDK before Nest starts.
2. Auto-instrumentation covers Express (inbound HTTP), `http`/`https` (outbound HTTP via axios), and `pg` (TypeORM queries).
3. `TracingInterceptor` enriches each controller handler with a child span and stores context in `nestjs-cls`.
4. `ResilientHttpClient` injects W3C `traceparent` and the business `x-request-id` (from `ActorContextService`) on every outbound call when not already set by the caller.
5. Pino logs include `traceId` and `spanId` when available.

## Outbound propagation

`ResilientHttpClient` forwards correlation context to downstream services:

| Header | Source |
|--------|--------|
| `traceparent` | OpenTelemetry active span + `TraceContextService` |
| `x-request-id` | `ActorContextService` (same ID as inbound request) |

Explicit headers passed in `options.headers` take precedence over auto-injected values.

## APM integration

### Grafana Tempo

Run an OTLP collector or Grafana Agent listening on port `4318`:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Correlate logs with traces in Grafana by adding a Loki derived field on `traceId`.

### Datadog

Enable OTLP intake in the Datadog Agent:

```yaml
otlp_config:
  receiver:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
```

Point `OTEL_EXPORTER_OTLP_ENDPOINT` to the agent endpoint.

### New Relic

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318/v1/traces
OTEL_EXPORTER_OTLP_HEADERS=api-key=<YOUR_LICENSE_KEY>
```

## Usage in application code

Inject `TraceContextService` anywhere to read the active trace:

```typescript
constructor(private readonly traceContext: TraceContextService) {}

someMethod() {
  const traceId = this.traceContext.getTraceId();
  const spanId = this.traceContext.getSpanId();
}
```

## Local verification

1. Start an OTLP collector (e.g. Grafana Tempo dev stack or `otelcol`).
2. Set env vars and run `pnpm start:dev`.
3. Call any endpoint and inspect response headers `traceparent` and `x-trace-id`.
4. Confirm spans appear in your APM backend.
