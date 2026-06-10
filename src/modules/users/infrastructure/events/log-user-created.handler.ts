import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DomainEventEnvelope } from '../../../shared/application/events';
import { UserCreatedEvent } from '../../domain/events/user-created.event';

@Injectable()
export class LogUserCreatedHandler {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LogUserCreatedHandler.name);
  }

  @OnEvent(UserCreatedEvent.eventName)
  handle(envelope: DomainEventEnvelope<UserCreatedEvent>): void {
    this.logger.info(
      {
        event: UserCreatedEvent.eventName,
        userId: envelope.event.userId,
        email: envelope.event.email,
        name: envelope.event.name,
        requestId: envelope.metadata.requestId,
      },
      'User registered',
    );
  }
}
