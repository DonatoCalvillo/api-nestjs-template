# Caching

Optional Redis-backed caching speeds up read-heavy queries. Cache is shared across replicas when `REDIS_URL` is configured.

## What it is

`AppCacheModule` registers a global `CacheModule` when `CACHE_ENABLED=true`. Feature use cases can read through cache; event handlers invalidate stale entries.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_ENABLED` | `false` | Enable Redis cache |
| `CACHE_TTL_SECONDS` | `300` | Default entry TTL |
| `REDIS_URL` | — | **Required** when `CACHE_ENABLED=true` |

```env
CACHE_ENABLED=true
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=300
```

Implementation: `src/modules/shared/infrastructure/cache/app-cache.module.ts`.

## Read-through pattern

`GetCurrentUserUseCase` caches the user profile by ID:

```typescript
const cacheKey = `user:profile:${userId}`;
const cached = await this.cacheManager.get<UserResponse>(cacheKey);
if (cached) return Result.ok(cached);

const user = await this.userRepository.findById(userId);
// ... map to response
await this.cacheManager.set(cacheKey, response, ttlMs);
```

Source: `src/modules/users/application/use-cases/get-current-user.use-case.ts`.

## Event-driven invalidation

When a user is updated, `InvalidateUserCacheHandler` listens for `UserUpdatedEvent` and deletes the cache key:

```typescript
@OnEvent(UserUpdatedEvent.eventName)
async handle(envelope: DomainEventEnvelope<UserUpdatedEvent>) {
  await this.cacheManager.del(`user:profile:${envelope.event.userId}`);
}
```

Source: `src/modules/users/infrastructure/events/invalidate-user-cache.handler.ts`.

## Multi-instance

With Redis, all replicas share the same cache. See [multi-instance.md](../operations/multi-instance.md).

## Related guides

- [Domain events](../../guides/domain-events.md) — Invalidate cache on state changes
- [Use cases](../../guides/use-cases.md) — Inject `CACHE_MANAGER` in query use cases

## When not to use cache

- Data that must be strongly consistent on every read (use DB directly).
- Lists with complex filters (cache key explosion).
- Writes — always go through command use cases and invalidate explicitly.
