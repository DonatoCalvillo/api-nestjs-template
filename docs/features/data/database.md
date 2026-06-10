# Database

PostgreSQL is the primary datastore, accessed via TypeORM with explicit migrations (no `synchronize` in production).

## What it is

- Entities live in feature modules under `infrastructure/persistence/`.
- Global entity registration: `src/database/entities.ts`.
- Data source config: `src/database/data-source.ts`.
- Migrations: `src/database/migrations/`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5433` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_DATABASE` | `postgres` | Database name |
| `DB_SSL` | `false` | Enable SSL |
| `DB_POOL_MAX` | `20` | Connection pool max size |
| `DB_POOL_IDLE_TIMEOUT_MS` | `30000` | Idle connection timeout |
| `DB_MIGRATIONS_RUN` | `false` | Auto-run migrations on startup (containers) |

TypeORM discovers entities matching `dist/**/*.entity.js` via the global config.

## Migrations

```bash
# Generate (PostgreSQL must be running, .env configured)
pnpm migration:generate src/database/migrations/MyMigration

# Run
pnpm migration:run

# Revert last
pnpm migration:revert

# Show status
pnpm migration:show
```

### Fresh deploy sequence

```bash
pnpm migration:run
pnpm seed:rbac
pnpm start:prod
```

Include `migration:run` and `seed:rbac` in CI/CD or Docker entrypoint. Helm chart includes a migration Job — see [deployment.md](../operations/deployment.md).

## RBAC seed

After migrations, seed roles, permissions, and mappings:

```bash
pnpm seed:rbac
```

The script is idempotent. Source: `src/database/seeds/seed-rbac.ts`.

## Entity conventions

All persistence entities extend `BaseEntity` from `src/modules/shared/infrastructure/persistence/entity.base.ts`:

| Field | Description |
|-------|-------------|
| `id` | UUID primary key |
| `createdAt` / `updatedAt` | Audit timestamps (auto-managed) |
| `version` | Optimistic-lock version column |

Register new entities in `src/database/entities.ts` before running `migration:generate`.

## Docker

```bash
docker compose up -d db
```

Docker Compose overrides `DB_HOST=db` for API containers.

## Related guides

- [Entities and migrations](../../guides/entities-and-migrations.md) — Create entities and generate migrations
- [Persistence patterns](./persistence-patterns.md) — Optimistic locking, soft delete

## Reference implementation

- `src/database/data-source.ts`
- `src/modules/users/infrastructure/persistence/user.entity.ts`
