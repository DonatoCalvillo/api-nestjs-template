import { createHash } from 'crypto';

const sortKeys = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = sortKeys((value as Record<string, unknown>)[key]);
      return accumulator;
    }, {});
};

export const buildRequestHash = (
  method: string,
  path: string,
  body: unknown,
): string => {
  const normalizedBody =
    body === undefined || body === null ? '' : JSON.stringify(sortKeys(body));
  const payload = `${method.toUpperCase()}\n${path}\n${normalizedBody}`;

  return createHash('sha256').update(payload).digest('hex');
};
