import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ActorContextService } from '../../../shared/infrastructure/audit/actor-context.service';
import { BaseController } from '../../../shared/infrastructure/controllers/base.controller';
import { TraceContextService } from '../../../shared/infrastructure/tracing/trace-context.service';
import {
  ApiOkResponseEnvelope,
  ApiStandardErrorResponses,
  ResponseMetaDto,
} from '../../../shared/infrastructure/response';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { MfaChallengeUseCase } from '../../application/use-cases/mfa-challenge.use-case';
import { MfaSetupUseCase } from '../../application/use-cases/mfa-setup.use-case';
import { MfaVerifyUseCase } from '../../application/use-cases/mfa-verify.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { OidcAuthService } from '../../infrastructure/services/oidc-auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';
import {
  ForgotPasswordDto,
  MfaChallengeDto,
  MfaVerifyDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dtos/auth-extended.dto';
import { LoginDto } from './dtos/login.dto';
import {
  LoginResponseDto,
  MfaSetupResponseDto,
} from './dtos/login-response.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { RegisterDto } from './dtos/register.dto';
import { LogoutResponseDto } from './dtos/logout-response.dto';
import { TokenResponseDto } from './dtos/token-response.dto';

@ApiTags('auth')
@ApiExtraModels(
  TokenResponseDto,
  LoginResponseDto,
  MfaSetupResponseDto,
  LogoutResponseDto,
  ResponseMetaDto,
)
@Controller('auth')
export class AuthController extends BaseController {
  constructor(
    logger: PinoLogger,
    actorContext: ActorContextService,
    traceContext: TraceContextService,
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly mfaSetupUseCase: MfaSetupUseCase,
    private readonly mfaVerifyUseCase: MfaVerifyUseCase,
    private readonly mfaChallengeUseCase: MfaChallengeUseCase,
    private readonly oidcAuthService: OidcAuthService,
  ) {
    super(logger, actorContext, traceContext);
  }

  @Public()
  @Post('register')
  @ApiOkResponseEnvelope(TokenResponseDto)
  @ApiStandardErrorResponses()
  async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    const result = await this.executeUseCase(this.registerUserUseCase, dto);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponseEnvelope(LoginResponseDto)
  @ApiStandardErrorResponses()
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.executeUseCase(this.loginUseCase, dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponseEnvelope(TokenResponseDto)
  @ApiStandardErrorResponses()
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.executeUseCase(this.refreshTokenUseCase, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponseEnvelope(LogoutResponseDto, 'Session ended successfully')
  @ApiStandardErrorResponses()
  async logout(
    @CurrentUser() _user: AuthenticatedUser,
    @Body() dto: RefreshTokenDto,
  ): Promise<{ success: boolean }> {
    return this.executeUseCase(this.logoutUseCase, dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponseEnvelope(LogoutResponseDto, 'Email verified')
  @ApiStandardErrorResponses()
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<{ success: boolean }> {
    return this.executeUseCase(this.verifyEmailUseCase, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponseEnvelope(LogoutResponseDto)
  @ApiStandardErrorResponses()
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ success: boolean }> {
    return this.executeUseCase(this.forgotPasswordUseCase, dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponseEnvelope(LogoutResponseDto)
  @ApiStandardErrorResponses()
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean }> {
    return this.executeUseCase(this.resetPasswordUseCase, dto);
  }

  @Post('mfa/setup')
  @ApiBearerAuth('access-token')
  @ApiOkResponseEnvelope(MfaSetupResponseDto)
  @ApiStandardErrorResponses()
  async mfaSetup(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MfaSetupResponseDto> {
    return this.executeUseCase(this.mfaSetupUseCase, { user });
  }

  @Post('mfa/verify')
  @ApiBearerAuth('access-token')
  @ApiOkResponseEnvelope(LogoutResponseDto, 'MFA enabled')
  @ApiStandardErrorResponses()
  async mfaVerify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaVerifyDto,
  ): Promise<{ success: boolean }> {
    return this.executeUseCase(this.mfaVerifyUseCase, {
      user,
      code: dto.code,
    });
  }

  @Public()
  @Post('mfa/challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponseEnvelope(TokenResponseDto)
  @ApiStandardErrorResponses()
  async mfaChallenge(@Body() dto: MfaChallengeDto): Promise<TokenResponseDto> {
    return this.executeUseCase(this.mfaChallengeUseCase, dto);
  }

  @Public()
  @Get('oidc/:provider')
  async oidcRedirect(
    @Param('provider') provider: string,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.oidcAuthService.getAuthorizationUrl(provider);
    res.redirect(url);
  }

  @Public()
  @Public()
  @Get('oidc/:provider/callback')
  @ApiOkResponseEnvelope(TokenResponseDto)
  async oidcCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
  ): Promise<TokenResponseDto> {
    return this.oidcAuthService.handleCallback(provider, code);
  }
}
