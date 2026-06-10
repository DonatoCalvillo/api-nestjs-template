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
  InvalidMfaCodeError,
  UnauthorizedAccessError,
} from '../../domain/errors/auth.errors';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository.port';
import {
  TokenPair,
  TokenService,
} from '../../infrastructure/services/token.service';
import { TotpService } from '../../infrastructure/services/totp.service';

export type MfaChallengeCommand = { mfaToken: string; code: string };

@Injectable()
export class MfaChallengeUseCase extends CommandUseCase<
  MfaChallengeCommand,
  TokenPair
> {
  constructor(
    logger: PinoLogger,
    @Inject(TRANSACTION_MANAGER)
    transactionManager: ITransactionManager,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly totpService: TotpService,
  ) {
    super(logger, transactionManager);
  }

  protected async executeCommand(
    command: MfaChallengeCommand,
    trx?: QueryRunner,
  ): Promise<TokenPair> {
    let userId: string;

    try {
      userId = await this.tokenService.verifyMfaToken(command.mfaToken);
    } catch {
      throw new UnauthorizedAccessError('Invalid or expired MFA token');
    }

    const authData = await this.userRepository.findAuthDataById(userId);

    if (!authData?.mfaEnabled || !authData.totpSecretEncrypted) {
      throw new InvalidMfaCodeError();
    }

    const valid = this.totpService.verify(
      command.code,
      authData.totpSecretEncrypted,
    );

    if (!valid) {
      throw new InvalidMfaCodeError();
    }

    const { accessToken, expiresIn } =
      await this.tokenService.signAccessToken(userId);
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.refreshTokenRepository.save(
      {
        userId,
        tokenHash: this.tokenService.hashRefreshToken(refreshToken),
        expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
      },
      trx,
    );

    return { accessToken, refreshToken, expiresIn };
  }
}
