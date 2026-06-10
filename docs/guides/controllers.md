# Controllers

Controllers are thin HTTP adapters. They validate input (via DTOs), call use cases, and map results to response DTOs.

## Prerequisites

- [Use cases](./use-cases.md)
- [DTOs and validation](./dtos-and-validation.md)

## Extend BaseController

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController extends BaseController {
  constructor(
    logger: PinoLogger,
    actorContext: ActorContextService,
    traceContext: TraceContextService,
    private readonly updateUserUseCase: UpdateUserUseCase,
  ) {
    super(logger, actorContext, traceContext);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.executeUseCase(this.updateUserUseCase, {
      id,
      name: dto.name,
      email: dto.email,
      version: dto.version,
      actor,
    });
    return toUserResponseDto(user);
  }
}
```

`BaseController` (`src/modules/shared/infrastructure/controllers/base.controller.ts`):

| Method | Purpose |
|--------|---------|
| `executeUseCase(useCase, input)` | Run use case, unwrap `Result`, throw on failure |
| `executeResult(input, runner)` | Ad-hoc `Result` runner |
| `handleResult(result)` | Manual `Result` handling |

## Auth decorators

| Decorator | Purpose |
|-----------|---------|
| `@Public()` | Skip JWT validation |
| `@Roles('admin')` | Require role (any match) |
| `@Permissions('users:read')` | Require permission (all match) |
| `@CurrentUser()` | Inject authenticated user from JWT |
| `@ApiKeyAuth()` | Service-to-service API key auth |

Global guards in `AppModule`: `JwtAuthGuard` → `RolesGuard` → `PermissionsGuard`.

## Route prefix

All business routes are under `/api/v1` (global prefix). Controller `@Controller('users')` → `/api/v1/users`.

## Error handling

Do not catch domain errors in controllers. `executeUseCase` logs and throws `toHttpException()`.

## Checklist

- [ ] Extends `BaseController` with `super(logger, actorContext, traceContext)`
- [ ] Uses `executeUseCase` for use case calls
- [ ] Maps domain models to response DTOs (not raw models)
- [ ] Auth decorators applied per route
- [ ] `ParseUUIDPipe` or validation on path params

## Common mistakes

- Business logic in controller methods
- Returning domain models directly (breaks envelope typing in Swagger)
- Forgetting `@ApiBearerAuth` on protected routes

## See also

- [Swagger documentation](./swagger-documentation.md)
- [RBAC on endpoints](./rbac-on-endpoints.md)
- [Features: auth](../features/auth.md)
