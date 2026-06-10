export interface IDomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
}
