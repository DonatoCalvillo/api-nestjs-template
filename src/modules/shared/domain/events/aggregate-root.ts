import { BaseModel } from '../model/base.model';
import { BaseModelParams } from '../model/model.interface';
import { IDomainEvent } from './domain-event.interface';

export abstract class AggregateRoot<
  TProps extends object,
> extends BaseModel<TProps> {
  private domainEvents: IDomainEvent[] = [];

  constructor(params: BaseModelParams<TProps>) {
    super(params);
  }

  protected addDomainEvent(event: IDomainEvent): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): readonly IDomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  hasDomainEvents(): boolean {
    return this.domainEvents.length > 0;
  }
}
