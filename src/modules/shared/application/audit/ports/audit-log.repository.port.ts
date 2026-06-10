import { QueryRunner } from 'typeorm';
import { AuditLogEntry } from '../types/audit-log-entry';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface IAuditLogRepository {
  save(entry: AuditLogEntry, trx?: QueryRunner): Promise<void>;
}
