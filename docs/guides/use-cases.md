# Use cases

Business logic lives in use cases. Commands mutate state; queries read data.

## Prerequisites

- [Repositories and mappers](./repositories-and-mappers.md)

## CommandUseCase (writes)

```typescript
@Injectable()
export class UpdateUserUseCase extends CommandUseCase<UpdateUserCommand, User> {
  constructor(
    logger: PinoLogger,
    @Inject(TRANSACTION_MANAGER) transactionManager: ITransactionManager,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {
    super(logger, transactionManager);
  }

  protected async executeCommand(
    command: UpdateUserCommand,
    trx?: QueryRunner,
  ): Promise<User> {
    const user = await this.userRepository.findById(command.id, { trx });
    if (!user) throw new NotFoundError('User not found');

    user.update(command.name, command.email);
    return this.userRepository.save(user, trx);
  }
}
```

### Key points

- Inject `TRANSACTION_MANAGER` and call `super(logger, transactionManager)`.
- Implement `executeCommand(command, trx?)` — return the aggregate/model.
- Throw `DomainError` subclasses for expected failures.
- `CommandUseCase` wraps thrown domain errors in `Result.fail`.
- Return aggregates from `executeCommand` so domain events are collected automatically.

### Transactions

Transactions are enabled by default. Override `requiresTransaction(): boolean` to disable.

Pass `{ trx }` to repository calls inside `executeCommand`.

### Audit logging

Add `@AuditLog({ ... })` on the class. See [audit-logging.md](./audit-logging.md).

## QueryUseCase (reads)

```typescript
@Injectable()
export class GetCurrentUserUseCase extends QueryUseCase<
  { userId: string },
  UserProfile
> {
  constructor(
    logger: PinoLogger,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {
    super(logger);
  }

  protected async executeQuery(input: { userId: string }): Promise<UserProfile> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new NotFoundError('User not found');
    return mapToProfile(user);
  }
}
```

Query use cases do not use transactions or audit logging.

## Result pattern

`execute()` returns `Result<T>`:

```typescript
// Inside use case — throw for expected failures
throw new NotFoundError();

// Or return explicitly (less common in this template)
return Result.fail(new ConflictError());
return Result.ok(value);
```

Controllers use `executeUseCase()` which unwraps `Result` and throws HTTP exceptions.

## Cross-module ports

Auth module imports `USER_REPOSITORY` from users:

```typescript
@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
```

Ensure `UsersModule` exports the port.

## Checklist

- [ ] Commands extend `CommandUseCase`, queries extend `QueryUseCase`
- [ ] Ports injected via Symbol tokens
- [ ] `trx` passed to repository in transactional commands
- [ ] Domain errors thrown, not generic `Error`
- [ ] Aggregates returned for event collection

## Common mistakes

- Putting HTTP or DTO mapping inside use cases
- Catching domain errors and returning generic messages
- Forgetting `version` on optimistic-lock updates

## See also

- [Controllers](./controllers.md)
- [Domain errors](./domain-errors.md)
- [Features: architecture](../features/architecture.md)
