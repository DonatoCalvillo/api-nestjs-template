import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { shutdownTracing } from '../../instrumentation';
import { IdempotencyCleanupService } from '../../modules/shared/infrastructure/idempotency/idempotency-cleanup.service';
import { OutboxRelayService } from '../../modules/shared/infrastructure/outbox/outbox-relay.service';
import { ShutdownStateService } from './shutdown-state.service';

const IDLE_WAIT_MS = 5000;

@Injectable()
export class ShutdownService
  implements BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly logger = new Logger(ShutdownService.name);

  constructor(
    private readonly shutdownState: ShutdownStateService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly outboxRelayService: OutboxRelayService,
    private readonly idempotencyCleanupService: IdempotencyCleanupService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async beforeApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Graceful shutdown started (signal: ${signal ?? 'unknown'})`,
    );
    this.shutdownState.markShuttingDown();
    this.stopCronJobs();
    await this.waitForInFlightWork();
  }

  async onApplicationShutdown(): Promise<void> {
    await shutdownTracing();

    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('Database connection pool closed');
    }
  }

  private stopCronJobs(): void {
    const cronJobs = this.schedulerRegistry.getCronJobs();

    for (const [name, job] of cronJobs) {
      job.stop();
      this.logger.log(`Stopped cron job: ${name}`);
    }
  }

  private async waitForInFlightWork(): Promise<void> {
    await Promise.all([
      this.outboxRelayService.waitForIdle(IDLE_WAIT_MS),
      this.idempotencyCleanupService.waitForIdle(IDLE_WAIT_MS),
    ]);
  }
}
