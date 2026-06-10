import { ApiProperty } from '@nestjs/swagger';

export class HealthSummaryResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 'nestjs-api-template' })
  service: string;
}
