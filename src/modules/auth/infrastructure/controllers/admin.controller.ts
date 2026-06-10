import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { RBAC_ROLES } from '../../domain/constants/rbac.constants';
import { CreateApiKeyUseCase } from '../../application/use-cases/create-api-key.use-case';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';
import { ActorContextService } from '../../../shared/infrastructure/audit/actor-context.service';
import { BaseController } from '../../../shared/infrastructure/controllers/base.controller';
import {
  ApiOkResponseEnvelope,
  ApiStandardErrorResponses,
  ResponseMetaDto,
} from '../../../shared/infrastructure/response';
import { TraceContextService } from '../../../shared/infrastructure/tracing/trace-context.service';
import { CreateApiKeyDto } from './dtos/create-api-key.dto';

@ApiTags('admin')
@ApiExtraModels(ResponseMetaDto)
@Controller('admin/api-keys')
export class AdminController extends BaseController {
  constructor(
    logger: PinoLogger,
    actorContext: ActorContextService,
    traceContext: TraceContextService,
    private readonly createApiKeyUseCase: CreateApiKeyUseCase,
  ) {
    super(logger, actorContext, traceContext);
  }

  @Post()
  @Roles(RBAC_ROLES.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOkResponseEnvelope(CreateApiKeyDto, 'API key created')
  @ApiStandardErrorResponses()
  async create(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.executeUseCase(this.createApiKeyUseCase, {
      name: dto.name,
      scopes: dto.scopes,
      actor,
    });
  }
}
