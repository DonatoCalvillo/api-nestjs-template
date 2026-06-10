import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/application/ports/user.repository.port';
import { EmailAlreadyExistsError } from '../../domain/errors/auth.errors';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository.port';
import { CommandUseCase } from '../../../shared/application/use-cases/command.use-case';
import { PasswordService } from '../../infrastructure/services/password.service';
import {
  TokenPair,
  TokenService,
} from '../../infrastructure/services/token.service';

export type RegisterUserCommand = {
  email: string;
  password: string;
  name: string;
};

@Injectable()
export class RegisterUserUseCase extends CommandUseCase<
  RegisterUserCommand,
  TokenPair
> {
  constructor(
    logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
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
    command: RegisterUserCommand,
  ): Promise<TokenPair> {
    if (await this.userRepository.existsByEmail(command.email)) {
      throw new EmailAlreadyExistsError();
    }

    const passwordHash = await this.passwordService.hash(command.password);
    const user = await this.userRepository.create({
      email: command.email,
      name: command.name,
      passwordHash,
      roleNames: ['user'],
    });

    const { accessToken, expiresIn } = await this.tokenService.signAccessToken(
      user.id,
    );
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: this.tokenService.hashRefreshToken(refreshToken),
      expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
    });

    return { accessToken, refreshToken, expiresIn };
  }
}
