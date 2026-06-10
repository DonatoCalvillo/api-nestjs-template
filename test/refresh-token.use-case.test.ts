import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { RefreshTokenUseCase } from '../src/modules/auth/application/use-cases/refresh-token.use-case';
import { IRefreshTokenRepository } from '../src/modules/auth/application/ports/refresh-token.repository.port';
import {
  InvalidRefreshTokenError,
  RefreshTokenReuseDetectedError,
} from '../src/modules/auth/domain/errors/auth.errors';
import { TokenService } from '../src/modules/auth/infrastructure/services/token.service';
import { ITransactionManager } from '../src/modules/shared/application/ports/transaction-manager.port';
import { IUserRepository } from '../src/modules/users/application/ports/user.repository.port';

import { createMockUserRepository } from './helpers/mock-user-repository';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let logger: jest.Mocked<PinoLogger>;

  beforeEach(() => {
    userRepository = createMockUserRepository();

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

    logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    const transactionManager: ITransactionManager = {
      run: jest.fn((work) => work({} as QueryRunner)),
    };

    useCase = new RefreshTokenUseCase(
      logger,
      transactionManager,
      userRepository,
      tokenService,
      refreshTokenRepository,
    );
  });

  it('rotates refresh token and returns a new token pair', async () => {
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    refreshTokenRepository.findByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
      revokedAt: null,
    });
    refreshTokenRepository.consumeValidByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
      revokedAt: new Date(),
    });
    userRepository.findByIdWithRolesAndPermissions.mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      roles: ['user'],
      permissions: ['users:read'],
    });
    tokenService.signAccessToken.mockResolvedValue({
      accessToken: 'new-access-token',
      expiresIn: '15m',
    });
    tokenService.generateRefreshToken.mockReturnValue('new-refresh-token');
    tokenService.getRefreshTokenExpiresAt.mockReturnValue(
      new Date('2030-01-01'),
    );

    const result = await useCase.execute({ refreshToken: 'old-refresh-token' });

    expect(refreshTokenRepository.consumeValidByHash).toHaveBeenCalledWith(
      'refresh-hash',
      expect.anything(),
    );
    expect(refreshTokenRepository.save).toHaveBeenCalled();
    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: '15m',
    });
  });

  it('fails when refresh token is invalid', async () => {
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    refreshTokenRepository.findByHash.mockResolvedValue(null);

    const result = await useCase.execute({ refreshToken: 'invalid-token' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidRefreshTokenError);
  });

  it('revokes all sessions when a revoked refresh token is reused', async () => {
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    refreshTokenRepository.findByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
      revokedAt: new Date('2026-01-01'),
    });

    const result = await useCase.execute({ refreshToken: 'reused-token' });

    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      { userId: 'user-1' },
      'Refresh token reuse detected; all sessions revoked',
    );
    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(RefreshTokenReuseDetectedError);
  });

  it('fails when concurrent consume loses the race', async () => {
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    refreshTokenRepository.findByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
      revokedAt: null,
    });
    refreshTokenRepository.consumeValidByHash.mockResolvedValue(null);

    const result = await useCase.execute({ refreshToken: 'old-refresh-token' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidRefreshTokenError);
  });
});
