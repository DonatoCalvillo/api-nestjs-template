import { Column, Entity } from 'typeorm';
import { AuditChange } from '../../application/audit/types/audit-log-entry';
import { BaseEntity } from '../persistence';

@Entity('audit_logs')
export class AuditLogEntity extends BaseEntity {
  @Column({ type: 'varchar', nullable: true, name: 'actor_id' })
  actorId: string | null;

  @Column({ type: 'varchar', name: 'actor_type' })
  actorType: string;

  @Column({ type: 'varchar', name: 'action' })
  action: string;

  @Column({ type: 'varchar', name: 'entity_type' })
  entityType: string;

  @Column({ type: 'varchar', nullable: true, name: 'entity_id' })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'before_state' })
  beforeState: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'after_state' })
  afterState: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  changes: AuditChange | null;

  @Column({ type: 'varchar', nullable: true, name: 'request_id' })
  requestId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'trace_id' })
  traceId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'varchar', name: 'use_case_name' })
  useCaseName: string;
}
