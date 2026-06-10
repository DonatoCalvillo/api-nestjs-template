import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Controller('healthy')
export class HealthyController {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HealthyController.name);
  }

  @Get()
  public async run(@Req() req: Request, @Res() res: Response) {
    this.logger.info(`Healthy check request coming from: ${req.ip}`);
    res.status(204).send();
  }
}
