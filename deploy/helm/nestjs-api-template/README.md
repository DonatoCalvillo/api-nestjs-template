# NestJS API Template — Helm chart

Deploy the API to Kubernetes with probes, optional ingress, HPA, and Prometheus scrape annotations.

## Prerequisites

- Kubernetes 1.25+
- Helm 3+
- External PostgreSQL and Redis (values configure connection strings)

## Install

```bash
helm install api ./deploy/helm/nestjs-api-template \
  -f ./deploy/helm/nestjs-api-template/values-dev.yaml
```

Production overlay:

```bash
helm upgrade --install api ./deploy/helm/nestjs-api-template \
  -f ./deploy/helm/nestjs-api-template/values.yaml \
  -f ./deploy/helm/nestjs-api-template/values-prod.yaml \
  --set secrets.jwtAccessSecret="$JWT_ACCESS_SECRET" \
  --set secrets.jwtRefreshSecret="$JWT_REFRESH_SECRET" \
  --set secrets.appEncryptionKey="$APP_ENCRYPTION_KEY"
```

## Key values

| Value | Description |
|-------|-------------|
| `database.host` | PostgreSQL host |
| `redis.url` | Redis connection URL |
| `autoscaling.enabled` | Enable HPA |
| `ingress.host` | Public hostname |
| `migration.enabled` | Run post-install migration job |
| `prometheus.scrape` | Add scrape annotations to pods |

## Health probes

- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`

See [docs/features/auth.md](../../../docs/features/auth.md), [docs/features/operations/deployment.md](../../../docs/features/operations/deployment.md), and [docs/features/observability/metrics-and-logging.md](../../../docs/features/observability/metrics-and-logging.md) for runtime configuration.
