import { ActorSnapshot } from '../audit/types/actor-snapshot';
import { IDomainEvent } from '../../domain/events';

export type DomainEventMetadata = {
  actor: ActorSnapshot;
  requestId?: string;
  traceId?: string;
};

export type DomainEventEnvelope<TEvent extends IDomainEvent = IDomainEvent> = {
  event: TEvent;
  metadata: DomainEventMetadata;
};
