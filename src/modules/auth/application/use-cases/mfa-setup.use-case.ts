import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/application/ports/user.repository.port';
import { BaseUseCase, Result } from '../../../shared/application';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';
import { TotpService } from '../../infrastructure/services/totp.service';

export type MfaSetupCommand = { user: AuthenticatedUser };

export type MfaSetupResult = {
  otpauthUri: string;
  qrCodeDataUrl: string;
};

@Injectable()
export class MfaSetupUseCase extends BaseUseCase<
  MfaSetupCommand,
  Result<MfaSetupResult>
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
    command: MfaSetupCommand,
  ): Promise<Result<MfaSetupResult>> {
    const secret = this.totpService.generateSecret();
    const encrypted = this.totpService.encryptSecret(secret);

    await this.userRepository.setMfaPendingSecret(command.user.id, encrypted);

    const otpauthUri = this.totpService.buildOtpAuthUri(
      command.user.email,
      secret,
    );
    const qrCodeDataUrl = await this.totpService.buildQrCodeDataUrl(otpauthUri);

    return Result.ok({ otpauthUri, qrCodeDataUrl });
  }
}
