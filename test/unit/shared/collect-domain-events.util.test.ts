import { collectDomainEventsFrom } from '../../../src/modules/shared/application/events';
import { AggregateRoot } from '../../../src/modules/shared/domain/model';
import { IDomainEvent } from '../../../src/modules/shared/domain/events';

class AlphaEvent implements IDomainEvent {
  static readonly eventName = 'alpha.created';
  readonly eventName = AlphaEvent.eventName;
  readonly occurredAt = new Date();

  constructor(readonly id: string) {}
}

class BetaEvent implements IDomainEvent {
  static readonly eventName = 'beta.updated';
  readonly eventName = BetaEvent.eventName;
  readonly occurredAt = new Date();

  constructor(readonly id: string) {}
}

type TestProps = { value: string };

class AlphaAggregate extends AggregateRoot<TestProps> {
  constructor(id: string) {
    super({ id, props: { value: 'alpha' } });
  }

  emit(): void {
    this.addDomainEvent(new AlphaEvent(this.id));
  }
}

class BetaAggregate extends AggregateRoot<TestProps> {
  constructor(id: string) {
    super({ id, props: { value: 'beta' } });
  }

  emit(): void {
    this.addDomainEvent(new BetaEvent(this.id));
  }
}

describe('collectDomainEventsFrom', () => {
  it('returns empty array for nullish and primitive values', () => {
    expect(collectDomainEventsFrom(null)).toEqual([]);
    expect(collectDomainEventsFrom(undefined)).toEqual([]);
    expect(collectDomainEventsFrom('text')).toEqual([]);
    expect(collectDomainEventsFrom(42)).toEqual([]);
  });

  it('pulls events from a single aggregate', () => {
    const aggregate = new AlphaAggregate(
      '550e8400-e29b-41d4-a716-446655440001',
    );
    aggregate.emit();

    const events = collectDomainEventsFrom(aggregate);

    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe(AlphaEvent.eventName);
    expect(aggregate.hasDomainEvents()).toBe(false);
  });

  it('pulls events from an array of aggregates', () => {
    const alpha = new AlphaAggregate('550e8400-e29b-41d4-a716-446655440002');
    const beta = new BetaAggregate('550e8400-e29b-41d4-a716-446655440003');
    alpha.emit();
    beta.emit();

    const events = collectDomainEventsFrom([alpha, beta]);

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.eventName)).toEqual([
      AlphaEvent.eventName,
      BetaEvent.eventName,
    ]);
  });

  it('pulls events from nested object properties', () => {
    const alpha = new AlphaAggregate('550e8400-e29b-41d4-a716-446655440004');
    alpha.emit();

    const events = collectDomainEventsFrom({
      meta: { ignored: 'value' },
      payload: { aggregate: alpha },
    });

    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe(AlphaEvent.eventName);
  });

  it('avoids infinite loops on circular references', () => {
    const alpha = new AlphaAggregate('550e8400-e29b-41d4-a716-446655440005');
    alpha.emit();

    const circular: Record<string, unknown> = { aggregate: alpha };
    circular.self = circular;

    const events = collectDomainEventsFrom(circular);

    expect(events).toHaveLength(1);
  });
});
