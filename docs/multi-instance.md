# Multi-instancia (N réplicas)

Cuando despliegas varias réplicas de la API detrás de un load balancer, algunos mecanismos in-memory dejan de coordinarse entre pods. Este template permite elegir **memoria** (desarrollo / single-instance) o **Redis** (producción multi-réplica) mediante variables de entorno.

## Cuándo usar cada modo

| Escenario | `THROTTLE_STORAGE` | `OUTBOX_RELAY_LOCK` |
|-----------|-------------------|---------------------|
| Desarrollo local, una réplica | `memory` | `memory` |
| Producción con varias réplicas | `redis` | `redis` |

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `THROTTLE_STORAGE` | `memory` | `memory` = contadores por proceso; `redis` = límites compartidos entre réplicas |
| `OUTBOX_RELAY_LOCK` | `memory` | `memory` = guard local por pod; `redis` = un solo relay activo globalmente |
| `REDIS_URL` | — | **Requerido** si alguna de las dos variables anteriores es `redis` (ej. `redis://localhost:6379`) |
| `OUTBOX_RELAY_LOCK_TTL_SECONDS` | `120` | TTL del lock Redis del relay; si un pod muere, el lock expira y otro puede tomar el relay |

Ejemplo producción:

```env
THROTTLE_STORAGE=redis
OUTBOX_RELAY_LOCK=redis
REDIS_URL=redis://redis:6379
OUTBOX_RELAY_LOCK_TTL_SECONDS=120
```

## Rate limiting (`THROTTLE_STORAGE`)

- **`memory`**: cada réplica mantiene su propio contador. Un cliente puede enviar `THROTTLE_LIMIT` requests a *cada* pod.
- **`redis`**: los contadores se almacenan en Redis vía `@nest-lab/throttler-storage-redis`. El límite `THROTTLE_LIMIT` aplica de forma global por usuario JWT (`user:{id}`) o por IP en rutas anónimas.

`ConditionalThrottlerGuard` y las variables `THROTTLE_ENABLED`, `THROTTLE_TTL`, `THROTTLE_LIMIT` siguen aplicando igual.

## Outbox relay (`OUTBOX_RELAY_LOCK`)

El relay usa `FOR UPDATE SKIP LOCKED` en PostgreSQL para reclamar filas `pending` sin duplicar filas entre réplicas.

| Modo | Comportamiento |
|------|----------------|
| `memory` | Varios pods pueden ejecutar relay en paralelo; cada uno reclama un batch distinto. Solo se evita solapamiento dentro del mismo proceso. |
| `redis` | Solo un pod adquiere el lock `lock:outbox-relay` por tick de cron; los demás omiten la ejecución. Útil si quieres un **único worker** de relay. |

El lock se libera en `finally` al terminar el batch (éxito o error). Si el proceso cae con el lock adquirido, Redis lo libera al expirar el TTL.

Detalle del outbox: [domain-events.md](domain-events.md).

## Dependencias

- `ioredis` — cliente Redis compartido
- `@nest-lab/throttler-storage-redis` — storage distribuido para `@nestjs/throttler`

El cliente Redis se crea solo cuando `THROTTLE_STORAGE=redis` o `OUTBOX_RELAY_LOCK=redis`, y se cierra en `onModuleDestroy`.

## Notas

- **`TRUST_PROXY=true`** sigue siendo recomendable detrás de un load balancer para que el throttler identifique la IP real del cliente.
- La recuperación de filas `processing` huérfanas (crash post-claim) no está cubierta en esta versión; planifica un job de reclaim si lo necesitas.
