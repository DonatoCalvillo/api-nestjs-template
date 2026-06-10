import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { ShutdownStateService } from '../../../../configuration/shutdown/shutdown-state.service';
import { IDEMPOTENCY_REPOSITORY } from '../../application/idempotency/idempotency.constants';
import { IIdempotencyRepository } from '../../application/idempotency/ports/idempotency.repository.port';

@Injectable()
export class IdempotencyCleanupService {
  private readonly logger = new Logger(IdempotencyCleanupService.name);
  private isProcessing = false;

  constructor(
    @Inject(IDEMPOTENCY_REPOSITORY)
    private readonly idempotencyRepository: IIdempotencyRepository,
    private readonly shutdownState: ShutdownStateService,
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

  @Cron(ENVIRONMENT_VARIABLES.IDEMPOTENCY_CLEANUP_CRON)
  async deleteExpiredKeys(): Promise<void> {
    if (!ENVIRONMENT_VARIABLES.IDEMPOTENCY_ENABLED) {
      return;
    }

    if (this.shutdownState.isShuttingDown) {
      return;
    }

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const deleted = await this.idempotencyRepository.deleteExpired();

      if (deleted > 0) {
        this.logger.log(`Deleted ${deleted} expired idempotency keys`);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
