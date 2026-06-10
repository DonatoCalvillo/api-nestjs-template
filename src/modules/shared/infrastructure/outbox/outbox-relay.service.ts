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
import { OutboxMessageStatus } from '../../application/outbox/outbox-message.status';
import { IMessageBrokerPublisher } from '../../application/outbox/ports/message-broker.publisher.port';
import { IOutboxRepository } from '../../application/outbox/ports/outbox.repository.port';
import { ShutdownStateService } from '../../../../configuration/shutdown/shutdown-state.service';
import { OUTBOX_RELAY_LOCK_KEY } from '../locking/locking.constants';
import {
  BUSINESS_METRICS,
  IBusinessMetrics,
} from '../metrics/business-metrics.port';

@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);
  private isProcessing = false;

  constructor(
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: IOutboxRepository,
    @Inject(MESSAGE_BROKER_PUBLISHER)
    private readonly messageBrokerPublisher: IMessageBrokerPublisher,
    @Inject(DISTRIBUTED_LOCK)
    private readonly distributedLock: IDistributedLock,
    private readonly shutdownState: ShutdownStateService,
    @Inject(BUSINESS_METRICS)
    private readonly businessMetrics: IBusinessMetrics,
  ) {}

  async waitForIdle(maxWaitMs: number): Promise<void> {
    const pollIntervalMs = 50;
    const start = Date.now();

    while (this.isProcessing) {
      if (Date.now() - start >= maxWaitMs) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  @Cron(ENVIRONMENT_VARIABLES.OUTBOX_RELAY_CRON)
  async processPending(): Promise<void> {
    if (!ENVIRONMENT_VARIABLES.OUTBOX_RELAY_ENABLED) {
      return;
    }

    if (this.shutdownState.isShuttingDown) {
      return;
    }

    this.isProcessing = true;
    let acquired = false;

    try {
      acquired = await this.distributedLock.tryAcquire(
        OUTBOX_RELAY_LOCK_KEY,
        ENVIRONMENT_VARIABLES.OUTBOX_RELAY_LOCK_TTL_SECONDS,
      );

      if (!acquired) {
        return;
      }

      await this.processBatch();
    } catch (error) {
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Outbox relay batch failed',
      );
    } finally {
      if (acquired) {
        await this.distributedLock.release(OUTBOX_RELAY_LOCK_KEY);
      }

      this.isProcessing = false;
    }
  }

  private async processBatch(): Promise<void> {
    try {
      await this.refreshOutboxPendingMetrics();

      if (ENVIRONMENT_VARIABLES.OUTBOX_RECLAIM_ENABLED) {
        const olderThan = new Date(
          Date.now() -
            ENVIRONMENT_VARIABLES.OUTBOX_STALE_PROCESSING_SECONDS * 1000,
        );
        const reclaimed =
          await this.outboxRepository.reclaimStaleProcessing(olderThan);

        if (reclaimed > 0) {
          this.logger.warn(
            { reclaimed },
            'Reclaimed stale outbox messages from processing',
          );
        }
      }

      const batch = await this.outboxRepository.claimPendingBatch(
        ENVIRONMENT_VARIABLES.OUTBOX_RELAY_BATCH_SIZE,
      );

      if (batch.length === 0) {
        return;
      }

      for (const message of batch) {
        let envelope;

        try {
          envelope = deserializeDomainEventEnvelope(message.payload);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const nextAttempts = message.attempts + 1;

          if (nextAttempts >= ENVIRONMENT_VARIABLES.OUTBOX_RELAY_MAX_ATTEMPTS) {
            await this.outboxRepository.markFailed(
              message.id,
              errorMessage,
              nextAttempts,
            );
            this.businessMetrics.recordOutboxFailed(message.eventName);
          } else {
            await this.outboxRepository.resetToPending(
              message.id,
              errorMessage,
              nextAttempts,
            );
          }

          this.logger.error(
            {
              err: error instanceof Error ? error : new Error(errorMessage),
              outboxMessageId: message.id,
              eventName: message.eventName,
            },
            'Outbox message deserialization failed',
          );
          continue;
        }

        const nextAttempts = message.attempts + 1;

        try {
          await this.messageBrokerPublisher.publish(envelope);
          await this.outboxRepository.markPublished([message.id]);
          this.businessMetrics.recordOutboxPublished(message.eventName);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          if (nextAttempts >= ENVIRONMENT_VARIABLES.OUTBOX_RELAY_MAX_ATTEMPTS) {
            await this.outboxRepository.markFailed(
              message.id,
              errorMessage,
              nextAttempts,
            );
            this.businessMetrics.recordOutboxFailed(message.eventName);
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
    } catch (error) {
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Outbox relay batch failed',
      );
    }
  }

  private async refreshOutboxPendingMetrics(): Promise<void> {
    const statuses = [
      OutboxMessageStatus.Pending,
      OutboxMessageStatus.Processing,
      OutboxMessageStatus.Failed,
    ] as const;

    await Promise.all(
      statuses.map(async (status) => {
        const count = await this.outboxRepository.countByStatus(status);
        this.businessMetrics.setOutboxPending(status, count);
      }),
    );
  }
}
