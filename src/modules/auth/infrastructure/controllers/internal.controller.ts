import { Controller, Get } from '@nestjs/common';
import { ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import {
  ApiOkResponseEnvelope,
  ApiStandardErrorResponses,
  ResponseMetaDto,
} from '../../../shared/infrastructure/response';
import { ApiKeyAuth } from '../decorators/api-key-auth.decorator';
import { Public } from '../decorators/public.decorator';
import { HealthSummaryResponseDto } from './dtos/health-summary-response.dto';

@ApiTags('internal')
@ApiExtraModels(ResponseMetaDto, HealthSummaryResponseDto)
@Controller('internal')
export class InternalController {
  @Public()
  @ApiKeyAuth('internal:read')
  @Get('health-summary')
  @ApiOkResponseEnvelope(
    HealthSummaryResponseDto,
    'Service health summary for S2S consumers',
  )
  @ApiStandardErrorResponses()
  getHealthSummary(): HealthSummaryResponseDto {
    return {
      status: 'ok',
      service: ENVIRONMENT_VARIABLES.OTEL_SERVICE_NAME,
    };
  }
}
