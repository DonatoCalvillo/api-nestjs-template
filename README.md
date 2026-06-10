<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

<h1 align="center">🚀 NestJs + Express Template 🚀</h1>

<p align="center">
  Template for new API REST based on Express and Typescript with Clean Code and Hexagonal Architecture
</p>

<p align="center">
  <a href="https://github.com/AlbertHernandez/express-typescript-service-template/actions/workflows/node.yml?branch=main"><img src="https://github.com/AlbertHernandez/express-typescript-service-template/actions/workflows/node.yml/badge.svg?branch=main" alt="nodejs"/></a>
  <a href="https://nodejs.org/docs/latest-v20.x/api/index.html"><img src="https://img.shields.io/badge/node-20.x-green.svg" alt="node"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-5.x-blue.svg" alt="typescript"/></a>
  <a href="https://www.npmjs.com/"><img src="https://img.shields.io/badge/npm-10.x-red.svg" alt="npm"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/Compiler-swc-blue.svg" alt="swc"/></a>
  <a href="https://jestjs.io/"><img src="https://img.shields.io/badge/Test-Jest_-C21325?logo=jest&logoColor=white" alt="Jest"/></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Dockerized 🐳_-blue.svg" alt="docker"/></a>
</p>

## Motivation 👀

Recently I have been very involved in the development of backend applications with javascript technologies, for this I configure per project a series of tools to have the best possible practices such as dependency injection, testing, strong typing, hexagonal architecture, docker images, pre push and commits. 

This tools for its installation per project is a tedious and laborious task so I have chosen to make a template that we can use at the beginning of the application.

Inspired by projects of very important and knowledgeable people in the field such as:

