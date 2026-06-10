import { SetMetadata } from '@nestjs/common';

export const API_KEY_AUTH_KEY = 'apiKeyAuth';
export const API_KEY_SCOPES_KEY = 'apiKeyScopes';

export const ApiKeyAuth = (...scopes: string[]) =>
  SetMetadata(API_KEY_AUTH_KEY, scopes.length > 0 ? scopes : true);

export const ApiKeyScopes = (...scopes: string[]) =>
  SetMetadata(API_KEY_SCOPES_KEY, scopes);
