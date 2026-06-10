import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QueryRunner } from 'typeorm';
import { ActorContextService } from '../../infrastructure/audit/actor-context.service';
import {
  BUSINESS_METRICS,
  IBusinessMetrics,
} from '../../infrastructure/metrics/business-metrics.port';
import { TraceContextService } from '../../infrastructure/tracing/trace-context.service';
import type { CommandUseCase } from '../use-cases/command.use-case';
import { UseCaseContext } from '../use-cases/use-case.context';
import { AUDIT_LOG_KEY } from './audit-log.constants';
import { AuditCaptureContext, AuditLogOptions } from './audit-log.options';
import {
  AUDIT_LOG_REPOSITORY,
  IAuditLogRepository,
} from './ports/audit-log.repository.port';
import { computeAuditDiff, toAuditRecord } from './utils/audit-diff.util';
import { sanitizeAuditState } from './utils/audit-sanitize.util';

@Injectable()
export class AuditLogService {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly actorContext: ActorContextService,
    private readonly traceContext: TraceContextService,
    @Inject(BUSINESS_METRICS)
    private readonly businessMetrics: IBusinessMetrics,
  ) {}

  getOptions(useCase: object): AuditLogOptions<unknown, unknown> | undefined {
    return this.reflector.get<AuditLogOptions<unknown, unknown>>(
      AUDIT_LOG_KEY,
      useCase.constructor,
    );
  }

  hasAuditLog(useCase: object): boolean {
    return this.getOptions(useCase) != null;
  }

  async wrap<TCommand, TResult>(
    useCase: CommandUseCase<TCommand, TResult>,
    command: TCommand,
    context: UseCaseContext | undefined,
    execute: () => Promise<TResult>,
  ): Promise<TResult> {
    const options = this.getOptions(useCase);

    if (!options) {
      return execute();
    }

    const captureContext = this.buildCaptureContext(useCase, context?.trx);

    let beforeState: unknown = null;

    if (options.getBeforeState) {
      beforeState = await options.getBeforeState(command, captureContext);
    }

    const result = await execute();

    const afterState = options.getAfterState
      ? await options.getAfterState(command, result, captureContext)
      : result;

    const sanitizedBefore = sanitizeAuditState(beforeState);
    const sanitizedAfter = sanitizeAuditState(afterState);

    try {
      await this.auditLogRepository.save(
        {
          actorId: captureContext.actor.actorId,
          actorType: captureContext.actor.actorType,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId?.(command) ?? null,
          beforeState: toAuditRecord(sanitizedBefore),
          afterState: toAuditRecord(sanitizedAfter),
          changes: computeAuditDiff(sanitizedBefore, sanitizedAfter),
          requestId: captureContext.requestId ?? null,
          traceId: captureContext.traceId ?? null,
          ipAddress: captureContext.ipAddress ?? null,
          useCaseName: useCase.constructor.name,
        },
        context?.trx,
      );

      this.businessMetrics.recordAuditWrite(
        options.action,
        options.entityType,
        captureContext.actor.actorType,
      );
    } catch (error) {
      this.businessMetrics.recordAuditWriteError();
      throw error;
    }

    return result;
  }

  private buildCaptureContext(
    useCase: object,
    trx?: QueryRunner,
  ): AuditCaptureContext {
    return {
      useCase,
      trx,
      actor: this.actorContext.getActor(),
      requestId: this.actorContext.getRequestId(),
      traceId: this.traceContext.getTraceId(),
      ipAddress: this.actorContext.getIpAddress(),
    };
  }
}
