export const AUDIT_LOG_KEY = 'audit_log';

export const AUDIT_LOG_SERVICE = Symbol('AUDIT_LOG_SERVICE');

export const SENSITIVE_AUDIT_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
] as const;
