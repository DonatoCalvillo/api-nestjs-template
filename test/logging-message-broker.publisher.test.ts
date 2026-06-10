import { LoggingMessageBrokerPublisher } from '../src/modules/shared/infrastructure/outbox/logging-message-broker.publisher';
import { ANONYMOUS_ACTOR } from '../src/modules/shared/application/audit/types/actor-snapshot';

describe('LoggingMessageBrokerPublisher', () => {
  it('logs event metadata on publish', async () => {
    const publisher = new LoggingMessageBrokerPublisher();
    const logSpy = jest.spyOn(publisher['logger'], 'log').mockImplementation();

    await publisher.publish({
      event: {
        eventName: 'user.created',
        occurredAt: new Date('2026-06-09T12:00:00.000Z'),
      },
      metadata: {
        actor: ANONYMOUS_ACTOR,
        traceId: 'trace-1',
        requestId: 'req-1',
      },
    });

    expect(logSpy).toHaveBeenCalledWith(
      {
        eventName: 'user.created',
        traceId: 'trace-1',
        requestId: 'req-1',
      },
      'Message broker publish (logging adapter)',
    );

    logSpy.mockRestore();
  });
});
