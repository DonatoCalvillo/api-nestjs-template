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

## 🧱 Domain Models

Domain models represent entities with identity (unlike value objects, which are compared by value). The template provides a base abstraction in `src/modules/shared/domain/model/` built on top of [`value-object-lib`](https://www.npmjs.com/package/value-object-lib).

### What is included

| Export | Description |
|--------|-------------|
| `IModel` | Contract for domain models (`id`, timestamps, `equals`, `toJSON`) |
| `BaseModel` | Abstract base class with validated `id` and optional audit fields |
| `BaseModelParams` | Constructor params: `id`, `props`, `createdAt?`, `updatedAt?` |
| `toPrimitives` | Utility to serialize nested value objects to plain values |

`BaseModel` validates the `id` as a UUID and optional dates via `UUIDValueObject` and `DateValueObject`. Invalid values throw a `ValueObjectValidationError` at construction time.

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

const user = new UserModel({
  id: randomUUID(),
  props: {
    name: new NonEmptyStringValueObject('name', 'Edgar'),
    email: new EmailValueObject('email', 'edgar@example.com'),
  },
  createdAt: new Date(),
  updatedAt: null,
});
```

`createdAt` and `updatedAt` are optional and default to `null`. When provided, they are validated as dates; when `null`, no `DateValueObject` is created.

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
cp .env.example .env
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
