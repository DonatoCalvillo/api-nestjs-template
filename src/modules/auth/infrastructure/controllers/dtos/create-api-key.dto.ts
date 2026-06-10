import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: ['internal:read'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes: string[];

  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  keyPrefix: string;
}
