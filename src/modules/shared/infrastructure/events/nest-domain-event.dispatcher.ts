import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DomainEventEnvelope,
  IDomainEventDispatcher,
} from '../../application/events';
import { IDomainEvent } from '../../domain/events';
import { ActorContextService } from '../audit/actor-context.service';
import { TraceContextService } from '../tracing/trace-context.service';

@Injectable()
export class NestDomainEventDispatcher implements IDomainEventDispatcher {
  private readonly logger = new Logger(NestDomainEventDispatcher.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly actorContext: ActorContextService,
    private readonly traceContext: TraceContextService,
  ) {}

  async dispatch(events: readonly IDomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const metadata = {
      actor: this.actorContext.getActor(),
      requestId: this.actorContext.getRequestId(),
      traceId: this.traceContext.getTraceId(),
    };

    await Promise.all(
      events.map(async (event) => {
        const envelope: DomainEventEnvelope = { event, metadata };

        try {
          await this.eventEmitter.emitAsync(event.eventName, envelope);
        } catch (error) {
          this.logger.error(
            {
              err: error instanceof Error ? error : new Error(String(error)),
              eventName: event.eventName,
            },
            'Domain event handler failed',
          );
        }
      }),
    );
  }
}
