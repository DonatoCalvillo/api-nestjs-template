import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { QueryUseCase } from '../../../../shared/application/use-cases';
import { CheckHealthQuery } from './check-health.query';

@Injectable()
export class CheckHealthQueryUseCase extends QueryUseCase<
  CheckHealthQuery,
  void
> {
  constructor(logger: PinoLogger) {
    super(logger);
  }

  protected async executeQuery(): Promise<void> {}
}
