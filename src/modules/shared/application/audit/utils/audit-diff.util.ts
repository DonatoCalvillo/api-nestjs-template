import { AuditChange } from '../types/audit-log-entry';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

export function toPlainObject(value: unknown): Record<string, unknown> | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'object') {
    return { value };
  }

  if (value instanceof Date) {
    return { value: value.toISOString() };
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return { value: String(value) };
  }
}

export function toAuditRecord(value: unknown): Record<string, unknown> | null {
  return toPlainObject(value);
}

export function computeAuditDiff(
  before: unknown,
  after: unknown,
  prefix = '',
): AuditChange | null {
  if (before == null && after == null) {
    return null;
  }

  const beforeObject = toPlainObject(before);
  const afterObject = toPlainObject(after);

  if (beforeObject == null && afterObject == null) {
    return null;
  }

  const changes: AuditChange = {};
  const keys = new Set([
    ...Object.keys(beforeObject ?? {}),
    ...Object.keys(afterObject ?? {}),
  ]);

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const fromValue = beforeObject?.[key];
    const toValue = afterObject?.[key];

    if (isPlainObject(fromValue) && isPlainObject(toValue)) {
      const nestedChanges = computeAuditDiff(fromValue, toValue, path);

      if (nestedChanges) {
        Object.assign(changes, nestedChanges);
      }

      continue;
    }

    if (!deepEqual(fromValue, toValue)) {
      changes[path] = {
        from: fromValue ?? null,
        to: toValue ?? null,
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
