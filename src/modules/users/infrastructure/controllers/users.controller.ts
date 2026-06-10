import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { LogoutResponseDto } from '../../../auth/infrastructure/controllers/dtos/logout-response.dto';
import {
  RBAC_ROLES,
  RBAC_PERMISSIONS,
} from '../../../auth/domain/constants/rbac.constants';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import { Permissions } from '../../../auth/infrastructure/decorators/permissions.decorator';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator';
import { ActorContextService } from '../../../shared/infrastructure/audit/actor-context.service';
import { BaseController } from '../../../shared/infrastructure/controllers/base.controller';
import { PaginationQueryDto } from '../../../shared/infrastructure/dtos/pagination-query.dto';
import { toPaginatedResponse } from '../../../shared/infrastructure/dtos/paginated-response.dto';
import {
  ApiOkResponseEnvelope,
  ApiPaginatedResponseEnvelope,
  ApiStandardErrorResponses,
  ResponseMetaDto,
} from '../../../shared/infrastructure/response';
import { TraceContextService } from '../../../shared/infrastructure/tracing/trace-context.service';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';
import { AuthenticatedUser } from '../../application/types/authenticated-user';
import { UpdateUserDto } from './dtos/update-user.dto';
import {
  toUserProfileResponseDto,
  toUserResponseDto,
  UserResponseDto,
} from './dtos/user-response.dto';

@ApiTags('users')
@ApiExtraModels(UserResponseDto, ResponseMetaDto, LogoutResponseDto)
@Controller('users')
export class UsersController extends BaseController {
  constructor(
    logger: PinoLogger,
    actorContext: ActorContextService,
    traceContext: TraceContextService,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {
    super(logger, actorContext, traceContext);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOkResponseEnvelope(UserResponseDto, 'Current user profile')
  @ApiStandardErrorResponses()
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const profile = await this.executeUseCase(this.getCurrentUserUseCase, {
      userId: user.id,
    });

    return toUserProfileResponseDto(profile);
  }

  @Get()
  @Roles(RBAC_ROLES.ADMIN)
  @Permissions(RBAC_PERMISSIONS.USERS_READ)
  @ApiBearerAuth('access-token')
  @ApiPaginatedResponseEnvelope(UserResponseDto, 'Paginated user list')
  @ApiStandardErrorResponses()
  async list(@Query() query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;

    const { items, total } = await this.executeUseCase(this.listUsersUseCase, {
      page,
      perPage,
    });

    return toPaginatedResponse(
      items.map(toUserResponseDto),
      total,
      page,
      perPage,
    );
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOkResponseEnvelope(UserResponseDto, 'Updated user profile')
  @ApiStandardErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.executeUseCase(this.updateUserUseCase, {
      id,
      name: dto.name,
      email: dto.email,
      version: dto.version,
      actor,
    });

    return toUserResponseDto(user);
  }

  @Delete(':id')
  @Permissions(RBAC_PERMISSIONS.USERS_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponseEnvelope(LogoutResponseDto, 'User deleted successfully')
  @ApiStandardErrorResponses()
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.executeUseCase(this.deleteUserUseCase, { id, actor });
  }
}
