# Domain events (how-to)

Step-by-step guide for defining domain events, raising them from aggregates, and handling them in other modules.

## Prerequisites

- [Domain models](./domain-models.md) — Use `AggregateRoot`
- [Use cases](./use-cases.md) — Return aggregates from commands

Feature reference: [domain events and outbox](../features/reliability/domain-events-and-outbox.md).

## Step 1 — Define the event

```typescript
// src/modules/users/domain/events/user-created.event.ts
import { IDomainEvent } from '../../../shared/domain/model';

export class UserCreatedEvent implements IDomainEvent {
  static readonly eventName = 'user.created';
  readonly eventName = UserCreatedEvent.eventName;
  readonly occurredAt = new Date();

  constructor(
    readonly userId: string,
    readonly email: string,
    readonly name: string,
  ) {}
}
```

Use stable dotted names: `entity.action`.

## Step 2 — Raise from aggregate

```typescript
export class User extends AggregateRoot<UserProps> {
  static create(params: { id: string; name: string; email: string }): User {
    const user = new User({ /* ... */ });
    user.addDomainEvent(
      new UserCreatedEvent(user.id, params.email, params.name),
    );
    return user;
  }
}
```

`addDomainEvent` is `protected` — only the aggregate registers events.

## Step 3 — Return aggregate from command

```typescript
protected async executeCommand(command: CreateUserCommand, trx?: QueryRunner) {
  const user = User.create({ id: command.id, name: command.name, email: command.email });
  return this.userRepository.save(user, trx);
}
```

`CommandUseCase` collects events after success and dispatches after commit. No manual `dispatch` call.

## Step 4 — Create handler

```typescript
@Injectable()
export class LogUserCreatedHandler {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LogUserCreatedHandler.name);
  }

  @OnEvent(UserCreatedEvent.eventName)
  async handle(envelope: DomainEventEnvelope<UserCreatedEvent>): Promise<void> {
    const { event, metadata } = envelope;
    this.logger.info(
      { userId: event.userId, requestId: metadata.requestId },
      'User created',
    );
  }
}
```

## Step 5 — Register handler in module

```typescript
@Module({
  providers: [LogUserCreatedHandler, SendVerificationEmailHandler],
})
export class UsersModule {}
```

Cross-module handlers import only the event class for typing and the event name constant.

## Event envelope

Handlers receive:

```typescript
{
  event: UserCreatedEvent;
  metadata: { actor, requestId?, traceId? };
}
```

## Checklist

- [ ] Event class in `domain/events/`
- [ ] Aggregate extends `AggregateRoot`
- [ ] Event raised in domain method, not controller
- [ ] Handler registered in module `providers`
- [ ] Handler is idempotent

## Common mistakes

- Using `BaseModel` instead of `AggregateRoot`
- Dispatching events manually in use cases
- Heavy domain logic inside handlers
- Non-idempotent side effects without deduplication

## See also

- [Audit logging](./audit-logging.md)
- Reference: `src/modules/users/infrastructure/events/`
