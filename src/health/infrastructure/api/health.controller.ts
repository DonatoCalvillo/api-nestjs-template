import { Controller, Get, Logger } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get('/')
  run() {
    this.logger.log('Health check');
    return 'OK';
  }
}
