import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { UpdateUserUseCase } from '../../../src/modules/users/application/use-cases/update-user.use-case';
import { IUserRepository } from '../../../src/modules/users/application/ports/user.repository.port';
import { User } from '../../../src/modules/users/domain/models/user.model';
import {
  EmailAlreadyExistsError,
  ForbiddenAccessError,
} from '../../../src/modules/auth/domain/errors/auth.errors';
import { ConcurrencyConflictError } from '../../../src/modules/shared/domain/errors/concurrency-conflict.error';
import { NotFoundError } from '../../../src/modules/shared/domain/errors/not-found.error';
import { ITransactionManager } from '../../../src/modules/shared/application/ports/transaction-manager.port';

import { createMockUserRepository } from '../../helpers/mock-user-repository';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const createUser = (overrides?: Partial<{ version: number; email: string }>) =>
  new User({
    id: USER_ID,
    props: {
      name: new NonEmptyStringValueObject('name', 'Alice'),
      email: new EmailValueObject(
        'email',
        overrides?.email ?? 'alice@example.com',
      ),
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    version: overrides?.version ?? 1,
  });

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();

    const logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as PinoLogger;

    const transactionManager: ITransactionManager = {
      run: jest.fn((work) => work({} as QueryRunner)),
    };

    useCase = new UpdateUserUseCase(logger, transactionManager, userRepository);
  });

  it('updates user when actor is owner', async () => {
    const user = createUser();
    const updated = createUser({ version: 1 });
    userRepository.findById.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(updated);

    const result = await useCase.execute({
      id: USER_ID,
      name: 'Alice Updated',
      version: 1,
      actor: {
        id: USER_ID,
        email: 'alice@example.com',
        name: 'Alice',
        roles: ['user'],
        permissions: [],
      },
    });

    expect(userRepository.save).toHaveBeenCalled();
    expect(result.isSuccess).toBe(true);
  });

  it('fails when actor is neither owner nor has users:write', async () => {
    const result = await useCase.execute({
      id: OTHER_USER_ID,
      name: 'Hacker',
      version: 1,
      actor: {
        id: USER_ID,
        email: 'alice@example.com',
        name: 'Alice',
        roles: ['user'],
        permissions: [],
      },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ForbiddenAccessError);
  });

  it('fails when user is not found', async () => {
    userRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      id: USER_ID,
      name: 'Alice',
      version: 1,
      actor: {
        id: USER_ID,
        email: 'alice@example.com',
        name: 'Alice',
        roles: ['user'],
        permissions: [],
      },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('fails on version conflict', async () => {
    userRepository.findById.mockResolvedValue(createUser({ version: 2 }));

    const result = await useCase.execute({
      id: USER_ID,
      name: 'Alice',
      version: 1,
      actor: {
        id: USER_ID,
        email: 'alice@example.com',
        name: 'Alice',
        roles: ['user'],
        permissions: [],
      },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ConcurrencyConflictError);
  });

  it('fails when email already exists', async () => {
    userRepository.findById.mockResolvedValue(createUser());
    userRepository.existsByEmail.mockResolvedValue(true);

    const result = await useCase.execute({
      id: USER_ID,
      email: 'taken@example.com',
      version: 1,
      actor: {
        id: USER_ID,
        email: 'alice@example.com',
        name: 'Alice',
        roles: ['user'],
        permissions: [],
      },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(EmailAlreadyExistsError);
  });
});
