function isValueObject(value: object): value is { value: unknown } {
  return 'value' in value;
}

function unwrapValueObject(value: object): unknown {
  if (typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
    const json = (value as { toJSON: () => unknown }).toJSON();
    if (json && typeof json === 'object' && 'value' in json) {
      return (json as { value: unknown }).value;
    }
  }

  if (isValueObject(value)) {
    return value.value;
  }

  return value;
}

export function toPrimitives(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toPrimitives);
  }

  const unwrapped = unwrapValueObject(value);
  if (unwrapped !== value) {
    return toPrimitives(unwrapped);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(
      ([key, entryValue]) => [key, toPrimitives(entryValue)],
    ),
  );
}
