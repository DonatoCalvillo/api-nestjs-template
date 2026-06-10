# Domain errors

Typed domain errors map to HTTP status codes and stable error codes in API responses.

## Prerequisites

- [Use cases](./use-cases.md)

## Base class

```typescript
// src/modules/shared/domain/errors/error.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  toHttpException(): HttpException { /* ... */ }
}
```

## Shared errors

| Class | HTTP | Code |
|-------|------|------|
| `ValidationError` | 400 | `E-VALIDATION` |
| `UnauthorizedError` | 401 | `E-UNAUTHORIZED` |
| `ForbiddenError` | 403 | `E-FORBIDDEN` |
| `NotFoundError` | 404 | `E-NOT-FOUND` |
| `ConflictError` | 409 | `E-CONFLICT` |
| `ConcurrencyConflictError` | 409 | `E-CONCURRENCY` |

Location: `src/modules/shared/domain/errors/`.

## Module-specific errors

Extend the appropriate base and set a unique code:

```typescript
// src/modules/auth/domain/errors/auth.errors.ts
export class InvalidCredentialsError extends UnauthorizedError {
  readonly code = 'E-AUTH-001';

  constructor() {
    super('Invalid email or password');
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  readonly code = 'E-AUTH-002';

  constructor() {
    super('Email is already registered');
  }
}
```

### Naming convention

- Codes: `E-{MODULE}-{NNN}` (e.g. `E-AUTH-001`, `E-USERS-001`)
- File: `src/modules/{feature}/domain/errors/{feature}.errors.ts`

## Usage in use cases

Throw domain errors — do not return HTTP exceptions:

```typescript
if (!user) throw new NotFoundError('User not found');
if (existing) throw new EmailAlreadyExistsError();
```

`CommandUseCase` catches `DomainError` and returns `Result.fail`. `BaseController` calls `toHttpException()`.

## API response

```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "E-AUTH-001",
  "meta": { "requestId": "...", "traceId": "..." }
}
```

Clients can request RFC 7807 Problem Details with `Accept: application/problem+json`. See [API contract](../features/api-contract.md).

## Checklist

- [ ] Error extends appropriate shared base (`NotFoundError`, etc.)
- [ ] Unique `code` per error type
- [ ] Thrown in use case, not controller
- [ ] Message is safe for client display (no stack traces)

## Common mistakes

- Throwing `HttpException` from use cases (breaks hexagonal boundaries)
- Reusing codes across different error types
- Generic `Error` instead of `DomainError` (becomes 500)

## See also

- [Controllers](./controllers.md) — `executeUseCase` error mapping
- Reference: `src/modules/auth/domain/errors/auth.errors.ts`
