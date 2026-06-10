import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/application/ports/user.repository.port';
import { BaseUseCase, Result } from '../../../shared/application';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';
import { InvalidMfaCodeError } from '../../domain/errors/auth.errors';
import { TotpService } from '../../infrastructure/services/totp.service';

export type MfaVerifyCommand = { user: AuthenticatedUser; code: string };

@Injectable()
export class MfaVerifyUseCase extends BaseUseCase<
  MfaVerifyCommand,
  Result<{ success: boolean }>
> {
  constructor(
    logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly totpService: TotpService,
  ) {
    super(logger);
  }

  protected async executeImpl(
    command: MfaVerifyCommand,
  ): Promise<Result<{ success: boolean }>> {
    const authData = await this.userRepository.findAuthDataById(
      command.user.id,
    );

    if (!authData?.mfaPendingSecretEncrypted) {
      throw new InvalidMfaCodeError();
    }

    const valid = this.totpService.verify(
      command.code,
      authData.mfaPendingSecretEncrypted,
    );

    if (!valid) {
      throw new InvalidMfaCodeError();
    }

    await this.userRepository.enableMfa(
      command.user.id,
      authData.mfaPendingSecretEncrypted,
    );

    return Result.ok({ success: true });
  }
}
