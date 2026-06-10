import { Inject, Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { DomainError } from '../../domain/errors/error';
import { AUDIT_LOG_SERVICE } from '../audit/audit-log.constants';
import { AuditLogService } from '../audit/audit-log.service';
import {
  DOMAIN_EVENT_DISPATCHER,
  DomainEventStagingService,
  IDomainEventDispatcher,
} from '../events';
import { ITransactionManager } from '../ports/transaction-manager.port';
import { BaseUseCase } from './base.use-case';
import { Result } from './result';
import { UseCaseContext } from './use-case.context';

export abstract class CommandUseCase<TCommand, TResult> extends BaseUseCase<
  TCommand,
  Result<TResult>
> {
  @Optional()
  @Inject(AUDIT_LOG_SERVICE)
  protected auditLogService?: AuditLogService;

  @Optional()
  protected domainEventStaging?: DomainEventStagingService;

  @Optional()
  @Inject(DOMAIN_EVENT_DISPATCHER)
  protected domainEventDispatcher?: IDomainEventDispatcher;

  constructor(
    logger: PinoLogger,
    protected readonly transactionManager?: ITransactionManager,
  ) {
    super(logger);
  }

  async execute(command: TCommand): Promise<Result<TResult>> {
    if (this.transactionManager && this.requiresTransaction()) {
      const result = await this.transactionManager.run((trx) =>
        super.execute(command, { trx }),
      );
      this.flushDomainEvents();
      return result;
    }

    const result = await super.execute(command);
    this.flushDomainEvents();
    return result;
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

      const runCommand = () => this.executeCommand(command, context?.trx);

      const result =
        this.auditLogService?.hasAuditLog(this) === true
          ? await this.auditLogService.wrap(this, command, context, runCommand)
          : await runCommand();

      this.domainEventStaging?.stageFrom(result);

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

  private flushDomainEvents(): void {
    const events = this.domainEventStaging?.drain() ?? [];

    if (events.length === 0 || !this.domainEventDispatcher) {
      return;
    }

    void this.domainEventDispatcher.dispatch(events).catch((error) => {
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          eventCount: events.length,
        },
        'Failed to dispatch domain events',
      );
    });
  }
}
