import { Controller, Get, Logger, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('healthy')
export class HealthyController {
  private readonly logger: Logger = new Logger(HealthyController.name);

  @Get()
  public async run(@Req() req: Request, @Res() res: Response) {
    this.logger.log(`Healthy check request coming from: ${req.ip}`);
    res.status(204).send();
  }
}
