import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OutboxMessageStatus } from '../../../src/modules/shared/application/outbox/outbox-message.status';
import { OUTBOX_REPOSITORY } from '../../../src/modules/shared/application/outbox/outbox.constants';
import { IOutboxRepository } from '../../../src/modules/shared/application/outbox/ports/outbox.repository.port';
import { OutboxMessageEntity } from '../../../src/modules/shared/infrastructure/outbox/outbox-message.entity';
import { TypeOrmOutboxRepository } from '../../../src/modules/shared/infrastructure/outbox/typeorm-outbox.repository';
import { truncateTables } from '../../helpers/db-cleanup';
import {
  createTestDataSource,
  getTestDataSourceOptions,
} from '../../helpers/test-data-source';

describe('TypeOrmOutboxRepository (integration)', () => {
  let moduleRef: TestingModule;
  let repository: IOutboxRepository;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestDataSourceOptions()),
        TypeOrmModule.forFeature([OutboxMessageEntity]),
      ],
      providers: [
        TypeOrmOutboxRepository,
        {
          provide: OUTBOX_REPOSITORY,
          useExisting: TypeOrmOutboxRepository,
        },
      ],
    }).compile();

    repository = moduleRef.get<IOutboxRepository>(OUTBOX_REPOSITORY);
  });

  beforeEach(async () => {
    await truncateTables(dataSource);
  });

  afterAll(async () => {
    await moduleRef.close();
    await dataSource.destroy();
  });

  it('inserts and claims pending outbox messages', async () => {
    await repository.insertMany([
      {
        eventName: 'UserRegistered',
        aggregateType: 'User',
        aggregateId: 'user-1',
        payload: { email: 'user@example.com' },
        status: OutboxMessageStatus.Pending,
      },
    ]);

    const claimed = await repository.claimPendingBatch(10);

    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({
      eventName: 'UserRegistered',
      aggregateType: 'User',
      aggregateId: 'user-1',
      payload: { email: 'user@example.com' },
    });
  });

  it('counts outbox messages by status', async () => {
    await repository.insertMany([
      {
        eventName: 'UserRegistered',
        aggregateType: 'User',
        aggregateId: 'user-1',
        payload: { email: 'user@example.com' },
        status: OutboxMessageStatus.Pending,
      },
      {
        eventName: 'UserRegistered',
        aggregateType: 'User',
        aggregateId: 'user-2',
        payload: { email: 'other@example.com' },
        status: OutboxMessageStatus.Failed,
      },
    ]);

    expect(await repository.countByStatus(OutboxMessageStatus.Pending)).toBe(1);
    expect(await repository.countByStatus(OutboxMessageStatus.Failed)).toBe(1);
    expect(await repository.countByStatus(OutboxMessageStatus.Processing)).toBe(
      0,
    );
  });
});
