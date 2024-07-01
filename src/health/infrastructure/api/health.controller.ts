import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get('/')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Health check OK' })
  run() {}
}
