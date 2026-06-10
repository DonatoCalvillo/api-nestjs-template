import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { AuthTokenType } from '../../domain/constants/auth-token.constants';
import {
  AuthTokenRecord,
  IAuthTokenRepository,
} from '../../application/ports/auth-token.repository.port';
import { AuthTokenEntity } from './auth-token.entity';

@Injectable()
export class TypeOrmAuthTokenRepository implements IAuthTokenRepository {
  constructor(private readonly dataSource: DataSource) {}

  private getRepo(trx?: QueryRunner) {
    return trx
      ? trx.manager.getRepository(AuthTokenEntity)
      : this.dataSource.getRepository(AuthTokenEntity);
  }

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async save(
    params: {
      userId: string;
      type: AuthTokenType;
      tokenHash: string;
      expiresAt: Date;
    },
    trx?: QueryRunner,
  ): Promise<void> {
    const entity = new AuthTokenEntity();
    entity.userId = params.userId;
    entity.type = params.type;
    entity.tokenHash = params.tokenHash;
    entity.expiresAt = params.expiresAt;
    await this.getRepo(trx).save(entity);
  }

  async findValidByHash(
    tokenHash: string,
    type: AuthTokenType,
    trx?: QueryRunner,
  ): Promise<AuthTokenRecord | null> {
    const entity = await this.getRepo(trx).findOne({
      where: { tokenHash, type },
    });

    if (!entity || entity.consumedAt || entity.expiresAt <= new Date()) {
      return null;
    }

    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      consumedAt: entity.consumedAt,
    };
  }

  async consume(id: string, trx?: QueryRunner): Promise<void> {
    await this.getRepo(trx).update({ id }, { consumedAt: new Date() });
  }
}
