# Domain events (in-process)

Aggregates can record domain events when their state changes. After a `CommandUseCase` commits its transaction, those events are published asynchronously to `@OnEvent()` handlers in other modules — within the same Node.js process.

## When to use it

- Extend **`AggregateRoot`** (not `BaseModel`) for aggregates that emit events.
- Register events inside factory methods or domain methods (`create`, `update`, `cancel`, etc.).
- Use handlers for **side effects** (email, cache invalidation, projections) — not for core aggregate invariants.
- Keep handlers **idempotent**; external consumers must also be idempotent (at-least-once delivery via outbox).

## Setup

`EventEmitterModule`, `DomainEventStagingService`, and `NestDomainEventDispatcher` are registered globally in `SharedModule`. No extra setup is required in feature modules beyond registering `@OnEvent()` handler providers.

## Define an event

Place events in the owning feature module (e.g. `users/domain/events/`):

```typescript
import { IDomainEvent } from '../../../shared/domain/model';

export class UserCreatedEvent implements IDomainEvent {
  static readonly eventName = 'user.created';
  readonly eventName = UserCreatedEvent.eventName;
  readonly occurredAt = new Date();

  constructor(
    readonly userId: string,
    readonly email: string,
  ) {}
}
```

## Raise events from the aggregate

```typescript
import { AggregateRoot, BaseModelParams } from '../../../shared/domain/model';
import { UserCreatedEvent } from '../events/user-created.event';

export class UserModel extends AggregateRoot<UserProps> {
  private constructor(params: BaseModelParams<UserProps>) {
    super(params);
  }

  static create(params: { id: string; name: string; email: string }): UserModel {
    const user = new UserModel({
      id: params.id,
      props: {
        name: new NonEmptyStringValueObject('name', params.name),
        email: new EmailValueObject('email', params.email),
      },
    });

    user.addDomainEvent(new UserCreatedEvent(user.id, params.email));
    return user;
  }
}
```

`addDomainEvent` is `protected` — only the aggregate (or subclasses) can register events.

## Command use case (automatic dispatch)

Return the aggregate (or an object/array containing it) from `executeCommand`. `CommandUseCase` collects events after the command succeeds and publishes them **after the transaction commits**:

```typescript
@Injectable()
export class CreateUserUseCase extends CommandUseCase<
  CreateUserCommand,
  UserModel
> {
  constructor(
    logger: PinoLogger,
    @Inject(TRANSACTION_MANAGER) transactionManager: ITransactionManager,
    private readonly userRepository: UserRepository,
  ) {
    super(logger, transactionManager);
  }

  protected async executeCommand(command: CreateUserCommand, trx?: QueryRunner) {
    const user = UserModel.create({
      id: command.id,
      name: command.name,
      email: command.email,
    });

    return this.userRepository.save(user, trx);
  }
}
```

No manual `dispatch` call is needed in the use case.

### Flow

```
Aggregate.addDomainEvent() → repository.save() → stageFrom(result)
  → persistStaged(trx) → INSERT outbox_messages
  → transaction commit → drain() → EventEmitter2.emitAsync()
  → @OnEvent() handlers (async, fire-and-forget)
```

## Transactional outbox (external messaging)

For RabbitMQ, Kafka, AWS SQS, or any external broker, the template persists every staged domain event in the `outbox_messages` table **inside the same database transaction** as the aggregate write. A background relay polls pending rows and publishes them through `IMessageBrokerPublisher`.

`@OnEvent()` handlers are for **in-process** side effects only. They do not replace the outbox for cross-service delivery.

### How it works

| Step | When | What |
|------|------|------|
| Stage | Inside transaction | Events collected from aggregates into CLS |
| Persist | Inside transaction | `OutboxService.persistStaged(trx)` inserts `pending` rows |
| Commit | End of command | Business data and outbox rows commit atomically |
| In-process dispatch | After commit | `EventEmitter2` handlers (unchanged) |
| Relay | Cron (`OutboxRelayService`) | Claims batch → publishes → marks `published` |

If the broker is down at commit time, rows stay `pending` and the relay retries. If the process crashes after commit, outbox rows survive and the relay publishes them later.

### Migration

```bash
pnpm migration:run
```

