# DTOs and validation

Request DTOs validate inbound data. Response DTOs shape outbound data. They live in `infrastructure/controllers/dtos/`.

## Prerequisites

- [Controllers](./controllers.md)

## Global ValidationPipe

Configured in `src/bootstrap/configure-app.ts`:

- `whitelist: true` — strips unknown properties
- `forbidNonWhitelisted: true` — rejects unknown properties
- `transform: true` — converts types (e.g. query string → number)
- Custom `exceptionFactory` → structured validation errors

Validation error shape: see [API contract](../features/api-contract.md).

## Request DTOs

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ValidationMessages } from '../../../../shared/infrastructure/dtos/validation-messages';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: ValidationMessages.minLength(1) })
  name?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: ValidationMessages.email })
  email?: string;

  @ApiProperty({ example: 1, description: 'From GET /users/me' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: ValidationMessages.min(1) })
  version: number;
}
```

Use `ValidationMessages` for consistent error text.

## Response DTOs

Separate from request DTOs. Include mapper functions:

```typescript
export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  version: number;
}

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    version: user.version ?? 1,
  };
}
```

Controllers return response DTOs; `TransformResponseInterceptor` wraps them in `ResponseDto`.

## Pagination

Query: `PaginationQueryDto` (`page`, `perPage`).

Response: `toPaginatedResponse(items, total, page, perPage)`.

```typescript
@Get()
async list(@Query() query: PaginationQueryDto) {
  const { items, total } = await this.executeUseCase(this.listUsersUseCase, {
    page: query.page ?? 1,
    perPage: query.perPage ?? 20,
  });
  return toPaginatedResponse(items.map(toUserResponseDto), total, page, perPage);
}
```

## Checklist

- [ ] Request DTOs use `class-validator` decorators
- [ ] `@Type()` used for number/boolean query params
- [ ] Response DTOs have `@ApiProperty` for Swagger
- [ ] Mapper functions keep controllers thin

## Common mistakes

- Mixing request and response shapes in one DTO
- Missing `@Type(() => Number)` on query params (strings stay as strings)
- Duplicating validation that value objects already enforce in domain

## See also

- [Swagger documentation](./swagger-documentation.md)
- [Features: API contract](../features/api-contract.md)
