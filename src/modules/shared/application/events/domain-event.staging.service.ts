import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IDomainEvent } from '../../domain/events';
import { CLS_DOMAIN_EVENTS } from './domain-event.staging.constants';
import { collectDomainEventsFrom } from './utils/collect-domain-events.util';

@Injectable()
export class DomainEventStagingService {
  constructor(private readonly cls: ClsService) {}

  stage(events: readonly IDomainEvent[]): void {
    if (events.length === 0) {
      return;
    }

    const current = this.cls.get<IDomainEvent[]>(CLS_DOMAIN_EVENTS) ?? [];
    this.cls.set(CLS_DOMAIN_EVENTS, [...current, ...events]);
  }

  stageFrom(result: unknown): void {
    this.stage(collectDomainEventsFrom(result));
  }

  peekStaged(): readonly IDomainEvent[] {
    return this.cls.get<IDomainEvent[]>(CLS_DOMAIN_EVENTS) ?? [];
  }

  drain(): IDomainEvent[] {
    const events = this.cls.get<IDomainEvent[]>(CLS_DOMAIN_EVENTS) ?? [];
    this.cls.set(CLS_DOMAIN_EVENTS, []);
    return events;
  }
}
