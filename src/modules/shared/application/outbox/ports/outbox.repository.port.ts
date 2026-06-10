import { QueryRunner } from 'typeorm';
import { OutboxMessageEntry } from '../outbox-message.entry';
import { OutboxMessageStatus } from '../outbox-message.status';

export type ClaimedOutboxMessage = {
  id: string;
  eventName: string;
  aggregateType: string | null;
  aggregateId: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

export interface IOutboxRepository {
  insertMany(entries: OutboxMessageEntry[], trx?: QueryRunner): Promise<void>;
  claimPendingBatch(limit: number): Promise<ClaimedOutboxMessage[]>;
  markPublished(ids: string[]): Promise<void>;
  markFailed(id: string, error: string, attempts: number): Promise<void>;
  resetToPending(id: string, error: string, attempts: number): Promise<void>;
  countByStatus(status: OutboxMessageStatus): Promise<number>;
}
