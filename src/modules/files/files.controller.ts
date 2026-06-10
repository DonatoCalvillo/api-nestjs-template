import {
  Inject,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { PinoLogger } from 'nestjs-pino';
import { RBAC_PERMISSIONS } from '../auth/domain/constants/rbac.constants';
import { Permissions } from '../auth/infrastructure/decorators/permissions.decorator';
import { STORAGE_SERVICE } from '../shared/application/ports/storage.service.port';
import { IStorageService } from '../shared/application/ports/storage.service.port';
import { ActorContextService } from '../shared/infrastructure/audit/actor-context.service';
import { BaseController } from '../shared/infrastructure/controllers/base.controller';
import {
  ApiOkResponseEnvelope,
  ApiStandardErrorResponses,
  ResponseMetaDto,
} from '../shared/infrastructure/response';
import { TraceContextService } from '../shared/infrastructure/tracing/trace-context.service';
import { FileUploadResponseDto } from './dtos/file-upload-response.dto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

type UploadedFilePayload = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@ApiTags('files')
@ApiExtraModels(ResponseMetaDto, FileUploadResponseDto)
@Controller('files')
export class FilesController extends BaseController {
  constructor(
    logger: PinoLogger,
    actorContext: ActorContextService,
    traceContext: TraceContextService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {
    super(logger, actorContext, traceContext);
  }

  @Post('upload')
  @Permissions(RBAC_PERMISSIONS.FILES_WRITE)
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponseEnvelope(FileUploadResponseDto, 'Uploaded file metadata')
  @ApiStandardErrorResponses()
  async upload(@UploadedFile() file: UploadedFilePayload) {
    if (!file) {
      throw new Error('File is required');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    const key = `${randomUUID()}-${file.originalname}`;
    return this.storageService.upload(key, file.buffer, file.mimetype);
  }
}
