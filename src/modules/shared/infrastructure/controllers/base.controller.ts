import { PinoLogger } from 'nestjs-pino';
import { IUseCase, Result } from '../../application';

export abstract class BaseController {
  constructor(protected readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  protected async executeUseCase<TInput, TOutput>(
    useCase: IUseCase<TInput, Result<TOutput>>,
    input: TInput,
  ): Promise<TOutput> {
    const result = await useCase.execute(input);
    return this.handleResult(result);
  }

  protected async executeResult<TInput, TOutput>(
    input: TInput,
    runner: (input: TInput) => Promise<Result<TOutput>>,
  ): Promise<TOutput> {
    const result = await runner(input);
    return this.handleResult(result);
  }

  protected handleResult<TOutput>(result: Result<TOutput>): TOutput {
    if (result.isFailure) {
      this.logDomainFailure(result.error);
      throw result.error!.toHttpException();
    }

    return result.value as TOutput;
  }

  protected logDomainFailure(error: unknown): void {
    this.logger.warn(
      { err: error instanceof Error ? error : new Error(String(error)) },
      `${this.constructor.name} received domain failure`,
    );
  }
}
