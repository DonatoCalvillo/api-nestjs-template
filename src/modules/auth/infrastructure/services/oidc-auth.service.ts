import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import * as client from 'openid-client';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { DEFAULT_REGISTRATION_ROLE } from '../../domain/constants/rbac.constants';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/application/ports/user.repository.port';
import { User } from '../../../users/domain/models/user.model';
import { TokenPair, TokenService } from './token.service';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../application/ports/refresh-token.repository.port';
import {
  IUserIdentityRepository,
  USER_IDENTITY_REPOSITORY,
} from '../../application/ports/user-identity.repository.port';

type OidcProviderConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

@Injectable()
export class OidcAuthService {
  private readonly configs = new Map<string, OidcProviderConfig>();

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(USER_IDENTITY_REPOSITORY)
    private readonly userIdentityRepository: IUserIdentityRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: TokenService,
  ) {
    if (ENVIRONMENT_VARIABLES.OIDC_ENABLED) {
      this.configs.set('google', {
        issuer: ENVIRONMENT_VARIABLES.OIDC_GOOGLE_ISSUER,
        clientId: ENVIRONMENT_VARIABLES.OIDC_GOOGLE_CLIENT_ID,
        clientSecret: ENVIRONMENT_VARIABLES.OIDC_GOOGLE_CLIENT_SECRET,
        redirectUri: ENVIRONMENT_VARIABLES.OIDC_GOOGLE_REDIRECT_URI,
      });
    }
  }

  async getAuthorizationUrl(provider: string): Promise<string> {
    const config = await this.getClientConfig(provider);
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = randomBytes(16).toString('hex');

    return client.buildAuthorizationUrl(config, {
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    }).href;
  }

  async handleCallback(provider: string, code: string): Promise<TokenPair> {
    if (!code) {
      throw new Error('Missing authorization code');
    }

    const oidcConfig = this.configs.get(provider);

    if (!oidcConfig) {
      throw new Error(`OIDC provider not configured: ${provider}`);
    }

    const config = await this.getClientConfig(provider);
    const currentUrl = new URL(oidcConfig.redirectUri);
    currentUrl.searchParams.set('code', code);

    const tokens = await client.authorizationCodeGrant(config, currentUrl);
    const claims = tokens.claims();

    if (!claims?.sub) {
      throw new Error('OIDC claims missing sub');
    }

    const email =
      typeof claims.email === 'string'
        ? claims.email
        : `${claims.sub}@oidc.local`;
    const name =
      typeof claims.name === 'string' ? claims.name : email.split('@')[0];

    let userId = await this.userIdentityRepository.findUserIdByProviderSub(
      provider,
      claims.sub,
    );

    if (!userId) {
      const existing = await this.userRepository.findByEmail(email);

      if (existing) {
        userId = existing.id;
      } else {
        const user = User.create({ id: randomUUID(), name, email });
        await this.userRepository.save(user, undefined, {
          passwordHash: randomBytes(32).toString('hex'),
          roleNames: [DEFAULT_REGISTRATION_ROLE],
        });
        userId = user.id;
      }

      await this.userIdentityRepository.link({
        userId,
        provider,
        providerSub: claims.sub,
        email,
      });
    }

    const { accessToken, expiresIn } =
      await this.tokenService.signAccessToken(userId);
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.refreshTokenRepository.save({
      userId,
      tokenHash: this.tokenService.hashRefreshToken(refreshToken),
      expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private async getClientConfig(
    provider: string,
  ): Promise<client.Configuration> {
    const oidcConfig = this.configs.get(provider);

    if (!oidcConfig?.clientId || !oidcConfig.clientSecret) {
      throw new Error(`OIDC provider not configured: ${provider}`);
    }

    return client.discovery(
      new URL(oidcConfig.issuer),
      oidcConfig.clientId,
      oidcConfig.clientSecret,
    );
  }
}
