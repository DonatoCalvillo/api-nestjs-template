# Health checks

Three probe endpoints support Kubernetes, ECS, and other orchestrators. All health routes are exempt from rate limiting and IP filtering.

## What it is

Health checks use `@nestjs/terminus` for dependency validation. Responses follow Terminus JSON format except liveness, which returns a minimal `{ status: "ok" }`.

Implementation: `src/modules/healthy/healthy.controller.ts`.

## Endpoints

| Endpoint | Purpose | Checks |
|----------|---------|--------|
| `GET /health/live` | **Liveness** | None — always HTTP 200 if process responds |
| `GET /health/ready` | **Readiness** | PostgreSQL ping; fails during graceful shutdown |
| `GET /health` | **Deep / monitoring** | Disk storage; OTLP collector (when tracing enabled) |

### Liveness

```json
{ "status": "ok" }
```

Use for `livenessProbe`. Should **not** check external dependencies — only confirms the Node process is alive.

### Readiness

Returns Terminus format with `status: "ok"` (HTTP 200) or `status: "error"` (HTTP 503).

During graceful shutdown, returns `503` with `shutting_down` status so load balancers stop routing traffic. See [graceful-shutdown.md](../reliability/graceful-shutdown.md).

Checks: database ping with 3s timeout.

### Deep health

Checks disk usage on `HEALTH_DISK_PATH` against `HEALTH_DISK_THRESHOLD_PERCENT` (default 90%).

When `OTEL_TRACES_ENABLED=true`, also pings the OTLP collector origin derived from `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HEALTH_DISK_PATH` | `/` | Path for disk check |
| `HEALTH_DISK_THRESHOLD_PERCENT` | `0.9` | Fail when usage exceeds this ratio |

## Kubernetes example

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

Helm chart values include probe configuration. See [deployment.md](./deployment.md).

## Related

- [Graceful shutdown](../reliability/graceful-shutdown.md)
- [Security](../security.md) — Health routes exempt from IP filter and throttle
