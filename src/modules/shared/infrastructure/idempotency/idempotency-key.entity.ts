import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { IdempotencyKeyStatus } from '../../application/idempotency/idempotency-key.status';

@Entity('idempotency_keys')
@Unique('uq_idempotency_scope_key', ['scope', 'idempotencyKey'])
export class IdempotencyKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  scope: string;

  @Column({ type: 'varchar', name: 'idempotency_key' })
  idempotencyKey: string;

  @Column({ type: 'varchar', name: 'request_method' })
  requestMethod: string;

  @Column({ type: 'varchar', name: 'request_path' })
  requestPath: string;

  @Column({ type: 'varchar', length: 64, name: 'request_hash' })
  requestHash: string;

  @Column({ type: 'int', nullable: true, name: 'response_status' })
  responseStatus: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'response_body' })
  responseBody: unknown;

  @Column({ type: 'varchar', default: IdempotencyKeyStatus.InProgress })
  status: IdempotencyKeyStatus;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
