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
import { TypeOrmAuthTokenRepository } from '../../infrastructure/persistence/typeorm-auth-token.repository';

export type VerifyEmailCommand = { token: string };

@Injectable()
export class VerifyEmailUseCase extends CommandUseCase<
  VerifyEmailCommand,
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
  ) {
    super(logger, transactionManager);
  }

  protected async executeCommand(
    command: VerifyEmailCommand,
    trx?: QueryRunner,
  ): Promise<{ success: boolean }> {
    const tokenHash = TypeOrmAuthTokenRepository.hashToken(command.token);
    const record = await this.authTokenRepository.findValidByHash(
      tokenHash,
      AUTH_TOKEN_TYPES.EMAIL_VERIFY,
      trx,
    );

    if (!record) {
      throw new InvalidAuthTokenError();
    }

    await this.userRepository.markEmailVerified(record.userId, trx);
    await this.authTokenRepository.consume(record.id, trx);

    return { success: true };
  }
}
