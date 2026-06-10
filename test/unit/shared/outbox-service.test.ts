import { QueryRunner } from 'typeorm';
import { OutboxService } from '../../../src/modules/shared/application/outbox/outbox.service';
import { OutboxMessageStatus } from '../../../src/modules/shared/application/outbox/outbox-message.status';
import { IOutboxRepository } from '../../../src/modules/shared/application/outbox/ports/outbox.repository.port';
import { DomainEventStagingService } from '../../../src/modules/shared/application/events';
import { ActorContextService } from '../../../src/modules/shared/infrastructure/audit/actor-context.service';
import { TraceContextService } from '../../../src/modules/shared/infrastructure/tracing/trace-context.service';
import { IDomainEvent } from '../../../src/modules/shared/domain/events';
import { ANONYMOUS_ACTOR } from '../../../src/modules/shared/application/audit/types/actor-snapshot';

class OutboxTestEvent implements IDomainEvent {
  readonly eventName = 'outbox.test';
  readonly occurredAt = new Date('2026-06-09T12:00:00.000Z');
}

describe('OutboxService', () => {
  let staging: jest.Mocked<DomainEventStagingService>;
  let actorContext: jest.Mocked<ActorContextService>;
  let traceContext: jest.Mocked<TraceContextService>;
  let repository: jest.Mocked<IOutboxRepository>;
  let service: OutboxService;

  beforeEach(() => {
    staging = {
      peekStaged: jest.fn(),
    } as unknown as jest.Mocked<DomainEventStagingService>;

    actorContext = {
      getActor: jest.fn().mockReturnValue(ANONYMOUS_ACTOR),
      getRequestId: jest.fn().mockReturnValue('req-1'),
    } as unknown as jest.Mocked<ActorContextService>;

    traceContext = {
      getTraceId: jest.fn().mockReturnValue('trace-1'),
    } as unknown as jest.Mocked<TraceContextService>;

    repository = {
      insertMany: jest.fn().mockResolvedValue(undefined),
      claimPendingBatch: jest.fn(),
      markPublished: jest.fn(),
      markFailed: jest.fn(),
      resetToPending: jest.fn(),
      reclaimStaleProcessing: jest.fn(),
      countByStatus: jest.fn(),
    };

    service = new OutboxService(
      staging,
      actorContext,
      traceContext,
      repository,
    );
  });

  it('does nothing when no events are staged', async () => {
    staging.peekStaged.mockReturnValue([]);

    await service.persistStaged({} as QueryRunner);

    expect(repository.insertMany).not.toHaveBeenCalled();
  });

  it('persists staged events inside the transaction', async () => {
    const event = new OutboxTestEvent();
    const trx = {} as QueryRunner;
    staging.peekStaged.mockReturnValue([event]);

    await service.persistStaged(trx);

    expect(repository.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          eventName: 'outbox.test',
          aggregateType: null,
          aggregateId: null,
          status: OutboxMessageStatus.Pending,
          payload: {
            event: {
              eventName: 'outbox.test',
              occurredAt: '2026-06-09T12:00:00.000Z',
            },
            metadata: {
              actor: ANONYMOUS_ACTOR,
              requestId: 'req-1',
              traceId: 'trace-1',
            },
          },
        }),
      ],
      trx,
    );
  });
});
