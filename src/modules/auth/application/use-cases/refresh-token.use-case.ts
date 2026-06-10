import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/application/ports/user.repository.port';
import {
  CommandUseCase,
  ITransactionManager,
  TRANSACTION_MANAGER,
} from '../../../shared/application';
import {
  InvalidRefreshTokenError,
  RefreshTokenReuseDetectedError,
} from '../../domain/errors/auth.errors';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository.port';
import {
  TokenPair,
  TokenService,
} from '../../infrastructure/services/token.service';

export type RefreshTokenCommand = {
  refreshToken: string;
};

@Injectable()
export class RefreshTokenUseCase extends CommandUseCase<
  RefreshTokenCommand,
  TokenPair
> {
  constructor(
    logger: PinoLogger,
    @Inject(TRANSACTION_MANAGER)
    transactionManager: ITransactionManager,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly tokenService: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {
    super(logger, transactionManager);
  }

  protected async executeCommand(
    command: RefreshTokenCommand,
    trx?: QueryRunner,
  ): Promise<TokenPair> {
    const tokenHash = this.tokenService.hashRefreshToken(command.refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!stored) {
      throw new InvalidRefreshTokenError();
    }

    if (stored.revokedAt !== null) {
      await this.refreshTokenRepository.revokeAllForUser(stored.userId, trx);
      this.logger.warn(
        { userId: stored.userId },
        'Refresh token reuse detected; all sessions revoked',
      );
      throw new RefreshTokenReuseDetectedError();
    }

    if (stored.expiresAt <= new Date()) {
      throw new InvalidRefreshTokenError();
    }

    const consumed = await this.refreshTokenRepository.consumeValidByHash(
      tokenHash,
      trx,
    );

    if (!consumed) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.userRepository.findByIdWithRolesAndPermissions(
      consumed.userId,
    );

    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    const { accessToken, expiresIn } = await this.tokenService.signAccessToken(
      user.id,
    );
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.refreshTokenRepository.save(
      {
        userId: user.id,
        tokenHash: this.tokenService.hashRefreshToken(refreshToken),
        expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
      },
      trx,
    );

    return { accessToken, refreshToken, expiresIn };
  }
}
