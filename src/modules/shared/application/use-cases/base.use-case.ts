import { PinoLogger } from 'nestjs-pino';
import { DomainError } from '../../domain/errors/error';
import { UnexpectedError } from '../../domain/errors/unexpected.error';
import { SENSITIVE_LOG_FIELDS } from '../../infrastructure/logging/sensitive-fields.constants';
import { sanitizeForLogging } from '../../infrastructure/logging/sanitize-for-logging.util';
import { IUseCase } from './use-case.interface';
import { UseCaseContext } from './use-case.context';

export abstract class BaseUseCase<TInput, TOutput> implements IUseCase<
  TInput,
  TOutput
> {
  constructor(protected readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(input: TInput, context?: UseCaseContext): Promise<TOutput> {
    const startTime = Date.now();

    try {
      this.logStart(input);
      const result = await this.executeImpl(input, context);
      this.logSuccess(startTime);
      return result;
    } catch (error) {
      this.logError(error, input);
      throw this.handleError(error);
    }
  }

  protected abstract executeImpl(
    input: TInput,
    context?: UseCaseContext,
  ): Promise<TOutput>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async validate(_input: TInput): Promise<void> {}

  protected handleError(error: unknown): Error {
    if (error instanceof DomainError) {
      return error;
    }

    if (error instanceof Error) {
      return new UnexpectedError(error.message);
    }

    return new UnexpectedError();
  }

  protected logStart(input: TInput): void {
    this.logger.info(
      { input: this.sanitizeForLog(input) },
      `Running use case: ${this.constructor.name}`,
    );
  }

  protected logSuccess(startTime: number): void {
    const duration = Date.now() - startTime;
    this.logger.info(
      { durationMs: duration },
      `Finished use case: ${this.constructor.name}`,
    );
  }

  protected logError(error: unknown, input: TInput): void {
    this.logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        input: this.sanitizeForLog(input),
      },
      `${this.constructor.name} failed`,
    );
  }

  protected sanitizeForLog(input: TInput): Partial<TInput> {
    return sanitizeForLogging(input, SENSITIVE_LOG_FIELDS) as Partial<TInput>;
  }
}
