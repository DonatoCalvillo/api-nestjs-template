import { PinoLogger } from 'nestjs-pino';
import { RefreshTokenUseCase } from '../src/modules/auth/application/use-cases/refresh-token.use-case';
import { IUserRepository } from '../src/modules/users/application/ports/user.repository.port';
import { IRefreshTokenRepository } from '../src/modules/auth/application/ports/refresh-token.repository.port';
import { TokenService } from '../src/modules/auth/infrastructure/services/token.service';
import { InvalidRefreshTokenError } from '../src/modules/auth/domain/errors/auth.errors';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findByIdWithRolesAndPermissions: jest.fn(),
      existsByEmail: jest.fn(),
      create: jest.fn(),
      findRoleIdsByNames: jest.fn(),
    };

    tokenService = {
      signAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      hashRefreshToken: jest.fn(),
      getRefreshTokenExpiresAt: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    refreshTokenRepository = {
      save: jest.fn(),
      findValidByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };

    const logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as PinoLogger;

    useCase = new RefreshTokenUseCase(
      logger,
      userRepository,
      tokenService,
      refreshTokenRepository,
    );
  });

  it('rotates refresh token and returns a new token pair', async () => {
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    refreshTokenRepository.findValidByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
      revokedAt: null,
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

    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1');
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
    refreshTokenRepository.findValidByHash.mockResolvedValue(null);

    const result = await useCase.execute({ refreshToken: 'invalid-token' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidRefreshTokenError);
  });
});
