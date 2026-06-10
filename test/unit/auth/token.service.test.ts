import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../../../src/modules/auth/infrastructure/services/token.service';

jest.mock('../../../src/configuration/environments-variables', () => ({
  ENVIRONMENT_VARIABLES: {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

describe('TokenService', () => {
  let jwtService: jest.Mocked<JwtService>;
  let tokenService: TokenService;

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    tokenService = new TokenService(jwtService);
  });

  it('signs an access token', async () => {
    jwtService.signAsync.mockResolvedValue('signed-token');

    const result = await tokenService.signAccessToken('user-1');

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 'user-1' },
      expect.objectContaining({
        secret: 'test-access-secret',
        expiresIn: '15m',
      }),
    );
    expect(result).toEqual({
      accessToken: 'signed-token',
      expiresIn: '15m',
    });
  });

  it('hashes refresh tokens with sha256', () => {
    const token = 'refresh-token-value';
    const expected = createHash('sha256').update(token).digest('hex');

    expect(tokenService.hashRefreshToken(token)).toBe(expected);
  });

  it('generates opaque refresh tokens', () => {
    const token = tokenService.generateRefreshToken();

    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(20);
  });

  it('computes refresh token expiry from env', () => {
    const before = Date.now();
    const expiresAt = tokenService.getRefreshTokenExpiresAt();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + sevenDaysMs - 1000,
    );
    expect(expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + sevenDaysMs + 1000,
    );
  });
});
