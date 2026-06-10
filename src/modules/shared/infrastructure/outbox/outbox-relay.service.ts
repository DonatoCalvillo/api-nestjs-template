import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import {
  DISTRIBUTED_LOCK,
  IDistributedLock,
} from '../../application/locking/ports/distributed-lock.port';
import { deserializeDomainEventEnvelope } from '../../application/outbox';
import {
  MESSAGE_BROKER_PUBLISHER,
  OUTBOX_REPOSITORY,
} from '../../application/outbox/outbox.constants';
import { IMessageBrokerPublisher } from '../../application/outbox/ports/message-broker.publisher.port';
import { IOutboxRepository } from '../../application/outbox/ports/outbox.repository.port';
import { OUTBOX_RELAY_LOCK_KEY } from '../locking/locking.constants';

@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);

  constructor(
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: IOutboxRepository,
    @Inject(MESSAGE_BROKER_PUBLISHER)
    private readonly messageBrokerPublisher: IMessageBrokerPublisher,
    @Inject(DISTRIBUTED_LOCK)
    private readonly distributedLock: IDistributedLock,
  ) {}

  @Cron(ENVIRONMENT_VARIABLES.OUTBOX_RELAY_CRON)
  async processPending(): Promise<void> {
    if (!ENVIRONMENT_VARIABLES.OUTBOX_RELAY_ENABLED) {
      return;
    }

    const acquired = await this.distributedLock.tryAcquire(
      OUTBOX_RELAY_LOCK_KEY,
      ENVIRONMENT_VARIABLES.OUTBOX_RELAY_LOCK_TTL_SECONDS,
    );

    if (!acquired) {
      return;
    }

    try {
      const batch = await this.outboxRepository.claimPendingBatch(
        ENVIRONMENT_VARIABLES.OUTBOX_RELAY_BATCH_SIZE,
      );

      if (batch.length === 0) {
        return;
      }

      const publishedIds: string[] = [];

      for (const message of batch) {
        const envelope = deserializeDomainEventEnvelope(message.payload);
        const nextAttempts = message.attempts + 1;

        try {
          await this.messageBrokerPublisher.publish(envelope);
          publishedIds.push(message.id);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          if (nextAttempts >= ENVIRONMENT_VARIABLES.OUTBOX_RELAY_MAX_ATTEMPTS) {
            await this.outboxRepository.markFailed(
              message.id,
              errorMessage,
              nextAttempts,
            );
            this.logger.error(
              {
                err: error instanceof Error ? error : new Error(errorMessage),
                outboxMessageId: message.id,
                eventName: message.eventName,
                attempts: nextAttempts,
              },
              'Outbox message marked as failed',
            );
            continue;
          }

          await this.outboxRepository.resetToPending(
            message.id,
            errorMessage,
            nextAttempts,
          );
          this.logger.warn(
            {
              outboxMessageId: message.id,
              eventName: message.eventName,
              attempts: nextAttempts,
              err: error instanceof Error ? error : new Error(errorMessage),
            },
            'Outbox message publish failed, will retry',
          );
        }
      }

      if (publishedIds.length > 0) {
        await this.outboxRepository.markPublished(publishedIds);
      }
    } catch (error) {
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Outbox relay batch failed',
      );
    } finally {
      await this.distributedLock.release(OUTBOX_RELAY_LOCK_KEY);
    }
  }
}
