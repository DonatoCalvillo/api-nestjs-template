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
import { InvalidCredentialsError } from '../../domain/errors/auth.errors';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository.port';
import { PasswordService } from '../../infrastructure/services/password.service';
import {
  TokenPair,
  TokenService,
} from '../../infrastructure/services/token.service';

export type LoginCommand = {
  email: string;
  password: string;
};

@Injectable()
export class LoginUseCase extends CommandUseCase<LoginCommand, TokenPair> {
  constructor(
    logger: PinoLogger,
    @Inject(TRANSACTION_MANAGER)
    transactionManager: ITransactionManager,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {
    super(logger, transactionManager);
  }

  protected async executeCommand(
    command: LoginCommand,
    trx?: QueryRunner,
  ): Promise<TokenPair> {
    const user = await this.userRepository.findByEmail(command.email);

    if (
      !user ||
      !(await this.passwordService.compare(command.password, user.passwordHash))
    ) {
      throw new InvalidCredentialsError();
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
