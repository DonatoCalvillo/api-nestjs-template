import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
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

  @ApiProperty({
    example: 1,
    description: 'Optimistic-lock version from GET /users/me',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: ValidationMessages.min(1) })
  version: number;
}
