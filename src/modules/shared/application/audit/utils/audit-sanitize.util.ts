import { SENSITIVE_AUDIT_FIELDS } from '../audit-log.constants';

export function sanitizeAuditState(value: unknown): unknown {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditState(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (
      SENSITIVE_AUDIT_FIELDS.includes(
        key as (typeof SENSITIVE_AUDIT_FIELDS)[number],
      )
    ) {
      sanitized[key] = '***REDACTED***';
      continue;
    }

    sanitized[key] =
      fieldValue != null && typeof fieldValue === 'object'
        ? sanitizeAuditState(fieldValue)
        : fieldValue;
  }

  return sanitized;
}
