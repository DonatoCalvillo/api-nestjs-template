# Repositories and mappers

Mappers translate between domain models and TypeORM entities. Repositories use mappers internally and expose domain models to use cases.

## Prerequisites

- [Entities and migrations](./entities-and-migrations.md)

## Step 1 — Implement IMapper

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

- **`toModel`:** reading from DB — rebuild value objects for validation.
- **`toPersistence`:** writing to DB — use model getters, not raw value objects.

## Step 2 — Extend TypeOrmBaseRepository

```typescript
@Injectable()
export class TypeOrmUserRepository
  extends TypeOrmBaseRepository<UserModel, UserEntity>
  implements IUserRepository
{
  constructor(mapper: UserMapper, dataSource: DataSource) {
    super(mapper, dataSource, TypeOrmUserRepository.name);
  }

  protected entityClass() {
    return UserEntity;
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.findOne({ where: { email } });
  }
}
```

Inherited methods: `findById`, `findOne`, `findMany`, `save`, `delete`, `softDelete`.

## Step 3 — Define and bind the port

```typescript
// application/ports/user.repository.port.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface IUserRepository extends IRepository<UserModel> {
  findByEmail(email: string): Promise<UserModel | null>;
}

// users.module.ts
providers: [
  UserMapper,
  TypeOrmUserRepository,
  { provide: USER_REPOSITORY, useExisting: TypeOrmUserRepository },
],
exports: [USER_REPOSITORY],
```

## Step 4 — Inject port in use cases

```typescript
constructor(
  @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
) {}
```

Never inject `TypeOrmUserRepository` directly in application layer.

## Pagination

```typescript
const { items, total } = await this.userRepository.findMany({
  where: { active: true },
  order: { createdAt: 'DESC' },
  page: 1,
  perPage: 20,
});
```

## Optimistic locking

Load entity with `version`, modify model keeping `version`, call `save`. On conflict → `ConcurrencyConflictError` (409). See [persistence patterns](../features/data/persistence-patterns.md).

## Checklist

- [ ] Mapper registered in module `providers` and `exports` if needed
- [ ] Repository extends `TypeOrmBaseRepository`
- [ ] Port Symbol + `useExisting` binding
- [ ] Use cases inject port, not concrete repository

## Common mistakes

- Skipping value object reconstruction in `toModel`
- Binding `useClass` instead of `useExisting` (creates two instances)
- Not passing `trx` QueryRunner in transactional commands

## See also

- [Use cases](./use-cases.md)
- Reference: `src/modules/users/infrastructure/persistence/typeorm-user.repository.ts`
