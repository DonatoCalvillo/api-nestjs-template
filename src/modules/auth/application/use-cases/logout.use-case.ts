import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository.port';
import { CommandUseCase } from '../../../shared/application/use-cases/command.use-case';
import { TokenService } from '../../infrastructure/services/token.service';

export type LogoutCommand = {
  refreshToken: string;
};

export type LogoutResult = {
  success: boolean;
};

@Injectable()
export class LogoutUseCase extends CommandUseCase<LogoutCommand, LogoutResult> {
  constructor(
    logger: PinoLogger,
    private readonly tokenService: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {
    super(logger);
  }

  protected requiresTransaction(): boolean {
    return false;
  }

  protected async executeCommand(
    command: LogoutCommand,
  ): Promise<LogoutResult> {
    const tokenHash = this.tokenService.hashRefreshToken(command.refreshToken);
    const stored = await this.refreshTokenRepository.findValidByHash(tokenHash);

    if (stored) {
      await this.refreshTokenRepository.revoke(stored.id);
    }

    return { success: true };
  }
}