This creates the `outbox_messages` table. See `src/database/migrations/1782000000000-OutboxMessage.ts`.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OUTBOX_RELAY_ENABLED` | `false` | Enables the cron relay |
| `OUTBOX_RELAY_CRON` | `*/5 * * * * *` | Cron expression (seconds supported) |
| `OUTBOX_RELAY_BATCH_SIZE` | `50` | Max rows claimed per run |
| `OUTBOX_RELAY_MAX_ATTEMPTS` | `5` | Retries before marking `failed` |

Enable the relay in environments where a real broker adapter is registered:

```env
OUTBOX_RELAY_ENABLED=true
```

### Replace the no-op publisher

`SharedModule` registers `NoOpMessageBrokerPublisher` by default (logs and succeeds). For production, provide your own adapter:

```typescript
@Injectable()
export class RabbitMqMessageBrokerPublisher implements IMessageBrokerPublisher {
  async publish(envelope: DomainEventEnvelope): Promise<void> {
    await this.channel.publish(
      'domain-events',
      envelope.event.eventName,
      Buffer.from(JSON.stringify(envelope)),
    );
  }
}

// In your module:
{
  provide: MESSAGE_BROKER_PUBLISHER,
  useClass: RabbitMqMessageBrokerPublisher,
}
```

The relay passes the full `DomainEventEnvelope` (event + actor/request/trace metadata), same shape as `@OnEvent()` handlers.

### Guarantees

| Topic | Behavior |
|-------|----------|
| Atomicity | Outbox rows commit with business data or roll back together |
| External delivery | At-least-once (consumers must be idempotent; see [idempotency.md](idempotency.md#relación-con-el-outbox-mensajería)) |
| In-process handlers | Still fire-and-forget after commit; not durable across restarts |
| Failed relay | Retries up to `OUTBOX_RELAY_MAX_ATTEMPTS`, then `failed` status |

## Listen from another module

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEventEnvelope } from '../../shared/application';
import { UserCreatedEvent } from '../users/domain/events/user-created.event';

@Injectable()
export class SendWelcomeEmailOnUserCreatedHandler {
  @OnEvent(UserCreatedEvent.eventName)
  async handle(
    envelope: DomainEventEnvelope<UserCreatedEvent>,
  ): Promise<void> {
    const { event, metadata } = envelope;
    // metadata.actor, metadata.requestId, metadata.traceId
    await this.emailService.sendWelcome(event.userId, event.email);
  }
}
```

Register the handler in the module `providers` array:

```typescript
@Module({
  providers: [SendWelcomeEmailOnUserCreatedHandler],
})
export class NotificationsModule {}
```

Import `UserCreatedEvent` only for typing and the event name constant — handlers do not need to import the aggregate module's repository or use case.

## Event envelope

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

Context is populated from `ActorContextService` and `TraceContextService` (same request correlation as audit log).

## Collecting events from command results

`collectDomainEventsFrom` walks the command result and pulls events from every `AggregateRoot` instance:

| Result shape | Supported |
|--------------|-----------|
| Single aggregate | Yes |
| Array of aggregates | Yes |
| Plain object with aggregate properties | Yes (shallow recursion) |
| Primitives / `void` | No events staged |

Events are **pulled** from aggregates (`pullDomainEvents`) during staging — the buffer is empty afterward.

## Guarantees and limitations

| Topic | Behavior |
|-------|----------|
| Transaction timing | Events publish only after successful commit |
| Rollback | Staged events are discarded (never drained on failure) |
| In-process durability | Events are lost if the process crashes after commit (CLS is ephemeral) |
| Outbox durability | Survives process restarts; relay delivers to external broker |
| Handler errors | Logged; they do not fail the already-completed command |
| HTTP response | Not blocked by handlers (fire-and-forget dispatch) |
| Ordering | No guaranteed order between handlers of the same event |

## Best practices

1. **Immutable event payloads** — carry IDs and primitives, not live aggregate references.
2. **Stable `eventName`** — use dotted names (`user.created`, `order.cancelled`).
3. **One event per meaningful domain fact** — avoid generic "entity changed" events unless necessary.
4. **Handlers stay thin** — delegate to application services; do not re-implement domain rules.
5. **Combine with `@AuditLog()`** — audit captures state diffs; domain events drive reactions.

## Testing handlers

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

const emitter = new EventEmitter2();
const handler = new SendWelcomeEmailOnUserCreatedHandler(emailService);
emitter.on(UserCreatedEvent.eventName, handler.handle.bind(handler));

await emitter.emitAsync(UserCreatedEvent.eventName, {
  event: new UserCreatedEvent('user-1', 'a@b.com'),
  metadata: { actor: ANONYMOUS_ACTOR },
});
```

Or use Nest testing module with `EventEmitterModule.forRoot()` and register the handler provider.
