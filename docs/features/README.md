# Features documentation

This section explains **what** the template provides: architecture, cross-cutting capabilities, configuration, and behavior. For step-by-step implementation playbooks, see [guides](../guides/README.md).

## When to read what

| I want to… | Read |
|------------|------|
| Understand the hexagonal layout and use-case pattern | [architecture.md](./architecture.md) |
| Configure CORS, Helmet, IP filtering, or rate limiting | [security.md](./security.md) |
| Learn the API response envelope and error codes | [api-contract.md](./api-contract.md) |
| Set up JWT, RBAC, MFA, OIDC, or API keys | [auth.md](./auth.md) |
| Protect outbound HTTP calls with retry and circuit breaker | [reliability/http-resilience.md](./reliability/http-resilience.md) |
| Accept safe client retries with `Idempotency-Key` | [reliability/idempotency.md](./reliability/idempotency.md) |
| Understand the transactional outbox and event relay | [reliability/domain-events-and-outbox.md](./reliability/domain-events-and-outbox.md) |
| Learn how audit entries are captured and stored | [reliability/audit-log.md](./reliability/audit-log.md) |
| Configure graceful shutdown and request timeouts | [reliability/graceful-shutdown.md](./reliability/graceful-shutdown.md) |
| Expose Prometheus metrics and structured logs | [observability/metrics-and-logging.md](./observability/metrics-and-logging.md) |
| Enable OpenTelemetry distributed tracing | [observability/distributed-tracing.md](./observability/distributed-tracing.md) |
| Configure PostgreSQL, migrations, and pooling | [data/database.md](./data/database.md) |
| Use Redis read-through cache | [data/caching.md](./data/caching.md) |
| Use optimistic locking, soft delete, pagination | [data/persistence-patterns.md](./data/persistence-patterns.md) |
| Run multiple replicas with Redis coordination | [operations/multi-instance.md](./operations/multi-instance.md) |
| Configure Kubernetes/Docker health probes | [operations/health-checks.md](./operations/health-checks.md) |
| Upload files to local disk or S3/MinIO | [operations/storage-and-files.md](./operations/storage-and-files.md) |
| Replace the logging email sender with SMTP | [operations/email.md](./operations/email.md) |
| Deploy with Docker Compose or Helm | [operations/deployment.md](./operations/deployment.md) |

## Catalog by category

### Foundation

- [architecture.md](./architecture.md) — Hexagonal layers, ports/adapters, use cases, `Result` pattern
- [security.md](./security.md) — CORS, Helmet, IP allowlist, rate limiting, trust proxy
- [api-contract.md](./api-contract.md) — Response envelope, validation errors, RFC 7807, API versioning

### Security & access

- [auth.md](./auth.md) — JWT, RBAC, email verification, password reset, MFA, OIDC, API keys

### Reliability

- [reliability/http-resilience.md](./reliability/http-resilience.md) — Outbound timeout, retry, circuit breaker
- [reliability/idempotency.md](./reliability/idempotency.md) — Inbound `Idempotency-Key` contract
- [reliability/domain-events-and-outbox.md](./reliability/domain-events-and-outbox.md) — Transactional outbox, relay, broker adapters
- [reliability/audit-log.md](./reliability/audit-log.md) — Audit pipeline, actor context, stored record shape
- [reliability/graceful-shutdown.md](./reliability/graceful-shutdown.md) — SIGTERM drain, readiness during shutdown

### Observability

- [observability/metrics-and-logging.md](./observability/metrics-and-logging.md) — Prometheus, Pino, business metrics, alerts
- [observability/distributed-tracing.md](./observability/distributed-tracing.md) — OpenTelemetry, W3C headers, APM integration

### Data

- [data/database.md](./data/database.md) — TypeORM, migrations, SSL, connection pool, seeds
- [data/caching.md](./data/caching.md) — Redis cache module, read-through, invalidation
- [data/persistence-patterns.md](./data/persistence-patterns.md) — Optimistic locking, soft delete, pagination

### Operations

- [operations/multi-instance.md](./operations/multi-instance.md) — Redis for throttling, outbox lock, cache
- [operations/health-checks.md](./operations/health-checks.md) — Live, ready, deep probes
- [operations/storage-and-files.md](./operations/storage-and-files.md) — File upload API, local/S3 drivers
- [operations/email.md](./operations/email.md) — `IEmailSender` port and production adapters
- [operations/deployment.md](./operations/deployment.md) — Docker Compose, Helm, CI, load testing

## Configuration reference

All environment variables are validated at startup via Joi in `src/configuration/environments-variables.ts`. Annotated defaults live in [`example.env`](../../example.env) at the repository root.

## Related

- [Guides index](../guides/README.md) — How to build features with this template
- [README](../../README.md) — Quick start and documentation map
