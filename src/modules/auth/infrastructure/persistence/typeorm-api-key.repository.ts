import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import {
  ApiKeyRecord,
  CreateApiKeyParams,
  IApiKeyRepository,
} from '../../application/ports/api-key.repository.port';
import { ApiKeyEntity } from './api-key.entity';

@Injectable()
export class TypeOrmApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly dataSource: DataSource) {}

  static hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private getRepo(trx?: QueryRunner) {
    return trx
      ? trx.manager.getRepository(ApiKeyEntity)
      : this.dataSource.getRepository(ApiKeyEntity);
  }

  async create(
    params: CreateApiKeyParams,
    trx?: QueryRunner,
  ): Promise<ApiKeyRecord> {
    const entity = new ApiKeyEntity();
    entity.name = params.name;
    entity.keyPrefix = params.keyPrefix;
    entity.keyHash = params.keyHash;
    entity.scopes = params.scopes;
    entity.expiresAt = params.expiresAt;
    entity.createdBy = params.createdBy;
    const saved = await this.getRepo(trx).save(entity);
    return this.toRecord(saved);
  }

  async findValidByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const entity = await this.getRepo().findOne({ where: { keyHash } });

    if (
      !entity ||
      entity.revokedAt ||
      (entity.expiresAt && entity.expiresAt <= new Date())
    ) {
      return null;
    }

    return this.toRecord(entity);
  }

  private toRecord(entity: ApiKeyEntity): ApiKeyRecord {
    return {
      id: entity.id,
      name: entity.name,
      keyPrefix: entity.keyPrefix,
      keyHash: entity.keyHash,
      scopes: entity.scopes,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
    };
  }
}
