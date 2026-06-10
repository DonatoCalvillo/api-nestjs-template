import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ResponseMeta } from '../../domain/response/response';

export class ResponseMetaDto implements ResponseMeta {
  timestamp: string;
  path?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

export class ApiErrorResponseDto {
  success: false;
  message: string;
  code?: string;
  data?: unknown;
  meta?: ResponseMetaDto;
}

export const ApiOkResponseEnvelope = <TModel extends Type<unknown>>(
  model: TModel,
  description?: string,
) =>
  applyDecorators(
    ApiOkResponse({
      description,
      schema: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Request successful' },
          data: { $ref: getSchemaPath(model) },
          meta: { $ref: getSchemaPath(ResponseMetaDto) },
        },
      },
    }),
  );

export const ApiStandardErrorResponses = () =>
  applyDecorators(
    ApiBadRequestResponse({ type: ApiErrorResponseDto }),
    ApiUnauthorizedResponse({ type: ApiErrorResponseDto }),
    ApiForbiddenResponse({ type: ApiErrorResponseDto }),
    ApiConflictResponse({ type: ApiErrorResponseDto }),
    ApiInternalServerErrorResponse({ type: ApiErrorResponseDto }),
  );
