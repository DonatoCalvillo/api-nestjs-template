import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cache } from 'cache-manager';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { UserUpdatedEvent } from '../../../users/domain/events/user-updated.event';
import { DomainEventEnvelope } from '../../../shared/application/events';

export const userCacheKey = (userId: string): string => `user:${userId}`;

@Injectable()
export class UserCacheInvalidationHandler {
  constructor(
    @Optional()
    @Inject(CACHE_MANAGER)
    private readonly cacheManager?: Cache,
  ) {}

  @OnEvent(UserUpdatedEvent.eventName)
  async handle(envelope: DomainEventEnvelope<UserUpdatedEvent>): Promise<void> {
    if (!ENVIRONMENT_VARIABLES.CACHE_ENABLED || !this.cacheManager) {
      return;
    }

    await this.cacheManager.del(userCacheKey(envelope.event.userId));
  }
}
