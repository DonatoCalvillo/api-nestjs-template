/**
 * For update DTOs with Swagger decorators, prefer PartialType from @nestjs/swagger
 * (extends @nestjs/mapped-types and copies @ApiProperty to @ApiPropertyOptional).
 *
 * @example
 * import { PartialType } from '@nestjs/swagger';
 * export class UpdateUserDto extends PartialType(CreateUserDto) {}
 */
export { PartialType } from '@nestjs/mapped-types';
