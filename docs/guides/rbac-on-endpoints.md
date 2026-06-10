# RBAC on endpoints

Protect routes with roles and permissions. Permissions are seeded in the database and checked by global guards.

## Prerequisites

- [Controllers](./controllers.md)

Feature reference: [auth](../features/auth.md).

## Step 1 — Define permission constant

```typescript
// src/modules/auth/domain/constants/rbac.constants.ts
export const RBAC_PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  FILES_WRITE: 'files:write',
  // Add new:
  ORDERS_READ: 'orders:read',
} as const;
```

## Step 2 — Add to seed script

```typescript
// src/database/seeds/seed-rbac.ts
const permissions = [
  // ...existing
  { name: RBAC_PERMISSIONS.ORDERS_READ, description: 'Read orders' },
];

// Map to roles
await assignPermissionToRole('admin', RBAC_PERMISSIONS.ORDERS_READ);
```

Run after migration:

```bash
pnpm seed:rbac
```

The script is idempotent — safe on every deploy.

## Step 3 — Apply decorators on controller

```typescript
@Get()
@Roles(RBAC_ROLES.ADMIN)
@Permissions(RBAC_PERMISSIONS.USERS_READ)
@ApiBearerAuth('access-token')
async list() { /* ... */ }

@Delete(':id')
@Permissions(RBAC_PERMISSIONS.USERS_DELETE)
async remove() { /* ... */ }
```

| Decorator | Semantics |
|-----------|-----------|
| `@Roles('admin', 'user')` | User must have **any** listed role |
| `@Permissions('users:read', 'users:write')` | User must have **all** listed permissions |

## Step 4 — Fine-grained checks in use cases

For owner-or-admin patterns, pass `actor` to the command:

```typescript
const isOwner = command.actor.id === command.id;
const canWrite = command.actor.permissions.includes(RBAC_PERMISSIONS.USERS_WRITE);
if (!isOwner && !canWrite) throw new ForbiddenAccessError();
```

## Public routes

```typescript
@Public()
@Post('login')
async login() { /* ... */ }
```

## API keys (service-to-service)

```typescript
@ApiKeyAuth()
@ApiKeyScopes('internal:read')
@Get('health-summary')
async healthSummary() { /* ... */ }
```

## Checklist

- [ ] Permission constant added to `rbac.constants.ts`
- [ ] Seed script updated and run
- [ ] `@Permissions` or `@Roles` on controller route
- [ ] `@ApiBearerAuth` for Swagger on protected routes

## Common mistakes

- Adding permission to seed but not running `pnpm seed:rbac`
- Using `@Roles` when fine-grained `@Permissions` is needed
- Checking permissions only in controller (bypassable) — enforce in use case for sensitive operations

## See also

- [Features: auth](../features/auth.md)
- Reference: `src/modules/users/infrastructure/controllers/users.controller.ts`
