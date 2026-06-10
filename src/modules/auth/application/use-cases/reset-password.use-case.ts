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
import { InvalidAuthTokenError } from '../../domain/errors/auth.errors';
import { AUTH_TOKEN_TYPES } from '../../domain/constants/auth-token.constants';
import {
  AUTH_TOKEN_REPOSITORY,
  IAuthTokenRepository,
} from '../ports/auth-token.repository.port';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository.port';
import { PasswordService } from '../../infrastructure/services/password.service';
import { TypeOrmAuthTokenRepository } from '../../infrastructure/persistence/typeorm-auth-token.repository';

export type ResetPasswordCommand = { token: string; newPassword: string };

@Injectable()
export class ResetPasswordUseCase extends CommandUseCase<
  ResetPasswordCommand,
  { success: boolean }
> {
  constructor(
    logger: PinoLogger,
    @Inject(TRANSACTION_MANAGER)
    transactionManager: ITransactionManager,
    @Inject(AUTH_TOKEN_REPOSITORY)
    private readonly authTokenRepository: IAuthTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly passwordService: PasswordService,
  ) {
    super(logger, transactionManager);
  }

  protected async executeCommand(
    command: ResetPasswordCommand,
    trx?: QueryRunner,
  ): Promise<{ success: boolean }> {
    const tokenHash = TypeOrmAuthTokenRepository.hashToken(command.token);
    const record = await this.authTokenRepository.findValidByHash(
      tokenHash,
      AUTH_TOKEN_TYPES.PASSWORD_RESET,
      trx,
    );

    if (!record) {
      throw new InvalidAuthTokenError();
    }

    const passwordHash = await this.passwordService.hash(command.newPassword);
    await this.userRepository.updatePasswordHash(
      record.userId,
      passwordHash,
      trx,
    );
    await this.authTokenRepository.consume(record.id, trx);
    await this.refreshTokenRepository.revokeAllForUser(record.userId, trx);

    return { success: true };
  }
}
