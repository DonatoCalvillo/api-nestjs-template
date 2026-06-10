import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PinoLogger } from 'nestjs-pino';
import { BaseUseCase, Result } from '../../../shared/application';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';
import {
  API_KEY_REPOSITORY,
  IApiKeyRepository,
} from '../ports/api-key.repository.port';
import { TypeOrmApiKeyRepository } from '../../infrastructure/persistence/typeorm-api-key.repository';

export type CreateApiKeyCommand = {
  name: string;
  scopes: string[];
  actor: AuthenticatedUser;
  expiresAt?: Date;
};

export type CreateApiKeyResult = {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  scopes: string[];
};

@Injectable()
export class CreateApiKeyUseCase extends BaseUseCase<
  CreateApiKeyCommand,
  Result<CreateApiKeyResult>
> {
  constructor(
    logger: PinoLogger,
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: IApiKeyRepository,
  ) {
    super(logger);
  }

  protected async executeImpl(
    command: CreateApiKeyCommand,
  ): Promise<Result<CreateApiKeyResult>> {
    const rawKey = `nak_${randomBytes(32).toString('base64url')}`;
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = TypeOrmApiKeyRepository.hashKey(rawKey);

    const record = await this.apiKeyRepository.create({
      name: command.name,
      keyPrefix,
      keyHash,
      scopes: command.scopes,
      expiresAt: command.expiresAt ?? null,
      createdBy: command.actor.id,
    });

    return Result.ok({
      id: record.id,
      name: record.name,
      key: rawKey,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes,
    });
  }
}
