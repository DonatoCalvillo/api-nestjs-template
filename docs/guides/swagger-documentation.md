# Swagger documentation

OpenAPI docs are available at `GET /api/docs` when `SWAGGER_ENABLED=true`.

## Prerequisites

- [DTOs and validation](./dtos-and-validation.md)

## Global setup

`src/configuration/swagger.ts` configures:

- Title from `APP_NAME`
- Bearer auth scheme `access-token`
- Global API prefix `/api/v1`

Applied in `src/bootstrap/configure-app.ts`.

## Controller decorators

```typescript
@ApiTags('users')
@ApiExtraModels(UserResponseDto, ResponseMetaDto)
@Controller('users')
export class UsersController extends BaseController {
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOkResponseEnvelope(UserResponseDto, 'Current user profile')
  @ApiStandardErrorResponses()
  async getMe() { /* ... */ }

  @Get()
  @ApiPaginatedResponseEnvelope(UserResponseDto, 'Paginated user list')
  @ApiStandardErrorResponses()
  async list() { /* ... */ }
}
```

### Envelope helpers

From `src/modules/shared/infrastructure/response/api-response.swagger.ts`:

| Decorator | Purpose |
|-----------|---------|
| `ApiOkResponseEnvelope(Dto, description?)` | Single-item success in `ResponseDto` envelope |
| `ApiPaginatedResponseEnvelope(Dto, description?)` | Paginated success |
| `ApiStandardErrorResponses()` | Common 400/401/403/404/409/500 schemas |

Always include `@ApiExtraModels(ResponseMetaDto, YourResponseDto)`.

## DTO properties

```typescript
@ApiProperty({ example: 'user@example.com' })
@IsEmail()
email: string;

@ApiPropertyOptional({ example: 'Jane' })
@IsOptional()
name?: string;
```

## Contract tests

Snapshot test prevents accidental OpenAPI breaking changes:

```bash
pnpm test:contract
```

Source: `test/contract/openapi.contract-spec.ts`.

## Checklist

- [ ] `@ApiTags` on controller
- [ ] `@ApiBearerAuth` on protected routes
- [ ] `@ApiExtraModels` lists all referenced DTOs
- [ ] Envelope decorators on every endpoint
- [ ] Contract test passes after changes

## Common mistakes

- Documenting raw DTO without envelope wrapper (misleading schema)
- Forgetting to add new DTOs to `@ApiExtraModels`
- Enabling Swagger in production without intent (`SWAGGER_ENABLED`)

## See also

- [Features: API contract](../features/api-contract.md)
- [Controllers](./controllers.md)
