import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ApiErrorResponseDto,
  ResponseMetaDto,
} from '../modules/shared/infrastructure/response';
import { PaginatedResponseDto } from '../modules/shared/infrastructure/dtos';
import { API_GLOBAL_PREFIX, API_VERSION, SWAGGER_PATH } from './api.constants';
import { ENVIRONMENT_VARIABLES } from './environments-variables';

export const setupSwagger = (app: INestApplication): void => {
  if (!ENVIRONMENT_VARIABLES.SWAGGER_ENABLED) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('NestJS API Template')
    .setDescription('REST API documentation')
    .setVersion(API_VERSION)
    .addServer(
      `http://localhost:${ENVIRONMENT_VARIABLES.PORT}/${API_GLOBAL_PREFIX}`,
      'Local development',
    )
    .addTag('auth', 'Authentication and session management')
    .addTag('health', 'Health probes for orchestrators and load balancers')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ResponseMetaDto, ApiErrorResponseDto, PaginatedResponseDto],
  });
  SwaggerModule.setup(SWAGGER_PATH, app, document);
};
