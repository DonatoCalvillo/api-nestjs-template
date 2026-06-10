import { QueryRunner } from 'typeorm';
import { ActorSnapshot } from './types/actor-snapshot';

export type AuditCaptureContext = {
  useCase: object;
  trx?: QueryRunner;
  actor: ActorSnapshot;
  requestId?: string;
  traceId?: string;
  ipAddress?: string;
};

export type AuditLogOptions<TCommand = unknown, TResult = unknown> = {
  action: string;
  entityType: string;
  entityId?: (command: TCommand) => string | undefined;
  getBeforeState?: (
    command: TCommand,
    context: AuditCaptureContext,
  ) => Promise<unknown>;
  getAfterState?: (
    command: TCommand,
    result: TResult,
    context: AuditCaptureContext,
  ) => Promise<unknown>;
  skipOnFailure?: boolean;
};
