# API response format

All HTTP endpoints use a unified `ResponseDto` envelope, except operational routes documented below.

## Success response

```json
{
  "success": true,
  "message": "Request successful",
  "data": {},
  "meta": {
    "timestamp": "2026-06-10T12:00:00.000Z",
    "path": "/auth/login",
    "requestId": "req-123",
    "traceId": "abc",
    "spanId": "def"
  }
}
```

Controllers return plain DTOs; `TransformResponseInterceptor` wraps them automatically.

## Error response

```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "E-AUTH-001",
  "meta": {
    "timestamp": "2026-06-10T12:00:00.000Z",
    "path": "/auth/login",
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
      { "field": "email", "message": "email must be an email" }
    ]
  },
  "meta": { }
}
```

## Trace metadata

`requestId`, `traceId`, and `spanId` are returned in `meta` and also exposed via response headers when available.

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

Auth module errors use `E-AUTH-*` codes while extending the shared base errors.
