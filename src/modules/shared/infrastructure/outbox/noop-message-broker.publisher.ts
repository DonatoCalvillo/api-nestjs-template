import { Injectable, Logger } from '@nestjs/common';
import { DomainEventEnvelope } from '../../application/events/domain-event-envelope';
import { IMessageBrokerPublisher } from '../../application/outbox/ports/message-broker.publisher.port';

@Injectable()
export class NoOpMessageBrokerPublisher implements IMessageBrokerPublisher {
  private readonly logger = new Logger(NoOpMessageBrokerPublisher.name);

  async publish(envelope: DomainEventEnvelope): Promise<void> {
    this.logger.debug(
      { eventName: envelope.event.eventName },
      'No-op message broker publish',
    );
  }
}
