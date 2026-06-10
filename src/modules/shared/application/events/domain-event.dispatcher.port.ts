import { IDomainEvent } from '../../domain/events';

export const DOMAIN_EVENT_DISPATCHER = Symbol('DOMAIN_EVENT_DISPATCHER');

export interface IDomainEventDispatcher {
  dispatch(events: readonly IDomainEvent[]): Promise<void>;
}
