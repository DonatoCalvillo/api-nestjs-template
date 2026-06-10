import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import {
  DomainEventStagingService,
  IDomainEventDispatcher,
} from '../src/modules/shared/application/events';
import { OutboxService } from '../src/modules/shared/application/outbox/outbox.service';
import { ITransactionManager } from '../src/modules/shared/application/ports/transaction-manager.port';
import { CommandUseCase } from '../src/modules/shared/application/use-cases/command.use-case';
import {
  AggregateRoot,
  BaseModelParams,
} from '../src/modules/shared/domain/model';
import { IDomainEvent } from '../src/modules/shared/domain/events';

class OutboxCommandEvent implements IDomainEvent {
  static readonly eventName = 'outbox.command.executed';
  readonly eventName = OutboxCommandEvent.eventName;
  readonly occurredAt = new Date();
}

type OutboxCommandProps = { label: string };

class OutboxCommandAggregate extends AggregateRoot<OutboxCommandProps> {
  constructor(params: BaseModelParams<OutboxCommandProps>) {
    super(params);
  }

  markExecuted(): void {
    this.addDomainEvent(new OutboxCommandEvent());
  }
}

class TestOutboxCommandUseCase extends CommandUseCase<
  void,
  OutboxCommandAggregate
> {
  constructor(
    logger: PinoLogger,
    transactionManager: ITransactionManager | undefined,
    staging: DomainEventStagingService,
    dispatcher: IDomainEventDispatcher,
    outboxService: OutboxService,
    private readonly aggregate: OutboxCommandAggregate,
    private readonly shouldFail = false,
  ) {
    super(logger, transactionManager);
    this.domainEventStaging = staging;
    this.domainEventDispatcher = dispatcher;
    this.outboxService = outboxService;
  }

  protected requiresTransaction(): boolean {
    return true;
  }

  protected async executeCommand(): Promise<OutboxCommandAggregate> {
    if (this.shouldFail) {
      throw new Error('command failed');
    }

    this.aggregate.markExecuted();
    return this.aggregate;
  }
}

class FakeTransactionManager implements ITransactionManager {
  constructor(private readonly shouldCommitFail = false) {}

  async run<T>(work: (trx: QueryRunner) => Promise<T>): Promise<T> {
    if (this.shouldCommitFail) {
      throw new Error('transaction rollback');
    }

    return work({} as QueryRunner);
  }
}

describe('CommandUseCase outbox', () => {
  let logger: PinoLogger;
  let staging: DomainEventStagingService;
  let dispatcher: jest.Mocked<IDomainEventDispatcher>;
  let outboxService: jest.Mocked<OutboxService>;

  beforeEach(() => {
    logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as PinoLogger;

    staging = {
      stageFrom: jest.fn(),
      drain: jest.fn().mockReturnValue([new OutboxCommandEvent()]),
    } as unknown as DomainEventStagingService;

    dispatcher = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    };

    outboxService = {
      persistStaged: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<OutboxService>;
  });

  it('persists staged events inside the transaction before commit', async () => {
    const aggregate = new OutboxCommandAggregate({
      id: '550e8400-e29b-41d4-a716-446655440020',
      props: { label: 'test' },
    });

    const useCase = new TestOutboxCommandUseCase(
      logger,
      new FakeTransactionManager(),
      staging,
      dispatcher,
      outboxService,
      aggregate,
    );

    const result = await useCase.execute(undefined);

    expect(result.isSuccess).toBe(true);
    expect(staging.stageFrom).toHaveBeenCalledWith(aggregate);
    expect(outboxService.persistStaged).toHaveBeenCalledWith({});
    expect(staging.drain).toHaveBeenCalledTimes(1);
  });

  it('does not persist outbox rows when the transaction rolls back', async () => {
    const aggregate = new OutboxCommandAggregate({
      id: '550e8400-e29b-41d4-a716-446655440021',
      props: { label: 'test' },
    });

    const useCase = new TestOutboxCommandUseCase(
      logger,
      new FakeTransactionManager(true),
      staging,
      dispatcher,
      outboxService,
      aggregate,
    );

    await expect(useCase.execute(undefined)).rejects.toThrow(
      'transaction rollback',
    );

    expect(outboxService.persistStaged).not.toHaveBeenCalled();
  });

  it('does not persist outbox rows when the command fails', async () => {
    const aggregate = new OutboxCommandAggregate({
      id: '550e8400-e29b-41d4-a716-446655440022',
      props: { label: 'test' },
    });

    const useCase = new TestOutboxCommandUseCase(
      logger,
      new FakeTransactionManager(),
      staging,
      dispatcher,
      outboxService,
      aggregate,
      true,
    );

    await expect(useCase.execute(undefined)).rejects.toThrow('command failed');

    expect(outboxService.persistStaged).not.toHaveBeenCalled();
  });
});
