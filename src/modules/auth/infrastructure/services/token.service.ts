import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type AccessTokenPayload = {
  sub: string;
};

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async signAccessToken(
    userId: string,
  ): Promise<{ accessToken: string; expiresIn: string }> {
    const expiresIn = ENVIRONMENT_VARIABLES.JWT_ACCESS_EXPIRES_IN;
    const accessToken = await this.jwtService.signAsync(
      { sub: userId } satisfies AccessTokenPayload,
      {
        secret: ENVIRONMENT_VARIABLES.JWT_ACCESS_SECRET,
        expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    return { accessToken, expiresIn };
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiresAt(): Date {
    const expiresIn = ENVIRONMENT_VARIABLES.JWT_REFRESH_EXPIRES_IN;
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}
