const REDACTED = '***REDACTED***';

const isSensitiveField = (
  key: string,
  sensitiveFields: readonly string[],
): boolean => sensitiveFields.includes(key);

export function sanitizeForLogging(
  value: unknown,
  sensitiveFields: readonly string[],
): unknown {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogging(item, sensitiveFields));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (isSensitiveField(key, sensitiveFields)) {
      sanitized[key] = REDACTED;
      continue;
    }

    sanitized[key] =
      fieldValue != null && typeof fieldValue === 'object'
        ? sanitizeForLogging(fieldValue, sensitiveFields)
        : fieldValue;
  }

  return sanitized;
}
