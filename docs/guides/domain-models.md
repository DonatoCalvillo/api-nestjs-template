# Domain models

Domain models represent business logic using [`value-object-lib`](https://www.npmjs.com/package/value-object-lib). They are separate from TypeORM persistence entities.

## Prerequisites

- [New feature module](./new-feature-module.md)

## What is included

| Export | Description |
|--------|-------------|
| `IModel` | Contract for domain models |
| `BaseModel` | Abstract base with validated `id` and optional audit fields |
| `AggregateRoot` | `BaseModel` + domain event support |
| `BaseModelParams` | Constructor params: `id`, `props`, `createdAt?`, `updatedAt?`, `version?` |

Location: `src/modules/shared/domain/model/`.

## BaseModel vs AggregateRoot

| Use | When |
|-----|------|
| `BaseModel` | Read-only or simple entities without events |
| `AggregateRoot` | Mutating aggregates that emit domain events |

## Step 1 — Define props with value objects

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

Available value objects: `StringValueObject`, `NonEmptyStringValueObject`, `EmailValueObject`, `UUIDValueObject`, `DateValueObject`, `NumberValueObject`, `PositiveNumberValueObject`, `NonNegativeNumberValueObject`, `BooleanValueObject`, `PhoneNumberValueObject`, `EnumValueObject`.

## Step 2 — Extend BaseModel or AggregateRoot

```typescript
import { BaseModel, BaseModelParams } from '../../../shared/domain/model';

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

Expose domain data through getters, not raw value objects.

## Step 3 — Factory methods (recommended)

```typescript
export class UserModel extends AggregateRoot<UserProps> {
  static create(name: string, email: string): UserModel {
    const user = new UserModel({
      id: randomUUID(),
      props: {
        name: new NonEmptyStringValueObject('name', name),
        email: new EmailValueObject('email', email),
      },
      createdAt: new Date(),
    });
    user.addDomainEvent(new UserCreatedEvent(user.id, email, name));
    return user;
  }
}
```

## Step 4 — Compare and serialize

```typescript
user.equals(otherUser);  // same id = same entity
user.toJSON();           // unwraps value objects in props
```

Use `version: null` (default) for new aggregates not yet persisted.

## Checklist

- [ ] Props use value objects for validation
- [ ] Getters expose primitives, not value objects
- [ ] Factory methods encapsulate creation logic
- [ ] `AggregateRoot` used when emitting events

## Common mistakes

- Using `BaseModel` when you need domain events (use `AggregateRoot`)
- Validating in the controller instead of value objects
- Returning value objects to outer layers

## See also

- [Domain events](./domain-events.md)
- [Features: persistence patterns](../features/data/persistence-patterns.md)
- Reference: `src/modules/users/domain/models/user.model.ts`
