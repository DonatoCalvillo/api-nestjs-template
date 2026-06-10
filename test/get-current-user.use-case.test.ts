import { PinoLogger } from 'nestjs-pino';
import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { GetCurrentUserUseCase } from '../src/modules/users/application/use-cases/get-current-user.use-case';
import { IUserRepository } from '../src/modules/users/application/ports/user.repository.port';
import { NotFoundError } from '../src/modules/shared/domain/errors/not-found.error';
import { User } from '../src/modules/users/domain/models/user.model';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findByIdWithRolesAndPermissions: jest.fn(),
      existsByEmail: jest.fn(),
      create: jest.fn(),
      findRoleIdsByNames: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findMany: jest.fn(),
    };

    const logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as PinoLogger;

    useCase = new GetCurrentUserUseCase(logger, userRepository);
  });

  it('returns current user profile', async () => {
    userRepository.findByIdWithRolesAndPermissions.mockResolvedValue({
      id: USER_ID,
      email: 'alice@example.com',
      name: 'Alice',
      roles: ['user'],
      permissions: ['users:read'],
    });
    userRepository.findById.mockResolvedValue(
      new User({
        id: USER_ID,
        props: {
          name: new NonEmptyStringValueObject('name', 'Alice'),
          email: new EmailValueObject('email', 'alice@example.com'),
        },
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 1,
      }),
    );

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      id: USER_ID,
      email: 'alice@example.com',
      name: 'Alice',
      roles: ['user'],
      permissions: ['users:read'],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      version: 1,
    });
  });

  it('fails when user is not found', async () => {
    userRepository.findByIdWithRolesAndPermissions.mockResolvedValue(null);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
