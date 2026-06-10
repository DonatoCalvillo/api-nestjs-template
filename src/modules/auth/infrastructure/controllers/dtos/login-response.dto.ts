import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MfaRequiredResponseDto {
  @ApiProperty({ example: true })
  mfaRequired: boolean;

  @ApiProperty()
  mfaToken: string;
}

export class MfaSetupResponseDto {
  @ApiProperty()
  otpauthUri: string;

  @ApiProperty()
  qrCodeDataUrl: string;
}

export class LoginResponseDto {
  @ApiPropertyOptional()
  accessToken?: string;

  @ApiPropertyOptional()
  refreshToken?: string;

  @ApiPropertyOptional()
  expiresIn?: string;

  @ApiPropertyOptional()
  mfaRequired?: boolean;

  @ApiPropertyOptional()
  mfaToken?: string;
}
