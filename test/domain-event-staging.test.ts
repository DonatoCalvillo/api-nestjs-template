import { ClsService } from 'nestjs-cls';
import { DomainEventStagingService } from '../src/modules/shared/application/events';
import { CLS_DOMAIN_EVENTS } from '../src/modules/shared/application/events/domain-event.staging.constants';
import { IDomainEvent } from '../src/modules/shared/domain/events';

class StagedEvent implements IDomainEvent {
  readonly eventName = 'staged.event';
  readonly occurredAt = new Date();
}

describe('DomainEventStagingService', () => {
  let cls: jest.Mocked<ClsService>;
  let service: DomainEventStagingService;
  const store = new Map<string, unknown>();

  beforeEach(() => {
    store.clear();

    cls = {
      get: jest.fn((key: string) => store.get(key)),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
      }),
    } as unknown as jest.Mocked<ClsService>;

    service = new DomainEventStagingService(cls);
  });

  it('appends staged events in CLS', () => {
    const first = new StagedEvent();
    const second = new StagedEvent();

    service.stage([first]);
    service.stage([second]);

    expect(cls.set).toHaveBeenCalledWith(CLS_DOMAIN_EVENTS, [first, second]);
  });

  it('ignores empty stage calls', () => {
    service.stage([]);

    expect(cls.set).not.toHaveBeenCalled();
  });

  it('drains and clears staged events', () => {
    const event = new StagedEvent();
    store.set(CLS_DOMAIN_EVENTS, [event]);

    const drained = service.drain();

    expect(drained).toEqual([event]);
    expect(cls.set).toHaveBeenCalledWith(CLS_DOMAIN_EVENTS, []);
  });

  it('returns empty array when nothing was staged', () => {
    expect(service.drain()).toEqual([]);
  });
});
