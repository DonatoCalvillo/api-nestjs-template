# Persistence patterns

The template provides reusable persistence patterns: optimistic locking, soft delete, and pagination through `TypeOrmBaseRepository`.

## What it is

Domain models (`UserModel`) are separate from TypeORM entities (`UserEntity`). Mappers translate between them. Repositories extend `TypeOrmBaseRepository` for standard CRUD.

For implementation steps, see [guides/repositories-and-mappers.md](../../guides/repositories-and-mappers.md).

## Base entity

`BaseEntity` provides:

| Export | Field | Description |
|--------|-------|-------------|
| `id` | UUID | Primary key |
| `createdAt` / `updatedAt` | timestamptz | Auto-managed timestamps |
| `version` | integer | Optimistic-lock version |

`SoftDeletableEntity` adds `@DeleteDateColumn` for soft delete support.

## Optimistic locking

When updating a record:

1. Load from DB (includes current `version`).
2. Modify the domain model, passing the loaded `version`.
3. Call `repository.save(model, trx)`.
4. Returned model has `version + 1`.

If two requests update concurrently, TypeORM detects the version mismatch and the repository throws `ConcurrencyConflictError` → HTTP `409` with code `E-CONCURRENCY`.

**API contract:** include `version` in update payloads so clients send back the value they read. Omit `version` on creates.

See [api-contract.md](../api-contract.md) for error codes.

## Soft delete

Extend `SoftDeletableEntity` on entities that support it:

```typescript
await this.userRepository.softDelete(model);  // sets deletedAt
await this.userRepository.delete(model);    // hard delete
```

## Pagination

```typescript
const { items, total } = await this.userRepository.findMany({
  where: { active: true },
  order: { createdAt: 'DESC' },
  page: 1,
  perPage: 20,
});
```

Returns `PaginatedResult<T>`: `{ items, total }`.

API layer uses `PaginationQueryDto` and `PaginatedResponseDto`. See [guides/dtos-and-validation.md](../../guides/dtos-and-validation.md).

## Data flow

```
Database → Entity → toModel() → Model → use case
Database ← Entity ← toPersistence() ← Model ← use case
```

## Related guides

- [Repositories and mappers](../../guides/repositories-and-mappers.md)
- [Domain models](../../guides/domain-models.md)
- [Entities and migrations](../../guides/entities-and-migrations.md)

## Reference implementation

- `src/modules/shared/infrastructure/persistence/typeorm-base.repository.ts`
- `src/modules/users/infrastructure/persistence/typeorm-user.repository.ts`
- `src/modules/users/infrastructure/mappers/user.mapper.ts`
