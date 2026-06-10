# Domain events and transactional outbox

Aggregates record domain events when their state changes. After a `CommandUseCase` commits, events are published asynchronously to `@OnEvent()` handlers in-process and optionally relayed to an external message broker via the transactional outbox.

## What it is

- **In-process handlers** react to domain facts (email, cache invalidation, projections).
- **Transactional outbox** persists events in the same DB transaction as aggregate writes for at-least-once external delivery.

`EventEmitterModule`, `DomainEventStagingService`, and `NestDomainEventDispatcher` are registered globally in `SharedModule`.

## When to use it

- Extend **`AggregateRoot`** (not `BaseModel`) for aggregates that emit events.
- Register events inside factory or domain methods (`create`, `update`, `cancel`).
- Use handlers for **side effects** — not for core aggregate invariants.
- Keep handlers **idempotent**; external consumers must also be idempotent.

For step-by-step implementation, see [guides/domain-events.md](../../guides/domain-events.md).

## In-process flow

```
Aggregate.addDomainEvent() → repository.save() → stageFrom(result)
  → persistStaged(trx) → INSERT outbox_messages
  → transaction commit → drain() → EventEmitter2.emitAsync()
  → @OnEvent() handlers (async, fire-and-forget)
```

`CommandUseCase` collects events from the command result after success and publishes only after commit.

## Transactional outbox

For RabbitMQ, Kafka, AWS SQS, or any external broker, every staged event is inserted into `outbox_messages` **inside the same database transaction** as the aggregate write. A background relay polls pending rows and publishes through `IMessageBrokerPublisher`.

`@OnEvent()` handlers are for in-process side effects only. They do not replace the outbox for cross-service delivery.

| Step | When | What |
|------|------|------|
| Stage | Inside transaction | Events collected from aggregates into CLS |
| Persist | Inside transaction | `OutboxService.persistStaged(trx)` inserts `pending` rows |
| Commit | End of command | Business data and outbox rows commit atomically |
| In-process dispatch | After commit | `EventEmitter2` handlers |
| Relay | Cron (`OutboxRelayService`) | Claims batch → publishes → marks `published` |

If the broker is down at commit time, rows stay `pending` and the relay retries.

### Migration

```bash
pnpm migration:run
```

Creates `outbox_messages`. See `src/database/migrations/1782000000000-OutboxMessage.ts`.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OUTBOX_RELAY_ENABLED` | `false` | Enable cron relay |
| `OUTBOX_RELAY_CRON` | `*/5 * * * * *` | Cron expression (seconds supported) |
| `OUTBOX_RELAY_BATCH_SIZE` | `50` | Max rows per run |
| `OUTBOX_RELAY_MAX_ATTEMPTS` | `5` | Retries before `failed` |
| `OUTBOX_RECLAIM_ENABLED` | `true` | Reclaim stale `processing` rows |
| `OUTBOX_STALE_PROCESSING_SECONDS` | `300` | Age before reclaim |
| `MESSAGE_BROKER_ADAPTER` | `noop` | `noop` or `logging` |
| `OUTBOX_RELAY_LOCK` | `memory` | `memory` or `redis` (single global worker) |
| `OUTBOX_RELAY_LOCK_TTL_SECONDS` | `120` | Redis lock TTL |
| `REDIS_URL` | — | Required when `OUTBOX_RELAY_LOCK=redis` |

### Message broker adapters

| Adapter | Env value | Behavior |
|---------|-----------|----------|
| No-op (default) | `noop` | Debug log only |
| Logging | `logging` | Info log with event name and trace metadata |

For production cross-service delivery, register a custom `IMessageBrokerPublisher`:

```typescript
@Injectable()
export class RabbitMqMessageBrokerPublisher implements IMessageBrokerPublisher {
  async publish(envelope: DomainEventEnvelope): Promise<void> {
    const ok = this.channel.publish(
      'domain-events',
      envelope.event.eventName,
      Buffer.from(JSON.stringify(envelope)),
      { persistent: true },
    );
    if (!ok) throw new Error('RabbitMQ publish buffer full');
  }
}
```

**Contract:** `publish()` must **throw** on failure so the relay can retry.

### Event envelope

Handlers receive a `DomainEventEnvelope`:

```typescript
type DomainEventEnvelope<TEvent extends IDomainEvent> = {
  event: TEvent;
  metadata: {
    actor: ActorSnapshot;
    requestId?: string;
    traceId?: string;
  };
};
```

## Guarantees

| Topic | Behavior |
|-------|----------|
| Atomicity | Outbox rows commit with business data or roll back together |
| External delivery | At-least-once (consumers must be idempotent) |
| In-process handlers | Fire-and-forget after commit; not durable across restarts |
| Outbox durability | Survives process restarts |
| Handler errors | Logged; do not fail the completed command |
| HTTP response | Not blocked by handlers |
| Multi-instance | `SKIP LOCKED` claiming; optional Redis relay lock — [multi-instance.md](../operations/multi-instance.md) |

## Best practices

1. **Immutable event payloads** — IDs and primitives, not live aggregate references.
2. **Stable `eventName`** — dotted names (`user.created`, `order.cancelled`).
3. **One event per meaningful domain fact.**
4. **Handlers stay thin** — delegate to services; do not re-implement domain rules.
5. **Combine with `@AuditLog()`** — audit captures state diffs; events drive reactions.

## Related guides

- [Domain events (how-to)](../../guides/domain-events.md) — Define events and handlers
- [Idempotency](./idempotency.md) — Consumer deduplication expectations

## Reference implementation

- `src/modules/users/domain/events/user-created.event.ts`
- `src/modules/users/infrastructure/events/log-user-created.handler.ts`
- `src/modules/auth/infrastructure/events/send-verification-email.handler.ts`
- `src/modules/shared/infrastructure/outbox/`
