import { Injectable } from '@nestjs/common';
import { DataSource, LessThan, QueryFailedError } from 'typeorm';
import { IdempotencyKeyStatus } from '../../application/idempotency/idempotency-key.status';
import {
  IdempotencyClaimInput,
  IdempotencyClaimResult,
  IdempotencyCompleteInput,
  IdempotencyRecord,
  IIdempotencyRepository,
} from '../../application/idempotency/ports/idempotency.repository.port';
import { IdempotencyKeyEntity } from './idempotency-key.entity';

@Injectable()
export class TypeOrmIdempotencyRepository implements IIdempotencyRepository {
  constructor(private readonly dataSource: DataSource) {}

  async claim(input: IdempotencyClaimInput): Promise<IdempotencyClaimResult> {
    const repository = this.dataSource.getRepository(IdempotencyKeyEntity);

    await repository.delete({
      scope: input.scope,
      idempotencyKey: input.idempotencyKey,
      expiresAt: LessThan(new Date()),
    });

    try {
      await repository.save(
        repository.create({
          scope: input.scope,
          idempotencyKey: input.idempotencyKey,
          requestMethod: input.requestMethod,
          requestPath: input.requestPath,
          requestHash: input.requestHash,
          status: IdempotencyKeyStatus.InProgress,
          expiresAt: input.expiresAt,
        }),
      );

      return { type: 'claimed' };
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }
    }

    const existing = await this.findByScopeAndKey(
      input.scope,
      input.idempotencyKey,
    );

    if (!existing) {
      return this.claim(input);
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await repository.delete({ id: existing.id });
      return this.claim(input);
    }

    if (existing.status === IdempotencyKeyStatus.Completed) {
      if (existing.requestHash !== input.requestHash) {
        return { type: 'hash_mismatch' };
      }

      return { type: 'replay', record: existing };
    }

    return { type: 'in_progress' };
  }

  async complete(input: IdempotencyCompleteInput): Promise<void> {
    const repository = this.dataSource.getRepository(IdempotencyKeyEntity);

    await repository.update(
      {
        scope: input.scope,
        idempotencyKey: input.idempotencyKey,
        status: IdempotencyKeyStatus.InProgress,
      },
      {
        status: IdempotencyKeyStatus.Completed,
        responseStatus: input.responseStatus,
        responseBody: input.responseBody,
      },
    );
  }

  async deleteInProgress(scope: string, idempotencyKey: string): Promise<void> {
    const repository = this.dataSource.getRepository(IdempotencyKeyEntity);

    await repository.delete({
      scope,
      idempotencyKey,
      status: IdempotencyKeyStatus.InProgress,
    });
  }

  async deleteExpired(): Promise<number> {
    const repository = this.dataSource.getRepository(IdempotencyKeyEntity);
    const result = await repository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  private async findByScopeAndKey(
    scope: string,
    idempotencyKey: string,
  ): Promise<IdempotencyRecord | null> {
    const repository = this.dataSource.getRepository(IdempotencyKeyEntity);
    const row = await repository.findOne({
      where: { scope, idempotencyKey },
    });

    if (!row) {
      return null;
    }

    return this.toRecord(row);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string } | undefined)?.code === '23505'
    );
  }

  private toRecord(row: IdempotencyKeyEntity): IdempotencyRecord {
    return {
      id: row.id,
      scope: row.scope,
      idempotencyKey: row.idempotencyKey,
      requestMethod: row.requestMethod,
      requestPath: row.requestPath,
      requestHash: row.requestHash,
      responseStatus: row.responseStatus,
      responseBody: row.responseBody,
      status: row.status,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }
}
