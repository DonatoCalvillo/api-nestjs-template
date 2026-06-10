import { EventEmitter2 } from '@nestjs/event-emitter';
import { ANONYMOUS_ACTOR } from '../src/modules/shared/application/audit/types/actor-snapshot';
import { IDomainEvent } from '../src/modules/shared/domain/events';
import { ActorContextService } from '../src/modules/shared/infrastructure/audit/actor-context.service';
import { NestDomainEventDispatcher } from '../src/modules/shared/infrastructure/events/nest-domain-event.dispatcher';
import { TraceContextService } from '../src/modules/shared/infrastructure/tracing/trace-context.service';

class DispatchEvent implements IDomainEvent {
  static readonly eventName = 'dispatch.test';
  readonly eventName = DispatchEvent.eventName;
  readonly occurredAt = new Date();
}

describe('NestDomainEventDispatcher', () => {
  let eventEmitter: EventEmitter2;
  let actorContext: jest.Mocked<ActorContextService>;
  let traceContext: jest.Mocked<TraceContextService>;
  let dispatcher: NestDomainEventDispatcher;

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    actorContext = {
      getActor: jest.fn().mockReturnValue({
        actorId: 'user-1',
        actorType: 'user',
      }),
      getRequestId: jest.fn().mockReturnValue('req-1'),
      getIpAddress: jest.fn(),
      setActor: jest.fn(),
      setRequestId: jest.fn(),
      setIpAddress: jest.fn(),
    } as unknown as jest.Mocked<ActorContextService>;

    traceContext = {
      getTraceId: jest.fn().mockReturnValue('trace-1'),
    } as unknown as jest.Mocked<TraceContextService>;

    dispatcher = new NestDomainEventDispatcher(
      eventEmitter,
      actorContext,
      traceContext,
    );
  });

  it('emits envelopes with request metadata', async () => {
    const handler = jest.fn();
    eventEmitter.on(DispatchEvent.eventName, handler);

    await dispatcher.dispatch([new DispatchEvent()]);

    expect(handler).toHaveBeenCalledWith({
      event: expect.objectContaining({ eventName: DispatchEvent.eventName }),
      metadata: {
        actor: { actorId: 'user-1', actorType: 'user' },
        requestId: 'req-1',
        traceId: 'trace-1',
      },
    });
  });

  it('logs handler failures without rethrowing', async () => {
    eventEmitter.on(DispatchEvent.eventName, () => {
      throw new Error('handler failed');
    });

    await expect(
      dispatcher.dispatch([new DispatchEvent()]),
    ).resolves.toBeUndefined();
  });

  it('skips dispatch when event list is empty', async () => {
    const emitSpy = jest.spyOn(eventEmitter, 'emitAsync');

    await dispatcher.dispatch([]);

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('uses anonymous actor when context is missing', async () => {
    actorContext.getActor.mockReturnValue(ANONYMOUS_ACTOR);
    actorContext.getRequestId.mockReturnValue(undefined);
    traceContext.getTraceId.mockReturnValue(undefined);

    const handler = jest.fn();
    eventEmitter.on(DispatchEvent.eventName, handler);

    await dispatcher.dispatch([new DispatchEvent()]);

    expect(handler).toHaveBeenCalledWith({
      event: expect.any(DispatchEvent),
      metadata: {
        actor: ANONYMOUS_ACTOR,
        requestId: undefined,
        traceId: undefined,
      },
    });
  });
});
