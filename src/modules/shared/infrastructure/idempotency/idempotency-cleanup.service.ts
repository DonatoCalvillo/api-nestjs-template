import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { IDEMPOTENCY_REPOSITORY } from '../../application/idempotency/idempotency.constants';
import { IIdempotencyRepository } from '../../application/idempotency/ports/idempotency.repository.port';

@Injectable()
export class IdempotencyCleanupService {
  private readonly logger = new Logger(IdempotencyCleanupService.name);
  private isProcessing = false;

  constructor(
    @Inject(IDEMPOTENCY_REPOSITORY)
    private readonly idempotencyRepository: IIdempotencyRepository,
  ) {}

  @Cron(ENVIRONMENT_VARIABLES.IDEMPOTENCY_CLEANUP_CRON)
  async deleteExpiredKeys(): Promise<void> {
    if (!ENVIRONMENT_VARIABLES.IDEMPOTENCY_ENABLED) {
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
