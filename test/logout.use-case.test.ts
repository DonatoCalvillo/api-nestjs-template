import { PinoLogger } from 'nestjs-pino';
import { LogoutUseCase } from '../src/modules/auth/application/use-cases/logout.use-case';
import { IRefreshTokenRepository } from '../src/modules/auth/application/ports/refresh-token.repository.port';
import { TokenService } from '../src/modules/auth/infrastructure/services/token.service';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let tokenService: jest.Mocked<TokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  beforeEach(() => {
    tokenService = {
      hashRefreshToken: jest.fn(),
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

    useCase = new LogoutUseCase(logger, tokenService, refreshTokenRepository);
  });

  it('revokes a valid refresh token', async () => {
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    refreshTokenRepository.findValidByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
      revokedAt: null,
    });

    const result = await useCase.execute({ refreshToken: 'token' });

    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1');
    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ success: true });
  });

  it('returns success when refresh token is already invalid', async () => {
    tokenService.hashRefreshToken.mockReturnValue('refresh-hash');
    refreshTokenRepository.findValidByHash.mockResolvedValue(null);

    const result = await useCase.execute({ refreshToken: 'invalid' });

    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ success: true });
  });
});
