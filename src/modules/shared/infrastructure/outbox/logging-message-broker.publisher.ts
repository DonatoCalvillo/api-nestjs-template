import { Injectable, Logger } from '@nestjs/common';
import { DomainEventEnvelope } from '../../application/events/domain-event-envelope';
import { IMessageBrokerPublisher } from '../../application/outbox/ports/message-broker.publisher.port';

@Injectable()
export class LoggingMessageBrokerPublisher implements IMessageBrokerPublisher {
  private readonly logger = new Logger(LoggingMessageBrokerPublisher.name);

  async publish(envelope: DomainEventEnvelope): Promise<void> {
    this.logger.log(
      {
        eventName: envelope.event.eventName,
        traceId: envelope.metadata.traceId,
        requestId: envelope.metadata.requestId,
      },
      'Message broker publish (logging adapter)',
    );
  }
}
