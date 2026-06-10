# Deployment

The template ships with Docker Compose for local/dev/prod, a Helm chart for Kubernetes, Prometheus alert rules, and CI workflows.

## Docker Compose

### Services

| Service | Purpose |
|---------|---------|
| `db` | PostgreSQL |
| `redis` | Shared throttling, outbox lock, cache |
| `rest-api-dev` | Hot reload + debug port `9229` |
| `rest-api-prd` | Production build |
| `rest-api-prd-2` | Second replica (`multi-instance` profile) |
| `minio` | S3-compatible storage (`storage` profile) |

### Common commands

```bash
# Database only
docker compose up -d db

# Database + Redis (multi-instance)
docker compose up -d db redis

# Development (hot reload)
docker compose up -d rest-api-dev

# Production
docker compose up -d rest-api-prd

# Two replicas + Redis
docker compose --profile multi-instance up -d db redis rest-api-prd rest-api-prd-2

# MinIO for file storage
docker compose --profile storage up -d minio

# Stop all
docker compose down
```

Copy `example.env` to `.env` before starting. Compose overrides `DB_HOST=db` for API containers.

For Redis coordination, set in `.env`:

```env
THROTTLE_STORAGE=redis
OUTBOX_RELAY_LOCK=redis
REDIS_URL=redis://redis:6379
```

See [multi-instance.md](./multi-instance.md).

## Helm (Kubernetes)

Chart location: `deploy/helm/nestjs-api-template/`.

Includes:

- Deployment with liveness/readiness probes
- Service and optional Ingress
- HPA (horizontal pod autoscaler)
- ConfigMap and Secret templates
- Migration Job (runs `migration:run` before rollout)
- ServiceAccount
- Prometheus scrape annotations

```bash
helm install my-api deploy/helm/nestjs-api-template \
  -f deploy/helm/nestjs-api-template/values-dev.yaml
```

See `deploy/helm/nestjs-api-template/README.md` for values reference.

Probe paths: `/health/live`, `/health/ready`. See [health-checks.md](./health-checks.md).

## Prometheus

Alert rules: `deploy/prometheus/alerts.yml`.

Mount in Prometheus config:

```yaml
rule_files:
  - /etc/prometheus/alerts.yml
```

Scrape `GET /metrics` on each pod. Configure `METRICS_IP_ALLOWLIST` for scraper IPs. See [metrics-and-logging.md](../observability/metrics-and-logging.md).

## CI/CD

GitHub Actions (`.github/workflows/`):

| Workflow | Purpose |
|----------|---------|
| `node.yml` | Lint, unit tests (80% coverage gate), build, integration, e2e, contract |
| `load.yml` | Scheduled k6 load tests |

### Test scripts

```bash
pnpm test              # Unit
pnpm test:integration  # Testcontainers Postgres
pnpm test:e2e          # Full app bootstrap
pnpm test:contract     # OpenAPI snapshot
pnpm test:all          # All Jest projects
```

See [guides/testing.md](../../guides/testing.md).

## Load testing

k6 scenarios in `load/scenarios/`. See `load/README.md`.

```bash
pnpm test:load
```

## Production checklist

1. Set strong `JWT_*_SECRET`, `APP_ENCRYPTION_KEY` (32+ chars).
2. Set explicit `CORS_ORIGINS` (not `*`).
3. Enable `TRUST_PROXY=true` behind load balancer.
4. Use `THROTTLE_STORAGE=redis` and `REDIS_URL` for multiple replicas.
5. Run `pnpm migration:run` and `pnpm seed:rbac` on deploy.
6. Configure OTLP endpoint and Prometheus scraping.
7. Replace `LoggingEmailSender` with production email adapter.

## Related

- [Database](../data/database.md) — Migrations and seeds
- [Security](../security.md) — Production security settings