- [Fernando Herrera](https://github.com/Klerith)

- [Albert Hernandez](https://github.com/AlbertHernandez)

## 🏛️ TypeORM Entities

Persistence entities live in the infrastructure layer and extend `BaseEntity` from `src/modules/shared/infrastructure/persistence/entity.base.ts`. The base class provides a UUID primary key, audit timestamps, and an optimistic-locking version column managed by TypeORM.

### What is included

| Export | Field | TypeORM decorator |
|--------|-------|-------------------|
| `IEntity` | Interface contract for persistence entities | — |
| `BaseEntity` | Abstract base class implementing `IEntity` | — |
| `id` | UUID primary key | `@PrimaryGeneratedColumn('uuid')` |
| `createdAt` | Creation timestamp | `@CreateDateColumn({ type: 'timestamptz' })` |
| `updatedAt` | Last update timestamp | `@UpdateDateColumn({ type: 'timestamptz' })` |
| `version` | Optimistic-lock version | `@VersionColumn()` |

`createdAt` and `updatedAt` are set automatically on insert and update. `version` starts at `1` on insert and increments on each update. You do not need to assign these fields manually on new records.

### Recommended folder structure

```
src/modules/users/
└── infrastructure/
    └── persistence/
        └── user.entity.ts
```

### Extend `BaseEntity`

```typescript
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

### Register the entity in a module

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './infrastructure/persistence/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
})
export class UsersModule {}
```

TypeORM discovers entities matching `dist/**/*.entity.js` via the global config in `src/database/data-source.ts`. Name concrete entity files with the `.entity.ts` suffix (for example, `user.entity.ts`).

## 🧱 Domain Models

Domain models represent business logic in the domain layer using [`value-object-lib`](https://www.npmjs.com/package/value-object-lib). They are separate from TypeORM persistence entities. The abstraction lives in `src/modules/shared/domain/model/`.

### What is included

| Export | Description |
|--------|-------------|
| `IModel` | Contract for domain models (`id`, timestamps, `version`, `equals`, `toJSON`) |
| `BaseModel` | Abstract base class with validated `id` and optional audit fields |
| `BaseModelParams` | Constructor params: `id`, `props`, `createdAt?`, `updatedAt?`, `version?` |
| `toPrimitives` | Utility to serialize nested value objects to plain values |

`BaseModel` validates the `id` as a UUID, optional dates via `DateValueObject`, and optional `version` via `NonNegativeNumberValueObject`. Invalid values throw a `ValueObjectValidationError` at construction time. Use `version: null` (default) for new aggregates not yet persisted.

### Recommended folder structure

Place concrete models inside each feature module under `domain/`:

```
src/modules/users/
└── domain/
    └── models/
        └── user.model.ts
```

### Step 1 — Define props with value objects

Use value objects from `value-object-lib` to encapsulate validation inside your domain. Define the props type in the same file as your model (or in a dedicated `user.props.ts`):

```typescript
// src/modules/users/domain/models/user.model.ts
import {
  EmailValueObject,
  NonEmptyStringValueObject,
} from 'value-object-lib';

export type UserProps = {
  name: NonEmptyStringValueObject;
  email: EmailValueObject;
};
```

Available value objects include `StringValueObject`, `NonEmptyStringValueObject`, `EmailValueObject`, `UUIDValueObject`, `DateValueObject`, `NumberValueObject`, `PositiveNumberValueObject`, `NonNegativeNumberValueObject`, `BooleanValueObject`, `PhoneNumberValueObject`, and `EnumValueObject`.

### Step 2 — Extend `BaseModel`

In the same file, extend `BaseModel` and expose getters for the domain data:

```typescript
import {
  BaseModel,
  BaseModelParams,
} from '../../shared/domain/model';

export class UserModel extends BaseModel<UserProps> {
  constructor(params: BaseModelParams<UserProps>) {
    super(params);
  }

  get name(): string {
    return this.props.name.value;
  }

  get email(): string {
    return this.props.email.value;
  }
}
```

Expose domain data through getters instead of returning raw value objects to outer layers.

### Step 3 — Create an instance

```typescript
import { randomUUID } from 'crypto';
import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { UserModel } from './user.model';

const now = new Date();

const user = new UserModel({
  id: randomUUID(),
  props: {
    name: new NonEmptyStringValueObject('name', 'Edgar'),
    email: new EmailValueObject('email', 'edgar@example.com'),
  },
  createdAt: now,
  updatedAt: null,
});
```

`createdAt`, `updatedAt`, and `version` are optional and default to `null`. When provided, dates and version are validated.

### Step 4 — Compare and serialize

```typescript
// Identity comparison (same id = same entity)
user.equals(otherUser);

// Flat object for persistence, mappers, or API responses
user.toJSON();
// {
//   name: 'Edgar',
//   email: 'edgar@example.com',
//   id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
//   createdAt: Date,
//   updatedAt: null,
//   version: null,
// }
```

`toJSON()` automatically unwraps nested value objects in `props` using `toPrimitives`.

### Factory methods (recommended)

For complex creation logic, prefer a static factory over calling `new` from application layers:

```typescript
export class UserModel extends BaseModel<UserProps> {
  static create(name: string, email: string): UserModel {
    return new UserModel({
      id: randomUUID(),
      props: {
        name: new NonEmptyStringValueObject('name', name),
        email: new EmailValueObject('email', email),
      },
      createdAt: new Date(),
    });
  }
}
```

## 🔄 Mappers

Mappers translate between domain models (`IModel`) and TypeORM entities (`IEntity`). The contract lives in `src/modules/shared/application/mappers/` and keeps the domain layer free from persistence details.

### What is included

| Export | Description |
|--------|-------------|
| `IMapper` | Contract with `toModel` and `toPersistence` |
| `toModel` | Converts a TypeORM entity into a domain model |
| `toPersistence` | Converts a domain model into a TypeORM entity |

### Recommended folder structure

```
src/modules/users/
├── domain/
│   └── models/
│       └── user.model.ts
├── infrastructure/
│   ├── persistence/
│   │   └── user.entity.ts
│   └── mappers/
│       └── user.mapper.ts
```

### Step 1 — Implement `IMapper`

Create one mapper per aggregate, implementing both conversion directions:

```typescript
// src/modules/users/infrastructure/mappers/user.mapper.ts
import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { IMapper } from '../../../shared/application/mappers';
import { UserModel } from '../../domain/models/user.model';
import { UserEntity } from '../persistence/user.entity';

export class UserMapper implements IMapper<UserModel, UserEntity> {
  toModel(entity: UserEntity): UserModel {
    return new UserModel({
      id: entity.id,
      props: {
        name: new NonEmptyStringValueObject('name', entity.name),
        email: new EmailValueObject('email', entity.email),
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      version: entity.version,
    });
  }

  toPersistence(model: UserModel): UserEntity {
    const entity = new UserEntity();

    entity.id = model.id;
    entity.name = model.name;
    entity.email = model.email;
    entity.createdAt = model.createdAt ?? new Date();
    entity.updatedAt = model.updatedAt ?? new Date();

    if (model.version !== null) {
      entity.version = model.version;
    }

    return entity;
  }
}
```

**`toModel`:** use when reading from the database (repository → use case → domain).

**`toPersistence`:** use before saving to the database (domain → repository → TypeORM).

Rebuild value objects in `toModel` so domain validation runs on every load. Map primitives in `toPersistence` from model getters, not from raw value objects.

### Step 2 — Register the mapper in the module

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './infrastructure/persistence/user.entity';
import { UserMapper } from './infrastructure/mappers/user.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UserMapper],
  exports: [UserMapper],
})
export class UsersModule {}
```

### Step 3 — Extend the base repository

Extend `TypeOrmBaseRepository` to inherit CRUD operations. The base class uses `IMapper` internally and implements `IRepository`.

**Shared exports** (`src/modules/shared/infrastructure/persistence/`):

| Export | Description |
|--------|-------------|
| `TypeOrmBaseRepository` | Abstract base with `findById`, `findOne`, `findMany`, `save`, `delete`, `softDelete` |
| `SoftDeletableEntity` | Optional base entity with `@DeleteDateColumn` for soft delete support |
| `BaseEntity` / `IEntity` | Standard entity contract with UUID, timestamps, and `version` |
| `ConcurrencyConflictError` | Domain error mapped to HTTP 409 when optimistic locking fails |

**Domain port** (`src/modules/shared/domain/repositories/`):

| Export | Description |
|--------|-------------|
| `IRepository` | Repository contract implemented by concrete repositories |
| `QueryOptions` | Filter, relations, pagination, and transaction options |
| `PaginatedResult` | `{ items, total }` returned by `findMany` |

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IRepository } from '../../../shared/domain/repositories';
import { TypeOrmBaseRepository } from '../../../shared/infrastructure/persistence';
import { UserModel } from '../../domain/models/user.model';
import { UserEntity } from '../persistence/user.entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class UserRepository
  extends TypeOrmBaseRepository<UserModel, UserEntity>
  implements IRepository<UserModel>
{
  constructor(mapper: UserMapper, dataSource: DataSource) {
    super(mapper, dataSource, UserRepository.name);
  }

  protected entityClass() {
    return UserEntity;
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.findOne({ where: { email } });
  }
}
```

Register the repository in the module:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UserMapper, UserRepository],
  exports: [UserRepository],
})
export class UsersModule {}
```

**Pagination example:**

```typescript
const { items, total } = await this.userRepository.findMany({
  where: { active: true },
  order: { createdAt: 'DESC' },
  page: 1,
  perPage: 20,
});
```

**Soft delete:** extend `SoftDeletableEntity` instead of `BaseEntity` on entities that support it, then call `softDelete(model)`. Use `delete(model)` for hard deletes that permanently remove the row.

**Optimistic locking:** when updating a record, load it from the database, modify the domain model, and pass the loaded `version` into `save`. The repository returns the saved model with the incremented version:

```typescript
const user = await this.userRepository.findById(id);
if (!user) return Result.fail(new NotFoundError());

