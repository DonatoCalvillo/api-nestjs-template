import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/application/ports/user.repository.port';
import { BaseUseCase, Result } from '../../../shared/application';
import {
  EMAIL_SENDER,
  IEmailSender,
} from '../../../shared/application/ports/email-sender.port';
import { AUTH_TOKEN_TYPES } from '../../domain/constants/auth-token.constants';
import {
  AUTH_TOKEN_REPOSITORY,
  IAuthTokenRepository,
} from '../ports/auth-token.repository.port';
import { AuthTokenService } from '../../infrastructure/services/auth-token.service';
import { TypeOrmAuthTokenRepository } from '../../infrastructure/persistence/typeorm-auth-token.repository';

export type ForgotPasswordCommand = { email: string };

@Injectable()
export class ForgotPasswordUseCase extends BaseUseCase<
  ForgotPasswordCommand,
  Result<{ success: boolean }>
> {
  constructor(
    logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: IEmailSender,
    @Inject(AUTH_TOKEN_REPOSITORY)
    private readonly authTokenRepository: IAuthTokenRepository,
    private readonly authTokenService: AuthTokenService,
  ) {
    super(logger);
  }

  protected async executeImpl(
    command: ForgotPasswordCommand,
  ): Promise<Result<{ success: boolean }>> {
    const user = await this.userRepository.findByEmail(command.email);

    if (user) {
      const token = this.authTokenService.generateToken();
      await this.authTokenRepository.save({
        userId: user.id,
        type: AUTH_TOKEN_TYPES.PASSWORD_RESET,
        tokenHash: TypeOrmAuthTokenRepository.hashToken(token),
        expiresAt: this.authTokenService.getPasswordResetExpiresAt(),
      });

      await this.emailSender.send({
        to: user.email,
        subject: 'Reset your password',
        body: `Use this token to reset your password: ${token}`,
      });
    }

    return Result.ok({ success: true });
  }
}
