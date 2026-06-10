import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import {
  ApiErrorResponseDto,
  ResponseMetaDto,
} from '../modules/shared/infrastructure/response';
import { PaginatedResponseDto } from '../modules/shared/infrastructure/dtos';
import { API_VERSION, SWAGGER_PATH } from './api.constants';
import { ENVIRONMENT_VARIABLES } from './environments-variables';

const createSwaggerConfig = () =>
  new DocumentBuilder()
    .setTitle(ENVIRONMENT_VARIABLES.APP_NAME)
    .setDescription('REST API documentation')
    .setVersion(API_VERSION)
    .addServer(
      `http://localhost:${ENVIRONMENT_VARIABLES.PORT}`,
      'Local development',
    )
    .addTag('auth', 'Authentication and session management')
    .addTag('users', 'User profiles and administration')
    .addTag('admin', 'Administrative operations')
    .addTag('internal', 'Service-to-service endpoints')
    .addTag('files', 'File uploads')
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

export const buildSwaggerDocument = (app: INestApplication): OpenAPIObject => {
  return SwaggerModule.createDocument(app, createSwaggerConfig(), {
    extraModels: [ResponseMetaDto, ApiErrorResponseDto, PaginatedResponseDto],
  });
};

export const setupSwagger = (app: INestApplication): void => {
  if (!ENVIRONMENT_VARIABLES.SWAGGER_ENABLED) {
    return;
  }

  const document = buildSwaggerDocument(app);
  SwaggerModule.setup(SWAGGER_PATH, app, document);
};