const updated = new UserModel({
  id: user.id,
  props: { /* modified props */ },
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  version: user.version,
});

const saved = await this.userRepository.save(updated, trx);
// saved.version is now user.version + 1
```

If two requests update the same row concurrently, TypeORM detects the version mismatch and the repository throws `ConcurrencyConflictError` (HTTP 409, code `E-CONCURRENCY`). The client should reload the record and retry.

Include `version` in update API payloads so the client sends back the value it read. For creates, omit `version` and let TypeORM initialize it.

### Data flow

```
Database → UserEntity → toModel() → UserModel → use case / domain logic
Database ← UserEntity ← toPersistence() ← UserModel ← use case / domain logic
```

## 🔒 Security

The API supports CORS, rate limiting, and IP allowlist filtering. All settings are controlled via environment variables and validated at startup with Joi in `src/configuration/environments-variables.ts`.

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ENABLED` | `true` | Enable CORS headers |
| `CORS_ORIGINS` | `*` | Allowed origins, comma-separated. Use `*` to allow all |
| `CORS_CREDENTIALS` | `false` | Send `Access-Control-Allow-Credentials`. Cannot be used with `CORS_ORIGINS=*` |
| `THROTTLE_ENABLED` | `true` | Enable global rate limiting |
| `THROTTLE_TTL` | `60` | Rate limit window in seconds |
| `THROTTLE_LIMIT` | `100` | Max requests per IP within the window |
| `IP_FILTER_ENABLED` | `false` | Enable IP allowlist filtering |
| `IP_ALLOWLIST` | `127.0.0.1,::1` | Allowed IPs when filtering is enabled, comma-separated |
| `TRUST_PROXY` | `false` | Enable Express `trust proxy` for correct `req.ip` behind nginx/ALB |

Copy the security block from `example.env` into your `.env` file.

**CORS:** Separate multiple origins with commas (e.g. `http://localhost:4200,https://app.example.com`). Use `*` only when `CORS_CREDENTIALS=false`.

