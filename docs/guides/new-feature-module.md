# New feature module

End-to-end checklist for adding a new feature module. Use `src/modules/users/` as the reference implementation.

## Prerequisites

- [Architecture](../features/architecture.md) — Understand hexagonal layers

## Folder structure

```
src/modules/{feature}/
├── {feature}.module.ts
├── application/
│   ├── ports/
│   │   └── {entity}.repository.port.ts
│   └── use-cases/
│       └── {verb}-{entity}.use-case.ts
├── domain/
│   ├── models/
│   │   └── {entity}.model.ts
│   ├── events/          # optional
│   └── errors/          # optional
└── infrastructure/
    ├── controllers/
    │   ├── {feature}.controller.ts
    │   └── dtos/
    ├── persistence/
    │   ├── {entity}.entity.ts
    │   └── typeorm-{entity}.repository.ts
    ├── mappers/
    │   └── {entity}.mapper.ts
    └── events/          # optional handlers
```

## Steps

### 1. Create the domain model

See [domain-models.md](./domain-models.md). Place under `domain/models/`.

### 2. Create the TypeORM entity

See [entities-and-migrations.md](./entities-and-migrations.md). Extend `BaseEntity`.

### 3. Register the entity

Add to `src/database/entities.ts`:

```typescript
import { MyEntity } from '../modules/my-feature/infrastructure/persistence/my.entity';

export const entities = [
  // ...existing
  MyEntity,
];
```

### 4. Implement mapper and repository

See [repositories-and-mappers.md](./repositories-and-mappers.md).

### 5. Define the repository port

```typescript
// application/ports/my.repository.port.ts
import { IRepository } from '../../../shared/domain/repositories';
import { MyModel } from '../../domain/models/my.model';

export const MY_REPOSITORY = Symbol('MY_REPOSITORY');

export interface IMyRepository extends IRepository<MyModel> {
  // custom queries
}
```

### 6. Create use cases

See [use-cases.md](./use-cases.md).

### 7. Create DTOs and controller

See [dtos-and-validation.md](./dtos-and-validation.md) and [controllers.md](./controllers.md).

### 8. Wire the module

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([MyEntity])],
  controllers: [MyController],
  providers: [
    MyMapper,
    TypeOrmMyRepository,
    { provide: MY_REPOSITORY, useExisting: TypeOrmMyRepository },
    CreateMyUseCase,
    ListMyUseCase,
    MyEventHandler,  // if any
  ],
  exports: [MY_REPOSITORY],  // if other modules need the port
})
export class MyModule {}
```

### 9. Import in AppModule

```typescript
// src/app.module.ts
imports: [
  // ...
  MyModule,
],
```

### 10. Generate and run migration

```bash
pnpm migration:generate src/database/migrations/MyFeature
pnpm migration:run
```

### 11. Add Swagger tag (optional)

```typescript
// src/configuration/swagger.ts
.addTag('my-feature', 'My feature endpoints')
```

### 12. Add RBAC permissions (if protected)

See [rbac-on-endpoints.md](./rbac-on-endpoints.md).

## Checklist

- [ ] Domain model with value objects
- [ ] Entity extends `BaseEntity`, registered in `entities.ts`
- [ ] Mapper implements `IMapper`
- [ ] Repository port + `TypeOrmBaseRepository` implementation
- [ ] Use cases extend `CommandUseCase` or `QueryUseCase`
- [ ] Controller extends `BaseController`
- [ ] Module registered in `AppModule`
- [ ] Migration generated and run
- [ ] Tests added (see [testing.md](./testing.md))

## Common mistakes

- Forgetting to register entity in `entities.ts` before `migration:generate`
- Injecting `TypeOrmMyRepository` directly instead of `MY_REPOSITORY` port in use cases
- Putting business logic in the controller instead of use cases
- Importing infrastructure from domain layer

## See also

- [Reference users module](./reference-users-module.md)
- [Features: architecture](../features/architecture.md)
