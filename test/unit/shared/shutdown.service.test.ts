import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ShutdownService } from '../../../src/configuration/shutdown/shutdown.service';
import { ShutdownStateService } from '../../../src/configuration/shutdown/shutdown-state.service';
import { IdempotencyCleanupService } from '../../../src/modules/shared/infrastructure/idempotency/idempotency-cleanup.service';
import { OutboxRelayService } from '../../../src/modules/shared/infrastructure/outbox/outbox-relay.service';

jest.mock('../../../src/instrumentation', () => ({
  shutdownTracing: jest.fn().mockResolvedValue(undefined),
}));

import { shutdownTracing } from '../../../src/instrumentation';

describe('ShutdownService', () => {
  let shutdownService: ShutdownService;
  let shutdownState: ShutdownStateService;
  let schedulerRegistry: SchedulerRegistry;
  let outboxRelayService: { waitForIdle: jest.Mock };
  let idempotencyCleanupService: { waitForIdle: jest.Mock };
  let dataSource: { isInitialized: boolean; destroy: jest.Mock };

  beforeEach(async () => {
    outboxRelayService = {
      waitForIdle: jest.fn().mockResolvedValue(undefined),
    };
    idempotencyCleanupService = {
      waitForIdle: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      isInitialized: true,
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShutdownStateService,
        ShutdownService,
        {
          provide: SchedulerRegistry,
          useValue: {
            getCronJobs: jest.fn().mockReturnValue(
              new Map([
                [
                  'outbox',
                  {
                    stop: jest.fn(),
                  },
                ],
              ]),
            ),
          },
        },
        {
          provide: OutboxRelayService,
          useValue: outboxRelayService,
        },
        {
          provide: IdempotencyCleanupService,
          useValue: idempotencyCleanupService,
        },
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
      ],
    }).compile();

    shutdownService = module.get(ShutdownService);
    shutdownState = module.get(ShutdownStateService);
    schedulerRegistry = module.get(SchedulerRegistry);
  });

  it('marks shutting down and stops cron jobs on beforeApplicationShutdown', async () => {
    await shutdownService.beforeApplicationShutdown('SIGTERM');

    expect(shutdownState.isShuttingDown).toBe(true);
    expect(outboxRelayService.waitForIdle).toHaveBeenCalledWith(5000);
    expect(idempotencyCleanupService.waitForIdle).toHaveBeenCalledWith(5000);

    const cronJobs = schedulerRegistry.getCronJobs();
    const outboxJob = cronJobs.get('outbox');

    expect(outboxJob?.stop).toHaveBeenCalled();
  });

  it('shuts down tracing and destroys the database pool on application shutdown', async () => {
    await shutdownService.onApplicationShutdown();

    expect(shutdownTracing).toHaveBeenCalled();
    expect(dataSource.destroy).toHaveBeenCalled();
  });

  it('skips database destroy when the data source is not initialized', async () => {
    dataSource.isInitialized = false;

    await shutdownService.onApplicationShutdown();

    expect(dataSource.destroy).not.toHaveBeenCalled();
  });
});
