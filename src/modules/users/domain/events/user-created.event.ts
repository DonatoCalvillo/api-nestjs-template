import { IDomainEvent } from '../../../shared/domain/events/domain-event.interface';

export class UserCreatedEvent implements IDomainEvent {
  static readonly eventName = 'user.created';
  readonly eventName = UserCreatedEvent.eventName;
  readonly occurredAt = new Date();

  constructor(
    readonly userId: string,
    readonly email: string,
    readonly name: string,
  ) {}
}
