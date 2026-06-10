# Multi-instance (N replicas)

When deploying multiple API replicas behind a load balancer, in-memory coordination breaks down. This template supports **memory** (dev / single-instance) or **Redis** (production multi-replica) via environment variables.

## What it is

Redis coordinates shared rate limiting, optional single-worker outbox relay, and distributed cache across pods.

## When to use each mode

| Scenario | `THROTTLE_STORAGE` | `OUTBOX_RELAY_LOCK` |
|----------|-------------------|---------------------|
| Local dev, single replica | `memory` | `memory` |
| Production, multiple replicas | `redis` | `redis` |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `THROTTLE_STORAGE` | `memory` | `memory` = per-process counters; `redis` = shared limits |
| `OUTBOX_RELAY_LOCK` | `memory` | `memory` = per-pod guard; `redis` = single global relay worker |
| `REDIS_URL` | — | **Required** when either above is `redis` |
| `CACHE_ENABLED` | `false` | `true` = shared Redis cache |
| `CACHE_TTL_SECONDS` | `300` | Default cache TTL |
| `OUTBOX_RELAY_LOCK_TTL_SECONDS` | `120` | Redis lock TTL; expired locks allow takeover |

Production example:

```env
THROTTLE_STORAGE=redis
OUTBOX_RELAY_LOCK=redis
REDIS_URL=redis://redis:6379
OUTBOX_RELAY_LOCK_TTL_SECONDS=120
```

## Rate limiting

- **`memory`:** each replica has its own counter. A client can send `THROTTLE_LIMIT` requests to *each* pod.
- **`redis`:** counters stored via `@nest-lab/throttler-storage-redis`. Limit applies globally per JWT user (`user:{id}`) or per IP on anonymous routes.

`ConditionalThrottlerGuard` and `THROTTLE_ENABLED`, `THROTTLE_TTL`, `THROTTLE_LIMIT` behave the same in both modes.

## Outbox relay

The relay uses `FOR UPDATE SKIP LOCKED` in PostgreSQL to claim `pending` rows without duplicating work.

| Mode | Behavior |
|------|----------|
| `memory` | Multiple pods may run relay in parallel; each claims a different batch |
| `redis` | Only one pod acquires `lock:outbox-relay` per cron tick |

Lock is released in `finally`. If a pod dies with the lock, Redis expires it after TTL.

Details: [domain-events-and-outbox.md](../reliability/domain-events-and-outbox.md).

## Dependencies

- `ioredis` — shared Redis client
- `@nest-lab/throttler-storage-redis` — distributed throttling

Redis client is created only when `THROTTLE_STORAGE=redis` or `OUTBOX_RELAY_LOCK=redis`, and closed on `onModuleDestroy`.

## Local testing with Docker

```bash
docker compose up -d db redis
```

In `.env`:

```env
THROTTLE_STORAGE=redis
OUTBOX_RELAY_LOCK=redis
REDIS_URL=redis://redis:6379
```

Two replicas:

```bash
docker compose --profile multi-instance up -d db redis rest-api-prd rest-api-prd-2
```

Second replica exposes port `3001` by default (`PORT_2` in `.env`).

## Notes

- Set **`TRUST_PROXY=true`** behind a load balancer so throttling uses the real client IP. See [security.md](../security.md).
- Orphan `processing` outbox rows are reclaimed automatically. Delivery is at-least-once — consumers must be idempotent. See [idempotency.md](../reliability/idempotency.md).
