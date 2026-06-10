# API contract

All HTTP endpoints use a unified `ResponseDto` envelope, except operational routes documented below.

## What it is

Clients always receive a predictable JSON shape for success and error responses. Controllers return plain DTOs; `TransformResponseInterceptor` wraps them automatically.

Implementation: `src/modules/shared/domain/response/response.ts`, `src/modules/shared/infrastructure/interceptors/transform-response.interceptor.ts`.

## Success response

```json
{
  "success": true,
  "message": "Request successful",
  "data": {},
  "meta": {
    "timestamp": "2026-06-10T12:00:00.000Z",
    "path": "/api/v1/auth/login",
    "requestId": "req-123",
    "traceId": "abc",
    "spanId": "def"
  }
}
```

## Error response

```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "E-AUTH-001",
  "meta": {
    "timestamp": "2026-06-10T12:00:00.000Z",
    "path": "/api/v1/auth/login",
    "requestId": "req-123",
    "traceId": "abc",
    "spanId": "def"
  }
}
```

Validation errors include structured details in `data`:

```json
{
  "success": false,
  "message": "Validation failed",
  "code": "E-VALIDATION",
  "data": {
    "errors": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  },
  "meta": { }
}
```

## Trace metadata

`requestId`, `traceId`, and `spanId` are returned in `meta` and also exposed via response headers when available.

## API versioning

Business endpoints are served under the global prefix `/api/v1` (for example `/api/v1/auth/login`). Operational routes below stay at the root path.

Configuration: `src/configuration/api.constants.ts`, `src/modules/shared/infrastructure/middlewares/api-version.middleware.ts`.

## Excluded routes

These routes do not use the success envelope:

- `GET /health/live` — liveness probe (`{ status: "ok" }`)
- `GET /health/ready` — readiness probe (Terminus format, database check)
- `GET /health` — deep health check (Terminus format, disk and OTLP)
- `GET /metrics` — Prometheus text format
- `/api/docs` — Swagger UI

## Domain errors

Use typed domain errors from `src/modules/shared/domain/errors/`:

| Error | HTTP status | Code |
|-------|-------------|------|
| `ValidationError` | 400 | `E-VALIDATION` |
| `UnauthorizedError` | 401 | `E-UNAUTHORIZED` |
| `ForbiddenError` | 403 | `E-FORBIDDEN` |
| `NotFoundError` | 404 | `E-NOT-FOUND` |
| `ConflictError` | 409 | `E-CONFLICT` |
| `ConcurrencyConflictError` | 409 | `E-CONCURRENCY` |

Auth module errors use `E-AUTH-*` codes while extending the shared base errors.

See [guides/domain-errors.md](../guides/domain-errors.md) for creating module-specific errors.

## Problem Details (RFC 7807, opt-in)

By default, errors use the `ResponseDto` envelope. Clients may request [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807) Problem Details:

```bash
curl -H "Accept: application/problem+json" \
  -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bad","password":"bad"}'
```

Example response (`Content-Type: application/problem+json`):

```json
{
  "type": "https://api.example.com/problems/E-AUTH-001",
  "title": "Invalid email or password",
  "status": 401,
  "detail": "Invalid email or password",
  "instance": "/api/v1/auth/login",
  "code": "E-AUTH-001",
  "traceId": "...",
  "requestId": "..."
}
```

Configure the problem type base URI with `PROBLEM_TYPE_BASE_URL`. Success responses always use the standard envelope.

Implementation: `src/modules/shared/infrastructure/response/problem-details.util.ts`, `src/modules/shared/infrastructure/filters/http-exception.filter.ts`.

## Related guides

- [DTOs and validation](../guides/dtos-and-validation.md) — Request validation and error shape
- [Controllers](../guides/controllers.md) — How `BaseController` maps `Result` to HTTP
- [Swagger documentation](../guides/swagger-documentation.md) — Document responses in OpenAPI

## Reference implementation

- `src/modules/users/infrastructure/controllers/users.controller.ts`
- `src/modules/shared/infrastructure/filters/http-exception.filter.ts`
