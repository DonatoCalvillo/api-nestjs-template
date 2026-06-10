import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OutboxMessageStatus } from '../../application/outbox/outbox-message.status';

@Entity('outbox_messages')
export class OutboxMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'event_name' })
  eventName: string;

  @Column({ type: 'varchar', nullable: true, name: 'aggregate_type' })
  aggregateType: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'aggregate_id' })
  aggregateId: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', default: OutboxMessageStatus.Pending })
  status: OutboxMessageStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'text', nullable: true, name: 'last_error' })
  lastError: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'processed_at' })
  processedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'claimed_at' })
  claimedAt: Date | null;
}
