# Testing

The template uses Jest with four projects: unit, integration, e2e, and contract.

## Test projects

| Project | Command | Location | Purpose |
|---------|---------|----------|---------|
| Unit | `pnpm test` | `test/*.test.ts` | Use cases, mappers, utilities in isolation |
| Integration | `pnpm test:integration` | `test/integration/**/*.integration-spec.ts` | DB + repository or HTTP with Testcontainers |
| E2E | `pnpm test:e2e` | `test/e2e/**/*.e2e-spec.ts` | Full app bootstrap, middleware, guards |
| Contract | `pnpm test:contract` | `test/contract/` | OpenAPI snapshot |
| All | `pnpm test:all` | — | All projects sequentially |

Coverage gate (`pnpm test:cov`): **80%** minimum for `shared/`, `auth/`, and `users/` modules.

## Unit tests

Instantiate use cases directly with mocked ports:

```typescript
import { createMockUserRepository } from '../helpers/mock-user-repository';

describe('LoginUseCase', () => {
  const userRepository = createMockUserRepository();
  const useCase = new LoginUseCase(logger, userRepository, tokenService);

  it('returns tokens on valid credentials', async () => {
    userRepository.findByEmail.mockResolvedValue(mockUser);
    const result = await useCase.execute({ email: 'a@b.com', password: 'secret' });
    expect(result.isSuccess).toBe(true);
  });
});
```

Helpers: `test/helpers/mock-user-repository.ts`.

Other unit examples:

- `test/user.mapper.test.ts` — Mapper round-trip
- `test/base.controller.test.ts` — Result handling
- `test/http-exception.filter.test.ts` — Error envelope

## Integration tests

Testcontainers Postgres + real TypeORM:

```typescript
// test/integration/users/users-crud.integration-spec.ts
const app = await createTestApp();
const response = await request(app.getHttpServer())
  .patch(`/api/v1/users/${userId}`)
  .set('Authorization', `Bearer ${token}`)
  .send({ name: 'Updated', version: 1 });
expect(response.status).toBe(200);
```

Helpers:

- `test/helpers/postgres-container.ts`
- `test/helpers/create-test-app.ts`
- `test/helpers/run-migrations.ts`
- `test/helpers/seed-roles.ts`

Repository-only tests load a single module:

```typescript
// test/integration/repositories/user.repository.integration-spec.ts
```

## E2E tests

Full application with validation, throttling, health:

```typescript
// test/e2e/validation.e2e-spec.ts
```

Environment: `test/setup-e2e-env.ts`, `test/setup-env.ts`.

## Contract tests

Prevents accidental OpenAPI breaking changes:

```bash
pnpm test:contract
```

Updates snapshot when intentional:

```bash
pnpm test:contract -- -u
```

## Load tests

k6 scenarios in `load/scenarios/`. See `load/README.md`.

```bash
pnpm test:load
```

## Checklist for new features

- [ ] Unit test for each use case (happy path + main failures)
- [ ] Mapper test if non-trivial conversion
- [ ] Integration test for repository custom queries
- [ ] Integration or e2e test for new HTTP endpoints
- [ ] Update OpenAPI contract if endpoints added

## Common mistakes

- Mocking TypeORM in integration tests (use Testcontainers instead)
- Not running `pnpm build` before integration/e2e (required by scripts)
- Sharing mutable state between tests

## See also

- [New feature module](./new-feature-module.md)
- [Swagger documentation](./swagger-documentation.md)
