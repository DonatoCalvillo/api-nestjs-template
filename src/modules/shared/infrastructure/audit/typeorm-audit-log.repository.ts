import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AuditLogEntry } from '../../application/audit/types/audit-log-entry';
import { IAuditLogRepository } from '../../application/audit/ports/audit-log.repository.port';
import { AuditLogEntity } from './audit-log.entity';

@Injectable()
export class TypeOrmAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly dataSource: DataSource) {}

  async save(entry: AuditLogEntry, trx?: QueryRunner): Promise<void> {
    const repository = trx
      ? trx.manager.getRepository(AuditLogEntity)
      : this.dataSource.getRepository(AuditLogEntity);

    await repository.save(repository.create(entry));
  }
}
