import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DomainEventEnvelope } from '../../../shared/application/events';
import { UserUpdatedEvent } from '../../domain/events/user-updated.event';

@Injectable()
export class LogUserUpdatedHandler {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LogUserUpdatedHandler.name);
  }

  @OnEvent(UserUpdatedEvent.eventName)
  handle(envelope: DomainEventEnvelope<UserUpdatedEvent>): void {
    this.logger.info(
      {
        event: UserUpdatedEvent.eventName,
        userId: envelope.event.userId,
        email: envelope.event.email,
        actorId: envelope.metadata.actor.actorId,
        requestId: envelope.metadata.requestId,
      },
      'User profile updated',
    );
  }
}
