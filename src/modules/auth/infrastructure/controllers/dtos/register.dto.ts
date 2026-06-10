import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ValidationMessages } from '../../../../shared/infrastructure/dtos/validation-messages';

export class RegisterDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1, { message: ValidationMessages.minLength(1) })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: ValidationMessages.email })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8, { message: ValidationMessages.minLength(8) })
  password: string;
}
