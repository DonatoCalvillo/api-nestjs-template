import { QueryRunner } from 'typeorm';
import { AuthTokenType } from '../../domain/constants/auth-token.constants';

export const AUTH_TOKEN_REPOSITORY = Symbol('AUTH_TOKEN_REPOSITORY');

export type AuthTokenRecord = {
  id: string;
  userId: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

export interface IAuthTokenRepository {
  save(
    params: {
      userId: string;
      type: AuthTokenType;
      tokenHash: string;
      expiresAt: Date;
    },
    trx?: QueryRunner,
  ): Promise<void>;
  findValidByHash(
    tokenHash: string,
    type: AuthTokenType,
    trx?: QueryRunner,
  ): Promise<AuthTokenRecord | null>;
  consume(id: string, trx?: QueryRunner): Promise<void>;
}
