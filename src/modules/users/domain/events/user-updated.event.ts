import { IDomainEvent } from '../../../shared/domain/events/domain-event.interface';

export class UserUpdatedEvent implements IDomainEvent {
  static readonly eventName = 'user.updated';
  readonly eventName = UserUpdatedEvent.eventName;
  readonly occurredAt = new Date();

  constructor(
    readonly userId: string,
    readonly email: string,
  ) {}
}
