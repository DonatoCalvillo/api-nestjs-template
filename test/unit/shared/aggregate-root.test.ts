import {
  AggregateRoot,
  BaseModelParams,
} from '../../../src/modules/shared/domain/model';
import { IDomainEvent } from '../../../src/modules/shared/domain/events';

class SampleEvent implements IDomainEvent {
  static readonly eventName = 'sample.created';
  readonly eventName = SampleEvent.eventName;
  readonly occurredAt = new Date();

  constructor(readonly aggregateId: string) {}
}

type SampleProps = { label: string };

class SampleAggregate extends AggregateRoot<SampleProps> {
  constructor(params: BaseModelParams<SampleProps>) {
    super(params);
  }

  recordEvent(): void {
    this.addDomainEvent(new SampleEvent(this.id));
  }
}

describe('AggregateRoot', () => {
  const aggregate = new SampleAggregate({
    id: '550e8400-e29b-41d4-a716-446655440000',
    props: { label: 'test' },
  });

  it('starts with no pending domain events', () => {
    expect(aggregate.hasDomainEvents()).toBe(false);
  });

  it('accumulates domain events via addDomainEvent', () => {
    aggregate.recordEvent();
    aggregate.recordEvent();

    expect(aggregate.hasDomainEvents()).toBe(true);
  });

  it('pullDomainEvents returns a copy and clears the buffer', () => {
    const events = aggregate.pullDomainEvents();

    expect(events).toHaveLength(2);
    expect(events[0]).toBeInstanceOf(SampleEvent);
    expect((events[0] as SampleEvent).aggregateId).toBe(aggregate.id);
    expect(aggregate.hasDomainEvents()).toBe(false);
    expect(aggregate.pullDomainEvents()).toHaveLength(0);
  });
});
