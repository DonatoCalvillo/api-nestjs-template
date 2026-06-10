# Idempotencia en requests entrantes

Esta guía cubre la idempotencia **entrante** (clientes que llaman a la API). Para retries en llamadas HTTP **salientes**, ver [http-resilience.md](http-resilience.md).

## Cuándo usarla

Envía un `Idempotency-Key` cuando el cliente pueda reintentar la misma operación por:

- timeouts de red o errores transitorios
- doble tap en apps móviles
- reenvíos automáticos de gateways o SDKs
- operaciones sensibles como registro, pagos o creación de recursos

La idempotencia es **opt-in**: si no envías el header, el request se procesa como siempre.

## Contrato del cliente

### Header

| Header | Requerido | Descripción |
|--------|-----------|-------------|
| `Idempotency-Key` | Sí (para activar) | Clave única por operación lógica. Se recomienda UUID v4. |

### Métodos soportados

- `POST`
- `PUT`
- `PATCH`

`GET`, `HEAD`, `OPTIONS` y `DELETE` no pasan por este mecanismo.

### Scope de la clave

La unicidad es por `(scope, idempotency_key)`:

| Contexto | Scope |
|----------|-------|
| Usuario autenticado | `user:{userId}` |
| Endpoint público | `anonymous` |

Dos usuarios distintos pueden reutilizar la misma clave sin conflicto.

### Ejemplo

```http
POST /auth/register HTTP/1.1
Idempotency-Key: 7f5c8f2a-0c4b-4f6a-9c2d-8b1e4a6f9d0c
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret"
}
```

## Respuestas

| Header | Valores | Significado |
|--------|---------|-------------|
| `Idempotency-Replayed` | `true` / `false` | `true` si la respuesta viene de caché |

| Código | Cuándo |
|--------|--------|
| `2xx` / `4xx` cacheados | Reintento con la misma clave y el mismo body → misma respuesta |
| `409 Conflict` | Otra petición con la misma clave sigue en curso (`Retry-After: 1`) |
| `422 Unprocessable Entity` | Misma clave pero body distinto |

Los errores `4xx` (incluida validación) se cachean. Los `5xx` **no** se cachean: la fila `in_progress` se elimina para permitir reintento.

## Cómo funciona internamente

1. El interceptor global [`IdempotencyInterceptor`](../src/modules/shared/infrastructure/idempotency/idempotency.interceptor.ts) lee `Idempotency-Key`.
2. Calcula `request_hash` = SHA-256 de `method + path + body` normalizado.
3. Inserta o recupera una fila en `idempotency_keys`.
4. En reintentos válidos devuelve `response_status` y `response_body` cacheados.
5. Un cron (`IdempotencyCleanupService`) borra filas con `expires_at` vencido.

```mermaid
sequenceDiagram
    participant Client
    participant API as IdempotencyInterceptor
    participant DB as idempotency_keys

    Client->>API: POST + Idempotency-Key
    API->>DB: claim o replay
    alt Primera ejecución
        API->>API: ejecuta handler
        API->>DB: complete
        API-->>Client: respuesta + Idempotency-Replayed false
    alt Reintento válido
        API-->>Client: respuesta cacheada + Idempotency-Replayed true
    end
```

## Configuración

```env
IDEMPOTENCY_ENABLED=true
IDEMPOTENCY_TTL_HOURS=24
IDEMPOTENCY_CLEANUP_CRON=0 */6 * * *
```

| Variable | Default | Descripción |
|----------|---------|-------------|
| `IDEMPOTENCY_ENABLED` | `true` | Activa o desactiva el interceptor |
| `IDEMPOTENCY_TTL_HOURS` | `24` | Tiempo de vida de cada clave |
| `IDEMPOTENCY_CLEANUP_CRON` | `0 */6 * * *` | Cron para borrar claves expiradas |

Ejecuta la migración:

```bash
pnpm migration:run
```

## Opt-out por endpoint

Para handlers donde cachear la respuesta no tiene sentido (webhooks internos, operaciones no deterministas):

```typescript
import { SkipIdempotency } from '../shared/infrastructure/idempotency';

@SkipIdempotency()
@Post('internal/webhook')
handleWebhook() {
  // ...
}
```

Rutas excluidas globalmente: `/health`, `/health/live`, `/health/ready`, `/metrics`.

## Relación con el outbox (mensajería)

El relay del outbox entrega eventos **at-least-once**. Un mismo evento puede publicarse más de una vez si el broker falla o el proceso se reinicia.

| Capa | Garantía | Mecanismo |
|------|----------|-----------|
| API entrante | Exactly-once por clave (ventana TTL) | `Idempotency-Key` + tabla `idempotency_keys` |
| Mensajería saliente | At-least-once | Outbox relay |

Los **consumidores** de mensajes deben ser idempotentes por su cuenta: deduplicar por `event.id`, clave de negocio o tabla `processed_events`. Detalle del outbox: [domain-events.md](domain-events.md).

## Relación con HTTP saliente

| Dirección | Qué protege | Documentación |
|-----------|-------------|---------------|
| Entrante | Reintentos del cliente hacia tu API | Este documento |
| Saliente | Reintentos de tu API hacia servicios externos | [http-resilience.md](http-resilience.md) |

No confundas ambos: el retry automático del `ResilientHttpClient` solo aplica a métodos idempotentes (`GET`, `HEAD`, `OPTIONS`) en llamadas salientes.
