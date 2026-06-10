import { Inject, Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { DomainEventStagingService } from '../events';
import { ActorContextService } from '../../infrastructure/audit/actor-context.service';
import { TraceContextService } from '../../infrastructure/tracing/trace-context.service';
import { OUTBOX_REPOSITORY } from './outbox.constants';
import { OutboxMessageStatus } from './outbox-message.status';
import { IOutboxRepository } from './ports/outbox.repository.port';
import { serializeDomainEventEnvelope } from './utils/domain-event.serializer';

@Injectable()
export class OutboxService {
  constructor(
    private readonly domainEventStaging: DomainEventStagingService,
    private readonly actorContext: ActorContextService,
    private readonly traceContext: TraceContextService,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: IOutboxRepository,
  ) {}

  async persistStaged(trx?: QueryRunner): Promise<void> {
    const events = this.domainEventStaging.peekStaged();

    if (events.length === 0) {
      return;
    }

    const metadata = {
      actor: this.actorContext.getActor(),
      requestId: this.actorContext.getRequestId(),
      traceId: this.traceContext.getTraceId(),
    };

    const entries = events.map((event) => ({
      eventName: event.eventName,
      aggregateType: null,
      aggregateId: null,
      payload: serializeDomainEventEnvelope({ event, metadata }),
      status: OutboxMessageStatus.Pending,
    }));

    await this.outboxRepository.insertMany(entries, trx);
  }
}
