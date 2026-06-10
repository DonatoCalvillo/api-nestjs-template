import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { ValidationMessages } from '../../../../shared/infrastructure/dtos/validation-messages';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: ValidationMessages.minLength(1) })
  refreshToken: string;
}
