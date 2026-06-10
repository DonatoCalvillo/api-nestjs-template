import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { BaseController } from '../../../shared/infrastructure/controllers/base.controller';
import {
  ApiOkResponseEnvelope,
  ApiStandardErrorResponses,
  ResponseMetaDto,
} from '../../../shared/infrastructure/response';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { RegisterDto } from './dtos/register.dto';
import { TokenResponseDto } from './dtos/token-response.dto';

@ApiTags('auth')
@ApiExtraModels(TokenResponseDto, ResponseMetaDto)
@Controller('auth')
export class AuthController extends BaseController {
  constructor(
    logger: PinoLogger,
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {
    super(logger);
  }

  @Public()
  @Post('register')
  @ApiOkResponseEnvelope(TokenResponseDto)
  @ApiStandardErrorResponses()
  async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.executeUseCase(this.registerUserUseCase, dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponseEnvelope(TokenResponseDto)
  @ApiStandardErrorResponses()
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
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
  async logout(
    @CurrentUser() _user: AuthenticatedUser,
    @Body() dto: RefreshTokenDto,
  ): Promise<{ success: boolean }> {
    return this.executeUseCase(this.logoutUseCase, dto);
  }
}
