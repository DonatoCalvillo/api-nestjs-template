import { PinoLogger } from 'nestjs-pino';
import { DomainError } from '../../domain/errors/error';
import { BaseUseCase } from './base.use-case';
import { Result } from './result';

export abstract class QueryUseCase<TQuery, TResult> extends BaseUseCase<
  TQuery,
  Result<TResult>
> {
  constructor(logger: PinoLogger) {
    super(logger);
  }

  protected async executeImpl(query: TQuery): Promise<Result<TResult>> {
    try {
      await this.validate(query);
      const result = await this.executeQuery(query);
      return Result.ok(result);
    } catch (error) {
      if (error instanceof DomainError) {
        return Result.fail(error);
      }

      throw error;
    }
  }

  protected abstract executeQuery(query: TQuery): Promise<TResult>;
}
