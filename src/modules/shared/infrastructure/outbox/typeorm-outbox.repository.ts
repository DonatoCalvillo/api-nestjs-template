import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { OutboxMessageEntry } from '../../application/outbox/outbox-message.entry';
import { OutboxMessageStatus } from '../../application/outbox/outbox-message.status';
import {
  ClaimedOutboxMessage,
  IOutboxRepository,
} from '../../application/outbox/ports/outbox.repository.port';
import { OutboxMessageEntity } from './outbox-message.entity';

@Injectable()
export class TypeOrmOutboxRepository implements IOutboxRepository {
  constructor(private readonly dataSource: DataSource) {}

  async insertMany(
    entries: OutboxMessageEntry[],
    trx?: QueryRunner,
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const repository = trx
      ? trx.manager.getRepository(OutboxMessageEntity)
      : this.dataSource.getRepository(OutboxMessageEntity);

    await repository.save(entries.map((entry) => repository.create(entry)));
  }

  async claimPendingBatch(limit: number): Promise<ClaimedOutboxMessage[]> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rows = await queryRunner.manager
        .createQueryBuilder(OutboxMessageEntity, 'outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('outbox.status = :status', {
          status: OutboxMessageStatus.Pending,
        })
        .orderBy('outbox.createdAt', 'ASC')
        .limit(limit)
        .getMany();

      if (rows.length === 0) {
        await queryRunner.commitTransaction();
        return [];
      }

      const ids = rows.map((row) => row.id);

      await queryRunner.manager
        .createQueryBuilder()
        .update(OutboxMessageEntity)
        .set({ status: OutboxMessageStatus.Processing })
        .whereInIds(ids)
        .execute();

      await queryRunner.commitTransaction();

      return rows.map((row) => ({
        id: row.id,
        eventName: row.eventName,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        payload: row.payload,
        attempts: row.attempts,
      }));
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async markPublished(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.dataSource
      .createQueryBuilder()
      .update(OutboxMessageEntity)
      .set({
        status: OutboxMessageStatus.Published,
        processedAt: () => 'NOW()',
      })
      .whereInIds(ids)
      .execute();
  }

  async markFailed(id: string, error: string, attempts: number): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(OutboxMessageEntity)
      .set({
        status: OutboxMessageStatus.Failed,
        lastError: error,
        attempts,
      })
      .where('id = :id', { id })
      .execute();
  }

  async resetToPending(
    id: string,
    error: string,
    attempts: number,
  ): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(OutboxMessageEntity)
      .set({
        status: OutboxMessageStatus.Pending,
        lastError: error,
        attempts,
      })
      .where('id = :id', { id })
      .execute();
  }
}
