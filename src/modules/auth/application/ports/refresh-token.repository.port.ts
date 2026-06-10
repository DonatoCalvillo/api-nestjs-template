import { QueryRunner } from 'typeorm';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export type StoredRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface IRefreshTokenRepository {
  save(
    params: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    trx?: QueryRunner,
  ): Promise<StoredRefreshToken>;
  findValidByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  consumeValidByHash(
    tokenHash: string,
    trx?: QueryRunner,
  ): Promise<StoredRefreshToken | null>;
  revoke(id: string, trx?: QueryRunner): Promise<void>;
  revokeAllForUser(userId: string, trx?: QueryRunner): Promise<void>;
}
