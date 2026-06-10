import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { LoginUseCase } from '../../../src/modules/auth/application/use-cases/login.use-case';
import { IRefreshTokenRepository } from '../../../src/modules/auth/application/ports/refresh-token.repository.port';
import { InvalidCredentialsError } from '../../../src/modules/auth/domain/errors/auth.errors';
import { PasswordService } from '../../../src/modules/auth/infrastructure/services/password.service';
import { TokenService } from '../../../src/modules/auth/infrastructure/services/token.service';
import { ITransactionManager } from '../../../src/modules/shared/application/ports/transaction-manager.port';
import { IUserRepository } from '../../../src/modules/users/application/ports/user.repository.port';

import { createMockUserRepository } from '../../helpers/mock-user-repository';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();

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

    useCase = new LoginUseCase(
      logger,
      transactionManager,
      userRepository,
      passwordService,
      tokenService,
      refreshTokenRepository,
    );
  });

  it('returns tokens for valid credentials', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      roles: ['user'],
      permissions: ['users:read'],
      passwordHash: 'hash',
      emailVerifiedAt: new Date(),
      mfaEnabled: false,
      totpSecretEncrypted: null,
      mfaPendingSecretEncrypted: null,
    });
    passwordService.compare.mockResolvedValue(true);
    tokenService.signAccessToken.mockResolvedValue({
      accessToken: 'access-token',
      expiresIn: '15m',
    });
    tokenService.generateRefreshToken.mockReturnValue('refresh-token');
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    tokenService.getRefreshTokenExpiresAt.mockReturnValue(
      new Date('2030-01-01'),
    );
    refreshTokenRepository.save.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
      revokedAt: null,
    });

    const result = await useCase.execute({
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: '15m',
    });
  });

  it('fails for invalid credentials', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute({
      email: 'alice@example.com',
      password: 'wrong-password',
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidCredentialsError);
  });
});
