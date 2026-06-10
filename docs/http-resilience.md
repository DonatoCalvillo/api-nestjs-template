# HTTP Resilience

Guía para consumir microservicios y APIs de terceros sin que una caída externa hunda tu backend.

## Dónde vive cada pieza

```
src/
├── configuration/
│   ├── environments-variables.ts   # Variables HTTP_RESILIENCE_*
│   └── http-resilience.ts          # Config tipada para políticas
└── modules/shared/
    ├── application/ports/
    │   └── http-client.port.ts     # Port IHttpClient + HTTP_CLIENT
    ├── domain/errors/
    │   └── external-service.error.ts
    └── infrastructure/http/
        ├── resilience-policy.factory.ts
        ├── resilient-http.client.ts
        └── index.ts
```

El `SharedModule` registra globalmente:

- `HTTP_CLIENT` → `ResilientHttpClient`
- `ResilienceModule` de `nestjs-resilience`
- `HttpModule` de `@nestjs/axios`

## Pipeline de resiliencia (tipo Polly)

Cada request saliente pasa por estas estrategias en orden:

1. **Timeout** — corta llamadas que exceden `HTTP_TIMEOUT_MS`
2. **Retry** — reintenta fallos transitorios (red, 5xx, 408, 429) con backoff exponencial
3. **Circuit Breaker** — abre el circuito tras N fallos y responde fail-fast

El circuit breaker es **independiente por servicio** usando `circuitBreakerKey`.

## Variables de entorno

Copia el bloque de `example.env`:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `HTTP_RESILIENCE_ENABLED` | `true` | Activa/desactiva políticas |
| `HTTP_TIMEOUT_MS` | `5000` | Timeout por request (ms) |
| `HTTP_RETRY_MAX_ATTEMPTS` | `3` | Reintentos máximos |
| `HTTP_RETRY_DELAY_MS` | `500` | Delay inicial entre reintentos (ms) |
| `HTTP_RETRY_BACKOFF_MULTIPLIER` | `2` | Multiplicador exponencial |
| `HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | `5` | Fallos para abrir circuito |
| `HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | `30000` | Tiempo en estado abierto (ms) |

## Uso en un módulo de negocio

### 1. Crear un gateway

Coloca el gateway en `infrastructure/gateways/` del feature module:

```typescript
// src/modules/orders/infrastructure/gateways/payment.gateway.ts
import { Inject, Injectable } from '@nestjs/common';
import { HTTP_CLIENT, IHttpClient } from '../../../shared/application';

@Injectable()
export class PaymentGateway {
  constructor(@Inject(HTTP_CLIENT) private readonly http: IHttpClient) {}

  async charge(orderId: string, amount: number) {
    return this.http.post<{ transactionId: string }>(
      `${process.env.PAYMENT_API_URL}/charges`,
      { orderId, amount },
      { circuitBreakerKey: 'payment-api' },
    );
  }

  async getStatus(transactionId: string) {
    return this.http.get<{ status: string }>(
      `${process.env.PAYMENT_API_URL}/charges/${transactionId}`,
      { circuitBreakerKey: 'payment-api' },
    );
  }
}
```

### 2. Registrar el gateway en el módulo

```typescript
@Module({
  providers: [PaymentGateway],
  exports: [PaymentGateway],
})
export class OrdersModule {}
```

### 3. Consumir desde un use case con degradación graceful

```typescript
import { Result } from '../../../shared/application/use-cases';
import {
  CircuitBreakerOpenError,
  ExternalServiceError,
} from '../../../shared/domain/errors/external-service.error';

async executeImpl(input: ChargeOrderInput) {
  try {
    const payment = await this.paymentGateway.charge(input.orderId, input.amount);
    return Result.ok(payment);
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      return Result.fail(error);
    }
    if (error instanceof ExternalServiceError) {
      return Result.fail(error);
    }
    throw error;
  }
}
```

`BaseController.handleResult()` convertirá `Result.fail()` en una respuesta HTTP `503` con código `E-CIRCUIT-OPEN` o `E-EXT-SERVICE`.

## Convenciones importantes

### `circuitBreakerKey`

Usa un identificador estable por servicio externo (`payment-api`, `inventory-api`). Si no lo defines, se usa el hostname de la URL.

Cada `circuitBreakerKey` mantiene su propio estado de circuit breaker en memoria.

### Retry e idempotencia (saliente)

Esta sección cubre idempotencia en llamadas HTTP **salientes** (tu API → servicios externos). Para proteger la API contra reintentos de clientes (`Idempotency-Key` en `POST`/`PUT`/`PATCH`), ver **[idempotency.md](idempotency.md)**.

Por defecto solo se reintenta en métodos idempotentes:

- `GET`, `HEAD`, `OPTIONS` → retry habilitado
- `POST`, `PUT`, `PATCH`, `DELETE` → sin retry

Para forzar retry en un request específico:

```typescript
this.http.post(url, body, { retry: true, circuitBreakerKey: 'my-api' });
```

### Desactivar resiliencia en desarrollo

```env
HTTP_RESILIENCE_ENABLED=false
```

Las llamadas HTTP siguen funcionando, pero sin timeout/retry/circuit breaker de la librería.

## Errores de dominio

| Error | Código | HTTP | Cuándo ocurre |
|-------|--------|------|---------------|
| `ExternalServiceError` | `E-EXT-SERVICE` | 503 | Fallo tras agotar reintentos o error de red |
| `CircuitBreakerOpenError` | `E-CIRCUIT-OPEN` | 503 | Circuito abierto; fail-fast sin llamar al servicio |

## Troubleshooting

### El circuito se abre muy rápido

- Revisa logs de `ResilientHttpClient` (busca `circuitBreakerKey`)
- Aumenta `HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD`
- Verifica que el servicio externo esté disponible

### El circuito permanece abierto

- Espera `HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS` para el estado half-open
- Reiniciar la app resetea el estado en memoria

### Los reintentos son lentos

- Reduce `HTTP_RETRY_MAX_ATTEMPTS` o `HTTP_RETRY_DELAY_MS`

### Múltiples instancias

El circuit breaker es **in-memory** por instancia. Para estado compartido entre réplicas necesitarías un store Redis vía `ResilienceModule.forRoot({ stores: [...] })` — fuera del alcance actual del template.

## Referencia de la librería

- [nestjs-resilience](https://www.npmjs.com/package/nestjs-resilience) — estrategias tipo Polly para NestJS
- Estrategias usadas: `TimeoutStrategy`, `RetryStrategy`, `CircuitBreakerStrategy`
