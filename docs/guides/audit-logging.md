# Audit logging

Opt in command use cases with `@AuditLog()` to record who changed what.

## Prerequisites

- [Use cases](./use-cases.md) — Commands only

Feature reference: [audit log](../features/reliability/audit-log.md).

## Setup

```bash
pnpm migration:run
```

No module wiring required — `SharedModule` provides audit infrastructure globally.

## Basic usage

```typescript
@Injectable()
@AuditLog({
  action: 'user.update',
  entityType: 'User',
  entityId: (cmd) => cmd.id,
  getBeforeState: async (cmd, { useCase, trx }) =>
    (useCase as UpdateUserUseCase).findByIdForAudit(cmd.id, trx),
})
export class UpdateUserUseCase extends CommandUseCase<UpdateUserCommand, User> {
  async findByIdForAudit(id: string, trx?: QueryRunner) {
    const user = await this.userRepository.findById(id, { trx });
    return user ? user.toJSON() : null;
  }

  protected async executeCommand(command: UpdateUserCommand, trx?: QueryRunner) {
    // ...
  }
}
```

Controller stays unchanged — use `executeUseCase` as usual.

## By operation type

### Create

Omit `getBeforeState`. After state defaults to command result:

```typescript
@AuditLog({
  action: 'user.create',
  entityType: 'User',
  getAfterState: async (_cmd, result) => result,
})
```

### Update

Provide `getBeforeState` loading entity inside the transaction:

```typescript
getBeforeState: async (cmd, { useCase, trx }) =>
  (useCase as UpdateUserUseCase).findByIdForAudit(cmd.id, trx),
```

### Delete

Capture before state; after state is `null`:

```typescript
@AuditLog({
  action: 'user.delete',
  entityType: 'User',
  entityId: (cmd) => cmd.id,
  getBeforeState: async (cmd, { useCase, trx }) =>
    (useCase as DeleteUserUseCase).findByIdForAudit(cmd.id, trx),
  getAfterState: async () => null,
})
```

## Decorator options

| Option | Required | Description |
|--------|----------|-------------|
| `action` | Yes | e.g. `user.update` |
| `entityType` | Yes | e.g. `User` |
| `entityId` | No | Extract ID from command |
| `getBeforeState` | No | State before command |
| `getAfterState` | No | Defaults to command result |

Use `trx` in callbacks so reads participate in the same transaction.

## Checklist

- [ ] Only on `CommandUseCase`, not queries
- [ ] `getBeforeState` uses transaction `trx` when available
- [ ] Expose `findByIdForAudit` helper on use case if needed
- [ ] Sensitive fields auto-redacted (passwords, tokens)

## Common mistakes

- Adding `@AuditLog` to query use cases
- Loading before state without `trx` (inconsistent with rollback)
- Storing secrets in state snapshots

## See also

- Reference: `src/modules/users/application/use-cases/update-user.use-case.ts`
