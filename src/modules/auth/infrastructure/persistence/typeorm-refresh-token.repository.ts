import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, MoreThan, QueryRunner } from 'typeorm';
import {
  IRefreshTokenRepository,
  StoredRefreshToken,
} from '../../application/ports/refresh-token.repository.port';
import { RefreshTokenEntity } from './refresh-token.entity';

@Injectable()
export class TypeOrmRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly dataSource: DataSource) {}

  private getRepo(trx?: QueryRunner) {
    return trx
      ? trx.manager.getRepository(RefreshTokenEntity)
      : this.dataSource.getRepository(RefreshTokenEntity);
  }

  private toStored(entity: RefreshTokenEntity): StoredRefreshToken {
    return {
      id: entity.id,
      userId: entity.userId,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
    };
  }

  async save(
    params: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    trx?: QueryRunner,
  ): Promise<StoredRefreshToken> {
    const entity = new RefreshTokenEntity();
    entity.userId = params.userId;
    entity.tokenHash = params.tokenHash;
    entity.expiresAt = params.expiresAt;
    entity.revokedAt = null;

    const saved = await this.getRepo(trx).save(entity);
    return this.toStored(saved);
  }

  async findValidByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    const entity = await this.getRepo().findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    return entity ? this.toStored(entity) : null;
  }

  async findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    const entity = await this.getRepo().findOne({
      where: { tokenHash },
    });

    return entity ? this.toStored(entity) : null;
  }

  async consumeValidByHash(
    tokenHash: string,
    trx?: QueryRunner,
  ): Promise<StoredRefreshToken | null> {
    const manager = trx ? trx.manager : this.dataSource.manager;
    const rows: RefreshTokenEntity[] = await manager.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
       RETURNING *`,
      [tokenHash],
    );

    const entity = rows[0];
    return entity ? this.toStored(entity) : null;
  }

  async revoke(id: string, trx?: QueryRunner): Promise<void> {
    await this.getRepo(trx).update(id, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string, trx?: QueryRunner): Promise<void> {
    await this.getRepo(trx).update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
