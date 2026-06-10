import { AggregateRoot } from '../../../domain/events/aggregate-root';
import { IDomainEvent } from '../../../domain/events/domain-event.interface';

export function collectDomainEventsFrom(value: unknown): IDomainEvent[] {
  const events: IDomainEvent[] = [];
  const seen = new Set<object>();

  collectFromValue(value, events, seen);

  return events;
}

function collectFromValue(
  value: unknown,
  events: IDomainEvent[],
  seen: Set<object>,
): void {
  if (value == null || typeof value !== 'object') {
    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  if (value instanceof AggregateRoot) {
    events.push(...value.pullDomainEvents());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFromValue(item, events, seen);
    }
    return;
  }

  for (const prop of Object.values(value)) {
    collectFromValue(prop, events, seen);
  }
}
