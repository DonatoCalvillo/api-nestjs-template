jest.mock('../src/configuration/environments-variables', () => ({
  ENVIRONMENT_VARIABLES: {
    OUTBOX_RELAY_ENABLED: true,
    OUTBOX_RELAY_BATCH_SIZE: 50,
    OUTBOX_RELAY_MAX_ATTEMPTS: 5,
    OUTBOX_RELAY_LOCK_TTL_SECONDS: 120,
  },
}));

import { OutboxRelayService } from '../src/modules/shared/infrastructure/outbox/outbox-relay.service';
import { IOutboxRepository } from '../src/modules/shared/application/outbox/ports/outbox.repository.port';
import { IMessageBrokerPublisher } from '../src/modules/shared/application/outbox/ports/message-broker.publisher.port';
import { IDistributedLock } from '../src/modules/shared/application/locking/ports/distributed-lock.port';
import { ANONYMOUS_ACTOR } from '../src/modules/shared/application/audit/types/actor-snapshot';

describe('OutboxRelayService', () => {
  let repository: jest.Mocked<IOutboxRepository>;
  let publisher: jest.Mocked<IMessageBrokerPublisher>;
  let distributedLock: jest.Mocked<IDistributedLock>;
  let relay: OutboxRelayService;

  beforeEach(() => {
    repository = {
      insertMany: jest.fn(),
      claimPendingBatch: jest.fn(),
      markPublished: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      resetToPending: jest.fn().mockResolvedValue(undefined),
    };

    publisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    distributedLock = {
      tryAcquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    };

    relay = new OutboxRelayService(repository, publisher, distributedLock);
  });

  it('skips processing when lock cannot be acquired', async () => {
    distributedLock.tryAcquire.mockResolvedValue(false);

    await relay.processPending();

    expect(repository.claimPendingBatch).not.toHaveBeenCalled();
    expect(distributedLock.release).not.toHaveBeenCalled();
  });

  it('claims, publishes, and marks messages as published', async () => {
    repository.claimPendingBatch.mockResolvedValue([
      {
        id: 'msg-1',
        eventName: 'user.created',
        aggregateType: null,
        aggregateId: null,
        attempts: 0,
        payload: {
          event: {
            eventName: 'user.created',
            occurredAt: '2026-06-09T12:00:00.000Z',
            userId: 'user-1',
          },
          metadata: {
            actor: ANONYMOUS_ACTOR,
          },
        },
      },
    ]);

    await relay.processPending();

    expect(distributedLock.tryAcquire).toHaveBeenCalled();
    expect(distributedLock.release).toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith({
      event: expect.objectContaining({
        eventName: 'user.created',
        userId: 'user-1',
        occurredAt: expect.any(Date),
      }),
      metadata: {
        actor: ANONYMOUS_ACTOR,
      },
    });
    expect(repository.markPublished).toHaveBeenCalledWith(['msg-1']);
  });

  it('resets to pending when publish fails below max attempts', async () => {
    repository.claimPendingBatch.mockResolvedValue([
      {
        id: 'msg-2',
        eventName: 'user.created',
        aggregateType: null,
        aggregateId: null,
        attempts: 1,
        payload: {
          event: {
            eventName: 'user.created',
            occurredAt: '2026-06-09T12:00:00.000Z',
          },
          metadata: {
            actor: ANONYMOUS_ACTOR,
          },
        },
      },
    ]);
    publisher.publish.mockRejectedValue(new Error('broker unavailable'));

    await relay.processPending();

    expect(repository.resetToPending).toHaveBeenCalledWith(
      'msg-2',
      'broker unavailable',
      2,
    );
    expect(repository.markFailed).not.toHaveBeenCalled();
    expect(repository.markPublished).not.toHaveBeenCalled();
    expect(distributedLock.release).toHaveBeenCalled();
  });

  it('marks message as failed when max attempts is reached', async () => {
    repository.claimPendingBatch.mockResolvedValue([
      {
        id: 'msg-3',
        eventName: 'user.created',
        aggregateType: null,
        aggregateId: null,
        attempts: 4,
        payload: {
          event: {
            eventName: 'user.created',
            occurredAt: '2026-06-09T12:00:00.000Z',
          },
          metadata: {
            actor: ANONYMOUS_ACTOR,
          },
        },
      },
    ]);
    publisher.publish.mockRejectedValue(new Error('broker unavailable'));

    await relay.processPending();

    expect(repository.markFailed).toHaveBeenCalledWith(
      'msg-3',
      'broker unavailable',
      5,
    );
    expect(repository.resetToPending).not.toHaveBeenCalled();
    expect(distributedLock.release).toHaveBeenCalled();
  });
});
