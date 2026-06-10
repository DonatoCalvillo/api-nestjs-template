import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token.repository.port';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from './infrastructure/guards/permissions.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { RefreshTokenEntity } from './infrastructure/persistence/refresh-token.entity';
import { TypeOrmRefreshTokenRepository } from './infrastructure/persistence/typeorm-refresh-token.repository';
import { PasswordService } from './infrastructure/services/password.service';
import { TokenService } from './infrastructure/services/token.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshTokenEntity]),
  ],
  controllers: [AuthController],
  providers: [
    PasswordService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    LoginUseCase,
    RegisterUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    TypeOrmRefreshTokenRepository,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useExisting: TypeOrmRefreshTokenRepository,
    },
  ],
  exports: [JwtAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
