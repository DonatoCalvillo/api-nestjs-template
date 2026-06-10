import { DomainEventEnvelope } from '../../events/domain-event-envelope';

export interface IMessageBrokerPublisher {
  publish(envelope: DomainEventEnvelope): Promise<void>;
}
