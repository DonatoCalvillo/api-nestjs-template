import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { DomainError } from '../../domain/errors/error';
import { ITransactionManager } from '../ports/transaction-manager.port';
import { BaseUseCase } from './base.use-case';
import { Result } from './result';
import { UseCaseContext } from './use-case.context';

export abstract class CommandUseCase<TCommand, TResult> extends BaseUseCase<
  TCommand,
  Result<TResult>
> {
  constructor(
    logger: PinoLogger,
    protected readonly transactionManager?: ITransactionManager,
  ) {
    super(logger);
  }

  async execute(command: TCommand): Promise<Result<TResult>> {
    if (this.transactionManager && this.requiresTransaction()) {
      return this.transactionManager.run((trx) =>
        super.execute(command, { trx }),
      );
    }

    return super.execute(command);
  }

  protected requiresTransaction(): boolean {
    return true;
  }

  protected async executeImpl(
    command: TCommand,
    context?: UseCaseContext,
  ): Promise<Result<TResult>> {
    try {
      await this.validate(command);
      const result = await this.executeCommand(command, context?.trx);
      return Result.ok(result);
    } catch (error) {
      if (error instanceof DomainError) {
        return Result.fail(error);
      }

      throw error;
    }
  }

  protected abstract executeCommand(
    command: TCommand,
    trx?: QueryRunner,
  ): Promise<TResult>;
}
