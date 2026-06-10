import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { RegisterUserUseCase } from '../src/modules/auth/application/use-cases/register-user.use-case';
import { IRefreshTokenRepository } from '../src/modules/auth/application/ports/refresh-token.repository.port';
import { EmailAlreadyExistsError } from '../src/modules/auth/domain/errors/auth.errors';
import { PasswordService } from '../src/modules/auth/infrastructure/services/password.service';
import { TokenService } from '../src/modules/auth/infrastructure/services/token.service';
import { ITransactionManager } from '../src/modules/shared/application/ports/transaction-manager.port';
import { IUserRepository } from '../src/modules/users/application/ports/user.repository.port';
import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { User } from '../src/modules/users/domain/models/user.model';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

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

    passwordService = {
      compare: jest.fn(),
      hash: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    tokenService = {
      signAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      hashRefreshToken: jest.fn(),
      getRefreshTokenExpiresAt: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    refreshTokenRepository = {
      save: jest.fn(),
      findValidByHash: jest.fn(),
      findByHash: jest.fn(),
      consumeValidByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };

    const logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as PinoLogger;

    const transactionManager: ITransactionManager = {
      run: jest.fn((work) => work({} as QueryRunner)),
    };

    useCase = new RegisterUserUseCase(
      logger,
      transactionManager,
      userRepository,
      passwordService,
      tokenService,
      refreshTokenRepository,
    );
  });

  it('registers a user and returns tokens', async () => {
    userRepository.existsByEmail.mockResolvedValue(false);
    passwordService.hash.mockResolvedValue('password-hash');
    userRepository.create.mockResolvedValue(
      new User({
        id: USER_ID,
        props: {
          name: new NonEmptyStringValueObject('name', 'Alice'),
          email: new EmailValueObject('email', 'alice@example.com'),
        },
      }),
    );
    tokenService.signAccessToken.mockResolvedValue({
      accessToken: 'access-token',
      expiresIn: '15m',
    });
    tokenService.generateRefreshToken.mockReturnValue('refresh-token');
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    tokenService.getRefreshTokenExpiresAt.mockReturnValue(
      new Date('2030-01-01'),
    );

    const result = await useCase.execute({
      email: 'alice@example.com',
      password: 'secret',
      name: 'Alice',
    });

    expect(userRepository.create).toHaveBeenCalled();
    expect(refreshTokenRepository.save).toHaveBeenCalled();
    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: '15m',
    });
  });

  it('fails when email already exists', async () => {
    userRepository.existsByEmail.mockResolvedValue(true);

    const result = await useCase.execute({
      email: 'alice@example.com',
      password: 'secret',
      name: 'Alice',
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(EmailAlreadyExistsError);
  });
});
