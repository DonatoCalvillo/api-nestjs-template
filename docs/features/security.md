# Security

The API supports HTTP security headers, CORS, rate limiting, IP allowlist filtering, request body limits, and sensitive log redaction. All settings are controlled via environment variables and validated at startup with Joi in `src/configuration/environments-variables.ts`.

## What it is

Edge protection runs before controllers execute. Health probes and metrics are exempt from rate limiting and IP filtering so orchestrators can reach them reliably.

## CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ENABLED` | `true` | Enable CORS headers |
| `CORS_ORIGINS` | `*` | Allowed origins, comma-separated. Use `*` only when `CORS_CREDENTIALS=false` |
| `CORS_CREDENTIALS` | `false` | Send `Access-Control-Allow-Credentials`. Cannot be used with `CORS_ORIGINS=*` |

**Production:** `CORS_ORIGINS=*` is rejected at startup. Set explicit origins (e.g. `https://app.example.com`).

Implementation: `src/configuration/cors.ts`, applied in `src/bootstrap/configure-app.ts`.

Separate multiple origins with commas: `http://localhost:4200,https://app.example.com`.

## Helmet

| Variable | Default | Description |
|----------|---------|-------------|
| `HELMET_ENABLED` | `true` | Enable Helmet HTTP security headers |

When enabled, sets on every response:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Cross-Origin-Resource-Policy: cross-origin`
- Hides `X-Powered-By`
- `Strict-Transport-Security` only when `NODE_ENV=production`

Implementation: `src/configuration/helmet.ts`.

## Rate limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `THROTTLE_ENABLED` | `true` | Enable global rate limiting |
| `THROTTLE_TTL` | `60` | Window in seconds |
| `THROTTLE_LIMIT` | `100` | Max requests per window |
| `THROTTLE_STORAGE` | `memory` | `memory` (per process) or `redis` (shared across replicas) |
| `REDIS_URL` | — | Required when `THROTTLE_STORAGE=redis` |

Exceeded requests receive `429 Too Many Requests`.

- **Authenticated routes:** tracker is `user:{userId}` from JWT.
- **Anonymous routes:** tracker is client IP.

Health routes (`/health`, `/health/live`, `/health/ready`) and `/metrics` are exempt.

For multi-replica deployments, use `THROTTLE_STORAGE=redis`. See [operations/multi-instance.md](./operations/multi-instance.md).

Implementation: `src/configuration/throttler.config.ts`, `src/modules/shared/infrastructure/guards/conditional-throttler.guard.ts`.

## IP allowlist

| Variable | Default | Description |
|----------|---------|-------------|
| `IP_FILTER_ENABLED` | `false` | Enable IP allowlist filtering |
| `IP_ALLOWLIST` | `127.0.0.1,::1` | Allowed IPs, comma-separated |
| `TRUST_PROXY` | `false` | Enable Express `trust proxy` for correct `req.ip` behind nginx/ALB |

**Allowlist mode:** only listed IPs can access the API when `IP_FILTER_ENABLED=true`.

Health probes are exempt. Set `TRUST_PROXY=true` when running behind a reverse proxy or load balancer.

Implementation: `src/modules/shared/infrastructure/middlewares/ip-allowlist.middleware.ts`.

### Metrics IP filter (separate)

Prometheus scraping can use a separate allowlist:

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_IP_FILTER_ENABLED` | `false` (dev), `true` (prod) | Restrict `GET /metrics` by IP |
| `METRICS_IP_ALLOWLIST` | `127.0.0.1,::1` | Allowed scraper IPs/CIDRs |

See [observability/metrics-and-logging.md](./observability/metrics-and-logging.md).

## Request limits

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_BODY_LIMIT` | `1mb` | Express JSON body size limit |
| `HTTP_REQUEST_TIMEOUT_MS` | `30000` | Inbound handler timeout via RxJS |

See [reliability/graceful-shutdown.md](./reliability/graceful-shutdown.md) for shutdown behavior.

## Log redaction

Passwords, tokens, secrets, and API keys are stripped from structured logs before persistence. Same field list applies to audit log snapshots.

Implementation: `src/modules/shared/infrastructure/logging/sensitive-fields.constants.ts`.

## Authentication and authorization

JWT, RBAC, MFA, OIDC, and API keys are documented in [auth.md](./auth.md).

## Related guides

- [RBAC on endpoints](../guides/rbac-on-endpoints.md) — Protect routes with roles and permissions
- [Controllers](../guides/controllers.md) — `@Public()`, `@Roles()`, `@Permissions()`

## Reference implementation

- `src/bootstrap/configure-app.ts` — Middleware and global pipes
- `src/app.module.ts` — Global auth guards
- [`example.env`](../../example.env) — Security variable block
