# Authentication and authorization

Canonical reference for JWT auth, RBAC, extended flows (email verification, password reset, MFA, OIDC), and service-to-service API keys.

## What it is

The template ships with a complete auth module (`src/modules/auth/`) and global guards registered in `AppModule`. Most routes require a valid JWT unless marked `@Public()`.

## Quick links

- [API contract](./api-contract.md) — envelope format and error codes
- [Domain events and outbox](./reliability/domain-events-and-outbox.md) — `UserCreatedEvent` on registration
- [Observability](./observability/metrics-and-logging.md) — metrics and alerting
- [RBAC on endpoints](../guides/rbac-on-endpoints.md) — Add permissions to new routes

## Bootstrap

```bash
pnpm migration:run
pnpm seed:rbac   # roles, permissions, role-permission mappings
pnpm start:dev
```

Swagger: `GET /api/docs` (when `SWAGGER_ENABLED=true`).

## Core flows (JWT)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/v1/auth/register` | Public | Create account, return access + refresh tokens |
| `POST /api/v1/auth/login` | Public | Authenticate with email/password |
| `POST /api/v1/auth/refresh` | Public | Rotate refresh token, issue new pair |
| `POST /api/v1/auth/logout` | Bearer JWT | Revoke refresh token |

### Tokens

- **Access token:** JWT signed with `JWT_ACCESS_SECRET`, payload `{ sub: userId }`, TTL `JWT_ACCESS_EXPIRES_IN` (default `15m`).
- **Refresh token:** Opaque random string, SHA-256 hashed in `refresh_tokens`. Rotated on each refresh; **reuse detection** revokes all sessions.

Send access tokens as `Authorization: Bearer <token>`.

## RBAC

Global guards (registered in `AppModule`):

1. `JwtAuthGuard` — validates JWT unless `@Public()`
2. `RolesGuard` — requires any of `@Roles(...)` when set
3. `PermissionsGuard` — requires all of `@Permissions(...)` when set

### Seeded roles and permissions

| Role | Permissions |
|------|-------------|
| `user` | `users:read` |
| `admin` | `users:read`, `users:write`, `users:delete`, `files:write` |

### Example endpoints

| Endpoint | Decorators |
|----------|------------|
| `GET /api/v1/users` | `@Roles('admin')` + `@Permissions('users:read')` |
| `PATCH /api/v1/users/:id` | Owner or `users:write` (use-case check) |
| `DELETE /api/v1/users/:id` | `@Permissions('users:delete')` |
| `POST /api/v1/files/upload` | `@Permissions('files:write')` |

### Opt out of auth

```typescript
@Public()
@Post('login')
async login() { /* ... */ }
```

Health, metrics, and Swagger paths are public via `public-paths.ts`.

## Email verification

| Endpoint | Auth | Body |
|----------|------|------|
| `POST /api/v1/auth/verify-email` | Public | `{ "token": "..." }` |

On registration, a verification token is created and a log entry is emitted via `LoggingEmailSender` (replace with SMTP in production — see [operations/email.md](./operations/email.md)).

| Variable | Default | Description |
|----------|---------|-------------|
| `REQUIRE_EMAIL_VERIFICATION` | `false` | When `true`, login rejects unverified users |
| `EMAIL_VERIFICATION_TTL_HOURS` | `24` | Token lifetime |

## Password reset

| Endpoint | Auth | Body |
|----------|------|------|
| `POST /api/v1/auth/forgot-password` | Public | `{ "email": "..." }` — always returns success |
| `POST /api/v1/auth/reset-password` | Public | `{ "token": "...", "newPassword": "..." }` |

Reset invalidates all refresh tokens for the user.

| Variable | Default | Description |
|----------|---------|-------------|
| `PASSWORD_RESET_TTL_HOURS` | `1` | Reset token lifetime |

## MFA (TOTP)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/v1/auth/mfa/setup` | Bearer | Generate TOTP secret + otpauth URI |
| `POST /api/v1/auth/mfa/verify` | Bearer | Confirm code and enable MFA |
| `POST /api/v1/auth/mfa/challenge` | Public | `{ "mfaToken", "code" }` → final tokens |

When MFA is enabled, login returns `{ mfaRequired: true, mfaToken }` instead of tokens.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENCRYPTION_KEY` | — | Encrypts TOTP secrets at rest (32+ chars in production) |
| `MFA_TOKEN_EXPIRES_IN` | `5m` | MFA challenge token TTL |

## OIDC (client)

Social / enterprise login via external IdP (Google, Auth0, Keycloak):

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/auth/oidc/:provider` | Redirect to IdP |
| `GET /api/v1/auth/oidc/:provider/callback` | Exchange code, link/create user, issue JWT |

```env
OIDC_ENABLED=false
OIDC_GOOGLE_ISSUER=https://accounts.google.com
OIDC_GOOGLE_CLIENT_ID=
OIDC_GOOGLE_CLIENT_SECRET=
OIDC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/oidc/google/callback
```

## API keys (service-to-service)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/v1/internal/health-summary` | `X-Api-Key` | Example S2S route |
| `POST /api/v1/admin/api-keys` | Admin JWT | Create API key (plaintext shown once) |

Header: `X-Api-Key: <key>`. Keys are stored hashed; scopes map to permission strings.

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEYS_ENABLED` | `true` | Enable API key authentication |

## Environment variables

See [`example.env`](../../example.env) for the full list. Auth-related:

```env
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
REQUIRE_EMAIL_VERIFICATION=false
APP_ENCRYPTION_KEY=dev-encryption-key-change-in-production-32chars
OIDC_ENABLED=false
API_KEYS_ENABLED=true
```

## Domain events

Registration uses `User.create()` which emits `UserCreatedEvent` → outbox → `@OnEvent` handlers (welcome email, verification token). See [reliability/domain-events-and-outbox.md](./reliability/domain-events-and-outbox.md) and [guides/domain-events.md](../guides/domain-events.md).

## Related guides

- [Controllers](../guides/controllers.md) — `@CurrentUser()`, guard decorators
- [RBAC on endpoints](../guides/rbac-on-endpoints.md) — Extend permissions

## Reference implementation

- `src/modules/auth/` — controllers, guards, use cases
- `src/modules/users/` — user aggregate, RBAC entities, profile CRUD
