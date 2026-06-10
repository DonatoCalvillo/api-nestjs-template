import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { User } from '../../../users/domain/models/user.model';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/application/ports/user.repository.port';
import {
  CommandUseCase,
  ITransactionManager,
  TRANSACTION_MANAGER,
} from '../../../shared/application';
import { DEFAULT_REGISTRATION_ROLE } from '../../domain/constants/rbac.constants';
import { EmailAlreadyExistsError } from '../../domain/errors/auth.errors';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository.port';
import { PasswordService } from '../../infrastructure/services/password.service';
import { TokenService } from '../../infrastructure/services/token.service';

export type RegisterUserCommand = {
  email: string;
  password: string;
  name: string;
};

export type RegisterUserResult = {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

@Injectable()
export class RegisterUserUseCase extends CommandUseCase<
  RegisterUserCommand,
  RegisterUserResult
> {
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
    command: RegisterUserCommand,
    trx?: QueryRunner,
  ): Promise<RegisterUserResult> {
    if (await this.userRepository.existsByEmail(command.email)) {
      throw new EmailAlreadyExistsError();
    }

    const passwordHash = await this.passwordService.hash(command.password);
    const user = User.create({
      name: command.name,
      email: command.email,
    });

    await this.userRepository.save(user, trx, {
      passwordHash,
      roleNames: [DEFAULT_REGISTRATION_ROLE],
    });

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

    return { user, accessToken, refreshToken, expiresIn };
  }
}
