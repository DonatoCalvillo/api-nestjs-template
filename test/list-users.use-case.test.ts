import { PinoLogger } from 'nestjs-pino';
import { ListUsersUseCase } from '../src/modules/users/application/use-cases/list-users.use-case';
import { IUserRepository } from '../src/modules/users/application/ports/user.repository.port';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
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

    useCase = new ListUsersUseCase(logger, userRepository);
  });

  it('returns paginated users', async () => {
    const paginated = {
      items: [],
      total: 0,
    };
    userRepository.findMany.mockResolvedValue(paginated);

    const result = await useCase.execute({ page: 1, perPage: 10 });

    expect(userRepository.findMany).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      order: { createdAt: 'DESC' },
    });
    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(paginated);
  });
});
