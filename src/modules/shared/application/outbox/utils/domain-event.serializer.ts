import { DomainEventEnvelope } from '../../events/domain-event-envelope';
import { IDomainEvent } from '../../../domain/events';

const serializeValue = (value: unknown, seen: WeakSet<object>): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeValue(nestedValue, seen),
      ]),
    );
  }

  return value;
};

export const serializeDomainEventEnvelope = (
  envelope: DomainEventEnvelope,
): Record<string, unknown> => {
  const seen = new WeakSet<object>();

  return serializeValue(envelope, seen) as Record<string, unknown>;
};

export const deserializeDomainEventEnvelope = (
  payload: Record<string, unknown>,
): DomainEventEnvelope => {
  const event = payload.event as Record<string, unknown>;
  const metadata = payload.metadata as DomainEventEnvelope['metadata'];

  return {
    event: {
      ...event,
      occurredAt: new Date(event.occurredAt as string),
    } as IDomainEvent,
    metadata,
  };
};
