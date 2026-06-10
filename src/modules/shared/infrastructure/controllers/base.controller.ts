import { PinoLogger } from 'nestjs-pino';
import { IUseCase, Result } from '../../application';
import { DomainError } from '../../domain/errors/error';
import { ActorContextService } from '../audit/actor-context.service';
import { TraceContextService } from '../tracing/trace-context.service';

export abstract class BaseController {
  constructor(
    protected readonly logger: PinoLogger,
    protected readonly actorContext: ActorContextService,
    protected readonly traceContext: TraceContextService,
  ) {
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
    const err = error instanceof Error ? error : new Error(String(error));

    this.logger.warn(
      {
        event: 'domain_failure',
        err,
        errorCode: error instanceof DomainError ? error.code : undefined,
        httpStatus: error instanceof DomainError ? error.httpStatus : undefined,
        requestId: this.actorContext.getRequestId(),
        traceId: this.traceContext.getTraceId(),
        spanId: this.traceContext.getSpanId(),
      },
      `${this.constructor.name} received domain failure`,
    );
  }
}
