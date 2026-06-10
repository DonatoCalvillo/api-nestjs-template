import { PinoLogger } from 'nestjs-pino';
import {
  DomainEventStagingService,
  IDomainEventDispatcher,
} from '../src/modules/shared/application/events';
import { ITransactionManager } from '../src/modules/shared/application/ports/transaction-manager.port';
import { CommandUseCase } from '../src/modules/shared/application/use-cases/command.use-case';
import {
  AggregateRoot,
  BaseModelParams,
} from '../src/modules/shared/domain/model';
import { IDomainEvent } from '../src/modules/shared/domain/events';

class CommandEvent implements IDomainEvent {
  static readonly eventName = 'command.executed';
  readonly eventName = CommandEvent.eventName;
  readonly occurredAt = new Date();
}

type CommandProps = { label: string };

class CommandAggregate extends AggregateRoot<CommandProps> {
  constructor(params: BaseModelParams<CommandProps>) {
    super(params);
  }

  markExecuted(): void {
    this.addDomainEvent(new CommandEvent());
  }
}

class TestCommandUseCase extends CommandUseCase<void, CommandAggregate> {
  constructor(
    logger: PinoLogger,
    transactionManager: ITransactionManager | undefined,
    staging: DomainEventStagingService,
    dispatcher: IDomainEventDispatcher,
    private readonly aggregate: CommandAggregate,
    private readonly shouldFail = false,
  ) {
    super(logger, transactionManager);
    this.domainEventStaging = staging;
    this.domainEventDispatcher = dispatcher;
  }

  protected requiresTransaction(): boolean {
    return true;
  }

  protected async executeCommand(): Promise<CommandAggregate> {
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

describe('CommandUseCase domain events', () => {
  let logger: PinoLogger;
  let staging: DomainEventStagingService;
  let dispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(() => {
    logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as PinoLogger;

    staging = {
      stageFrom: jest.fn(),
      drain: jest.fn().mockReturnValue([new CommandEvent()]),
    } as unknown as DomainEventStagingService;

    dispatcher = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('stages events from the command result and dispatches after commit', async () => {
    const aggregate = new CommandAggregate({
      id: '550e8400-e29b-41d4-a716-446655440010',
      props: { label: 'test' },
    });

    const useCase = new TestCommandUseCase(
      logger,
      new FakeTransactionManager(),
      staging,
      dispatcher,
      aggregate,
    );

    const result = await useCase.execute(undefined);

    expect(result.isSuccess).toBe(true);
    expect(staging.stageFrom).toHaveBeenCalledWith(aggregate);
    expect(staging.drain).toHaveBeenCalledTimes(1);
    expect(dispatcher.dispatch).toHaveBeenCalledWith([
      expect.any(CommandEvent),
    ]);
  });

  it('does not dispatch when the transaction rolls back', async () => {
    const aggregate = new CommandAggregate({
      id: '550e8400-e29b-41d4-a716-446655440011',
      props: { label: 'test' },
    });

    const useCase = new TestCommandUseCase(
      logger,
      new FakeTransactionManager(true),
      staging,
      dispatcher,
      aggregate,
    );

    await expect(useCase.execute(undefined)).rejects.toThrow(
      'transaction rollback',
    );

    expect(staging.drain).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when the command fails inside the transaction', async () => {
    const aggregate = new CommandAggregate({
      id: '550e8400-e29b-41d4-a716-446655440012',
      props: { label: 'test' },
    });

    const useCase = new TestCommandUseCase(
      logger,
      new FakeTransactionManager(),
      staging,
      dispatcher,
      aggregate,
      true,
    );

    await expect(useCase.execute(undefined)).rejects.toThrow('command failed');

    expect(staging.drain).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('skips dispatch when no events were staged', async () => {
    staging.drain = jest.fn().mockReturnValue([]);

    const aggregate = new CommandAggregate({
      id: '550e8400-e29b-41d4-a716-446655440013',
      props: { label: 'test' },
    });

    const useCase = new TestCommandUseCase(
      logger,
      new FakeTransactionManager(),
      staging,
      dispatcher,
      aggregate,
    );

    await useCase.execute(undefined);

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });
});
