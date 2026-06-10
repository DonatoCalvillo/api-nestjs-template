import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IdempotencyKeyStatus } from '../../../src/modules/shared/application/idempotency/idempotency-key.status';
import { IDEMPOTENCY_REPOSITORY } from '../../../src/modules/shared/application/idempotency/idempotency.constants';
import { IIdempotencyRepository } from '../../../src/modules/shared/application/idempotency/ports/idempotency.repository.port';
import { IdempotencyKeyEntity } from '../../../src/modules/shared/infrastructure/idempotency/idempotency-key.entity';
import { TypeOrmIdempotencyRepository } from '../../../src/modules/shared/infrastructure/idempotency/typeorm-idempotency.repository';
import { truncateTables } from '../../helpers/db-cleanup';
import {
  createTestDataSource,
  getTestDataSourceOptions,
} from '../../helpers/test-data-source';

describe('TypeOrmIdempotencyRepository (integration)', () => {
  let moduleRef: TestingModule;
  let repository: IIdempotencyRepository;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestDataSourceOptions()),
        TypeOrmModule.forFeature([IdempotencyKeyEntity]),
      ],
      providers: [
        TypeOrmIdempotencyRepository,
        {
          provide: IDEMPOTENCY_REPOSITORY,
          useExisting: TypeOrmIdempotencyRepository,
        },
      ],
    }).compile();

    repository = moduleRef.get<IIdempotencyRepository>(IDEMPOTENCY_REPOSITORY);
  });

  beforeEach(async () => {
    await truncateTables(dataSource);
  });

  afterAll(async () => {
    await moduleRef.close();
    await dataSource.destroy();
  });

  it('claims, completes, and replays idempotency keys', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const input = {
      scope: 'auth:register',
      idempotencyKey: 'key-1',
      requestMethod: 'POST',
      requestPath: '/api/v1/auth/register',
      requestHash: 'hash-1',
      expiresAt,
    };

    const claim = await repository.claim(input);
    expect(claim).toEqual({ type: 'claimed' });

    await repository.complete({
      scope: input.scope,
      idempotencyKey: input.idempotencyKey,
      responseStatus: 201,
      responseBody: { success: true },
    });

    const replay = await repository.claim(input);
    expect(replay.type).toBe('replay');

    if (replay.type === 'replay') {
      expect(replay.record.status).toBe(IdempotencyKeyStatus.Completed);
      expect(replay.record.responseStatus).toBe(201);
    }
  });
});
