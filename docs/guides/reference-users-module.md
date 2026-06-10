# Reference: users module

The `users` module demonstrates end-to-end patterns: auth, RBAC, audit, domain events, optimistic locking, caching, and idempotency.

Source: `src/modules/users/`

## Endpoints

| Endpoint | Auth | Patterns demonstrated |
|----------|------|------------------------|
| `GET /api/v1/users/me` | Bearer JWT | `@CurrentUser()`, `QueryUseCase`, profile with `version` |
| `GET /api/v1/users` | `@Roles('admin')` + `@Permissions('users:read')` | RBAC, pagination |
| `PATCH /api/v1/users/:id` | Owner or `users:write` | `@AuditLog`, `UserUpdatedEvent`, optimistic locking |
| `DELETE /api/v1/users/:id` | `@Permissions('users:delete')` | Fine-grained permission |

## Update flow (optimistic locking)

1. Client reads profile from `GET /users/me` (includes `version`).
2. Client sends `PATCH` with `{ name?, email?, version }`.
3. On concurrent edit, API returns `409` with code `E-CONCURRENCY`.
4. Client reloads profile and retries.

## Module wiring

```typescript
// src/modules/users/users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity, PermissionEntity])],
  controllers: [UsersController],
  providers: [
    UserMapper,
    TypeOrmUserRepository,
    { provide: USER_REPOSITORY, useExisting: TypeOrmUserRepository },
    GetCurrentUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    LogUserUpdatedHandler,
    LogUserCreatedHandler,
    UserCacheInvalidationHandler,
  ],
  exports: [USER_REPOSITORY, UserMapper],
})
export class UsersModule {}
```

## Patterns map

| Pattern | File |
|---------|------|
| Domain model + events | `domain/models/user.model.ts` |
| Repository port | `application/ports/user.repository.port.ts` |
| Audit on update | `application/use-cases/update-user.use-case.ts` |
| Cache read-through | `application/use-cases/get-current-user.use-case.ts` |
| Cache invalidation | `infrastructure/events/invalidate-user-cache.handler.ts` |
| RBAC on list/delete | `infrastructure/controllers/users.controller.ts` |
| Owner check in use case | `update-user.use-case.ts` |

## Integration tests

```bash
pnpm test:integration -- users-crud
```

Source: `test/integration/users/users-crud.integration-spec.ts`.

## Learning path

Work through guides in this order using users as reference:

1. [Domain models](./domain-models.md) → `user.model.ts`
2. [Entities and migrations](./entities-and-migrations.md) → `user.entity.ts`
3. [Repositories and mappers](./repositories-and-mappers.md) → `user.mapper.ts`, `typeorm-user.repository.ts`
4. [Use cases](./use-cases.md) → `update-user.use-case.ts`
5. [Controllers](./controllers.md) → `users.controller.ts`
6. [Domain events](./domain-events.md) → `user-created.event.ts`, handlers
7. [Audit logging](./audit-logging.md) → `@AuditLog` on update
8. [Testing](./testing.md) → integration spec

## See also

- [Features: auth](../features/auth.md)
- [Features: caching](../features/data/caching.md)
- [Features: persistence patterns](../features/data/persistence-patterns.md)
