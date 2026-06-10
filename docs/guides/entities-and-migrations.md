# Entities and migrations

TypeORM entities live in the infrastructure layer and map to PostgreSQL tables via explicit migrations.

## Prerequisites

- [Domain models](./domain-models.md)

## Extend BaseEntity

```typescript
// src/modules/users/infrastructure/persistence/user.entity.ts
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/infrastructure/persistence';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column()
  name: string;

  @Column()
  email: string;
}
```

`BaseEntity` provides:

| Field | Decorator |
|-------|-----------|
| `id` | `@PrimaryGeneratedColumn('uuid')` |
| `createdAt` | `@CreateDateColumn({ type: 'timestamptz' })` |
| `updatedAt` | `@UpdateDateColumn({ type: 'timestamptz' })` |
| `version` | `@VersionColumn()` |

You do not assign `createdAt`, `updatedAt`, or `version` manually on new records.

## Register entity

### In module

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
})
export class UsersModule {}
```

### In global entity list (required for migrations)

```typescript
// src/database/entities.ts
export const entities = [UserEntity, /* ... */];
```

## Generate migration

PostgreSQL must be running and `.env` configured:

```bash
pnpm migration:generate src/database/migrations/AddUsersTable
pnpm migration:run
```

Revert last migration:

```bash
pnpm migration:revert
```

## RBAC seed

After auth-related migrations:

```bash
pnpm seed:rbac
```

Idempotent script: `src/database/seeds/seed-rbac.ts`.

## Test helpers

Integration tests use Testcontainers:

```typescript
// test/helpers/run-migrations.ts
// test/helpers/postgres-container.ts
```

## Checklist

- [ ] Entity file named `{name}.entity.ts`
- [ ] Entity registered in `entities.ts`
- [ ] `TypeOrmModule.forFeature([Entity])` in module
- [ ] Migration generated and committed
- [ ] `pnpm migration:run` succeeds locally

## Common mistakes

- Running `migration:generate` without registering entity in `entities.ts`
- Using `synchronize: true` (disabled in this template)
- Forgetting to build before migration CLI (`pnpm run build` is in the script)

## See also

- [Features: database](../features/data/database.md)
- [Repositories and mappers](./repositories-and-mappers.md)
