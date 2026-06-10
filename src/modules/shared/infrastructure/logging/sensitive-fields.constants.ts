export const SENSITIVE_SECRET_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'refreshToken',
  'accessToken',
  'authorization',
] as const;

export const SENSITIVE_PII_FIELDS = ['email', 'phone', 'name'] as const;

export const SENSITIVE_LOG_FIELDS = [
  ...SENSITIVE_SECRET_FIELDS,
  ...SENSITIVE_PII_FIELDS,
] as const;
