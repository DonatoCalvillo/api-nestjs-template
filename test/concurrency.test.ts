import { HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DataSource,
  Entity,
  OptimisticLockVersionMismatchError,
  Repository,
} from 'typeorm';
import { IMapper } from '../src/modules/shared/application/mappers';
import { BaseModel, BaseModelParams } from '../src/modules/shared/domain/model';
import { ConcurrencyConflictError } from '../src/modules/shared/domain/errors/concurrency-conflict.error';
import { DatabaseError } from '../src/modules/shared/domain/errors/database';
import { ErrorCodes } from '../src/modules/shared/domain/enum/error-codes';
import {
  BaseEntity,
  TypeOrmBaseRepository,
} from '../src/modules/shared/infrastructure/persistence';

@Entity('test_items')
class TestEntity extends BaseEntity {}

type TestProps = Record<string, never>;

class TestModel extends BaseModel<TestProps> {
  constructor(params: BaseModelParams<TestProps>) {
    super(params);
  }
}

class TestMapper implements IMapper<TestModel, TestEntity> {
  toModel(entity: TestEntity): TestModel {
    return new TestModel({
      id: entity.id,
      props: {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      version: entity.version,
    });
  }

  toPersistence(model: TestModel): TestEntity {
    const entity = new TestEntity();
    entity.id = model.id;
    entity.createdAt = model.createdAt ?? new Date();
    entity.updatedAt = model.updatedAt ?? new Date();

    if (model.version !== null) {
      entity.version = model.version;
    }

    return entity;
  }
}

class TestRepository extends TypeOrmBaseRepository<TestModel, TestEntity> {
  protected entityClass() {
    return TestEntity;
  }
}

describe('ConcurrencyConflictError', () => {
  it('maps to HTTP 409 with E-CONCURRENCY code', () => {
    const error = new ConcurrencyConflictError();
    const httpException = error.toHttpException();

    expect(httpException).toBeInstanceOf(HttpException);
    expect(httpException.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(httpException.getResponse()).toEqual({
      success: false,
      message: expect.stringContaining('modified by another request'),
      code: ErrorCodes.CONCURRENCY_CONFLICT,
    });
  });

  it('includes entity id in message when provided', () => {
    const error = new ConcurrencyConflictError('entity-id');
    expect(error.message).toContain('entity-id');
  });
});

describe('BaseModel version', () => {
  it('accepts a non-negative version', () => {
    const model = new TestModel({
      id: randomUUID(),
      props: {},
      version: 3,
    });

    expect(model.version).toBe(3);
    expect(model.toJSON().version).toBe(3);
  });

  it('defaults version to null for new aggregates', () => {
    const model = new TestModel({
      id: randomUUID(),
      props: {},
    });

    expect(model.version).toBeNull();
  });

  it('rejects negative version values', () => {
    expect(
      () =>
        new TestModel({
          id: randomUUID(),
          props: {},
          version: -1,
        }),
    ).toThrow();
  });
});

describe('TypeOrmBaseRepository optimistic locking', () => {
  let mockRepo: jest.Mocked<
    Pick<
      Repository<TestEntity>,
      'save' | 'delete' | 'softDelete' | 'softRemove' | 'remove'
    >
  >;
  let repository: TestRepository;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      softRemove: jest.fn(),
      remove: jest.fn(),
    };

    const dataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
    } as unknown as DataSource;

    repository = new TestRepository(
      new TestMapper(),
      dataSource,
      TestRepository.name,
    );
  });

  it('maps OptimisticLockVersionMismatchError to ConcurrencyConflictError on save', async () => {
    mockRepo.save.mockRejectedValue(
      new OptimisticLockVersionMismatchError('TestEntity', 1, 2),
    );

    const model = new TestModel({
      id: randomUUID(),
      props: {},
      version: 1,
    });

    await expect(repository.save(model)).rejects.toThrow(
      ConcurrencyConflictError,
    );
    await expect(repository.save(model)).rejects.not.toThrow(DatabaseError);
  });

  it('returns saved model with incremented version on successful save', async () => {
    const id = randomUUID();
    const now = new Date();
    const savedEntity = new TestEntity();
    savedEntity.id = id;
    savedEntity.createdAt = now;
    savedEntity.updatedAt = now;
    savedEntity.version = 4;

    mockRepo.save.mockResolvedValue(savedEntity);

    const model = new TestModel({
      id,
      props: {},
      createdAt: now,
      updatedAt: now,
      version: 3,
    });

    const result = await repository.save(model);

    expect(result.version).toBe(4);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('throws ConcurrencyConflictError when version-aware delete affects zero rows', async () => {
    mockRepo.delete.mockResolvedValue({
      affected: 0,
      raw: [],
    });

    const model = new TestModel({
      id: randomUUID(),
      props: {},
      version: 2,
    });

    await expect(repository.delete(model)).rejects.toThrow(
      ConcurrencyConflictError,
    );
    expect(mockRepo.delete).toHaveBeenCalledWith({
      id: model.id,
      version: 2,
    });
  });

  it('throws ConcurrencyConflictError when version-aware softDelete affects zero rows', async () => {
    mockRepo.softDelete.mockResolvedValue({
      affected: 0,
      generatedMaps: [],
      raw: [],
    });

    const model = new TestModel({
      id: randomUUID(),
      props: {},
      version: 2,
    });

    await expect(repository.softDelete(model)).rejects.toThrow(
      ConcurrencyConflictError,
    );
    expect(mockRepo.softDelete).toHaveBeenCalledWith({
      id: model.id,
      version: 2,
    });
  });
});
