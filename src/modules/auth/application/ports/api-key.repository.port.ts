import { QueryRunner } from 'typeorm';

export const API_KEY_REPOSITORY = Symbol('API_KEY_REPOSITORY');

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export type CreateApiKeyParams = {
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt: Date | null;
  createdBy: string;
};

export interface IApiKeyRepository {
  create(params: CreateApiKeyParams, trx?: QueryRunner): Promise<ApiKeyRecord>;
  findValidByHash(keyHash: string): Promise<ApiKeyRecord | null>;
}
