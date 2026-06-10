import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EMAIL_SENDER } from '../shared/application/ports/email-sender.port';
import { LoggingEmailSender } from '../shared/infrastructure/email/logging-email-sender';
import { UsersModule } from '../users/users.module';
import { AUTH_TOKEN_REPOSITORY } from './application/ports/auth-token.repository.port';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token.repository.port';
import { USER_IDENTITY_REPOSITORY } from './application/ports/user-identity.repository.port';
import { API_KEY_REPOSITORY } from './application/ports/api-key.repository.port';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { MfaChallengeUseCase } from './application/use-cases/mfa-challenge.use-case';
import { MfaSetupUseCase } from './application/use-cases/mfa-setup.use-case';
import { MfaVerifyUseCase } from './application/use-cases/mfa-verify.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { CreateApiKeyUseCase } from './application/use-cases/create-api-key.use-case';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { AdminController } from './infrastructure/controllers/admin.controller';
import { InternalController } from './infrastructure/controllers/internal.controller';
import { SendVerificationEmailOnUserCreatedHandler } from './infrastructure/events/send-verification-email.handler';
import { ApiKeyGuard } from './infrastructure/guards/api-key.guard';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from './infrastructure/guards/permissions.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { ApiKeyEntity } from './infrastructure/persistence/api-key.entity';
import { AuthTokenEntity } from './infrastructure/persistence/auth-token.entity';
import { RefreshTokenEntity } from './infrastructure/persistence/refresh-token.entity';
import { UserIdentityEntity } from './infrastructure/persistence/user-identity.entity';
import { TypeOrmApiKeyRepository } from './infrastructure/persistence/typeorm-api-key.repository';
import { TypeOrmAuthTokenRepository } from './infrastructure/persistence/typeorm-auth-token.repository';
import { TypeOrmRefreshTokenRepository } from './infrastructure/persistence/typeorm-refresh-token.repository';
import { TypeOrmUserIdentityRepository } from './infrastructure/persistence/typeorm-user-identity.repository';
import { AuthTokenService } from './infrastructure/services/auth-token.service';
import { EncryptionService } from './infrastructure/services/encryption.service';
import { OidcAuthService } from './infrastructure/services/oidc-auth.service';
import { PasswordService } from './infrastructure/services/password.service';
import { TokenService } from './infrastructure/services/token.service';
import { TotpService } from './infrastructure/services/totp.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      RefreshTokenEntity,
      AuthTokenEntity,
      UserIdentityEntity,
      ApiKeyEntity,
    ]),
  ],
  controllers: [AuthController, AdminController, InternalController],
  providers: [
    PasswordService,
    TokenService,
    AuthTokenService,
    EncryptionService,
    TotpService,
    OidcAuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    ApiKeyGuard,
    LoginUseCase,
    RegisterUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    VerifyEmailUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    MfaSetupUseCase,
    MfaVerifyUseCase,
    MfaChallengeUseCase,
    CreateApiKeyUseCase,
    SendVerificationEmailOnUserCreatedHandler,
    TypeOrmRefreshTokenRepository,
    TypeOrmAuthTokenRepository,
    TypeOrmUserIdentityRepository,
    TypeOrmApiKeyRepository,
    LoggingEmailSender,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useExisting: TypeOrmRefreshTokenRepository,
    },
    {
      provide: AUTH_TOKEN_REPOSITORY,
      useExisting: TypeOrmAuthTokenRepository,
    },
    {
      provide: USER_IDENTITY_REPOSITORY,
      useExisting: TypeOrmUserIdentityRepository,
    },
    {
      provide: API_KEY_REPOSITORY,
      useExisting: TypeOrmApiKeyRepository,
    },
    {
      provide: EMAIL_SENDER,
      useExisting: LoggingEmailSender,
    },
    {
      provide: APP_GUARD,
      useExisting: ApiKeyGuard,
    },
  ],
  exports: [JwtAuthGuard, RolesGuard, PermissionsGuard, ApiKeyGuard],
})
export class AuthModule {}
