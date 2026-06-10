import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import {
  API_KEY_REPOSITORY,
  IApiKeyRepository,
} from '../../application/ports/api-key.repository.port';
import {
  API_KEY_AUTH_KEY,
  API_KEY_SCOPES_KEY,
} from '../decorators/api-key-auth.decorator';
import { TypeOrmApiKeyRepository } from '../persistence/typeorm-api-key.repository';

export type ApiKeyRequestUser = {
  id: string;
  type: 'api_key';
  scopes: string[];
  permissions: string[];
  roles: string[];
};

type ApiKeyRequest = Request & { apiKeyUser?: ApiKeyRequestUser };

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: IApiKeyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!ENVIRONMENT_VARIABLES.API_KEYS_ENABLED) {
      return true;
    }

    const apiKeyMeta = this.reflector.getAllAndOverride<boolean | string[]>(
      API_KEY_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!apiKeyMeta) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const rawKey = request.header('x-api-key');

    if (!rawKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const record = await this.apiKeyRepository.findValidByHash(
      TypeOrmApiKeyRepository.hashKey(rawKey),
    );

    if (!record) {
      throw new UnauthorizedException('Invalid API key');
    }

    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(API_KEY_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? (Array.isArray(apiKeyMeta) ? apiKeyMeta : []);

    if (
      requiredScopes.length > 0 &&
      !requiredScopes.every((scope) => record.scopes.includes(scope))
    ) {
      throw new UnauthorizedException('Insufficient API key scope');
    }

    request.apiKeyUser = {
      id: record.id,
      type: 'api_key',
      scopes: record.scopes,
      permissions: record.scopes,
      roles: [],
    };

    return true;
  }
}