**Rate limiting:** Exceeded requests receive `429 Too Many Requests`. Disable with `THROTTLE_ENABLED=false`.

**IP filtering:** Allowlist mode — only listed IPs can access the API when `IP_FILTER_ENABLED=true`. Set `TRUST_PROXY=true` when running behind a reverse proxy or load balancer.

**Health check:** `GET /healthy` is exempt from rate limiting and IP filtering for probes from orchestrators and load balancers.

## 🛡️ HTTP Resilience

Cuando tu API consume microservicios o APIs de terceros, una caída externa no debe tumbar tu backend. El template incluye una capa de resiliencia basada en [`nestjs-resilience`](https://www.npmjs.com/package/nestjs-resilience) (retry, timeout, circuit breaker) y `@nestjs/axios`.

### Qué incluye

| Pieza | Ubicación | Descripción |
|-------|-----------|-------------|
| `IHttpClient` | `src/modules/shared/application/ports/http-client.port.ts` | Port para llamadas HTTP salientes |
| `ResilientHttpClient` | `src/modules/shared/infrastructure/http/` | Adapter con políticas de resiliencia |
| `ResiliencePolicyFactory` | `src/modules/shared/infrastructure/http/` | Construye timeout → retry → circuit breaker |
| Errores de dominio | `src/modules/shared/domain/errors/external-service.error.ts` | `ExternalServiceError`, `CircuitBreakerOpenError` |

`SharedModule` expone globalmente `HTTP_CLIENT`. Inyéctalo en gateways de cada feature module.

### Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `HTTP_RESILIENCE_ENABLED` | `true` | Activa/desactiva políticas |
| `HTTP_TIMEOUT_MS` | `5000` | Timeout por request (ms) |
| `HTTP_RETRY_MAX_ATTEMPTS` | `3` | Reintentos máximos |
| `HTTP_RETRY_DELAY_MS` | `500` | Delay inicial entre reintentos |
| `HTTP_RETRY_BACKOFF_MULTIPLIER` | `2` | Multiplicador exponencial |
| `HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | `5` | Fallos para abrir circuito |
| `HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | `30000` | Tiempo en estado abierto (ms) |

Copia el bloque de `example.env` en tu `.env`.

### Uso rápido

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { HTTP_CLIENT, IHttpClient } from '../shared/application';

@Injectable()
export class PaymentGateway {
  constructor(@Inject(HTTP_CLIENT) private readonly http: IHttpClient) {}

  charge(orderId: string, amount: number) {
    return this.http.post<{ transactionId: string }>(
      `${process.env.PAYMENT_API_URL}/charges`,
      { orderId, amount },
      { circuitBreakerKey: 'payment-api' },
    );
  }
}
```

Guía completa con degradación graceful, convenciones de retry e idempotencia, y troubleshooting: **[docs/http-resilience.md](docs/http-resilience.md)**.

## 🧑‍💻 Developing

First we need to download the repository

```bash
git clone https://github.com/DonatoCalvillo/api-nestjs-template.git
```

And install all dependencies

```bash
cd api-nestjs-template && npm install
```

We need to set the environments variables

```bash
cp example.env .env
```

To run the project we have options

### 🔥 Hot reload (development)

We can run the project in development with hot reload and exposing a **debug port**, the `9229`, but first we need to configure the IDE

Now, you should be able to start debugging configuring using your IDE. For example, if you are using vscode, you can create a `.vscode/launch.json` file with the following config:

```json
{
  "version": "0.1.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Rest Api",
      "restart": true,
      "port": 9229
    }
  ]
}
```

Once you configure the IDE we can run 
```bash
npm run start:dev
```

### 🐳 Docker

The project is dockerized so we need to run

- Development

```bash
docker-compose up -d rest-api-dev
```

- Production

```bash
docker-compose up -d rest-api-prd
```

If you want to stop the container, you can stop the service running:

```bash
docker-compose down
```

## ⚙️ Building

To build the api we can run 
```bash
npm run build
```

## 💾 Migrations

To generate a migration
```bash
npm run migration:generate -- ./src/database/migrations/{migration-name}
```

To run migrations
```bash
npm run migration:run
```

To revert migrations
```bash
npm run migration:revert -- ./src/database/migrations/{migration-name}
```

## 📋 Testing

The tests are written in Mocha and the assertions done using Jest

```
"jest": "^29.7.0"
```

We can run the test with the command

```
npm run test
```

Test files are created under test folder.

## 🔦 Linting

To run the linter you can execute:

```bash
npm run lint
```

And for trying to fix lint issues automatically, you can run:

```bash
npm run lint:fix
```
