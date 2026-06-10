import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ENVIRONMENT_VARIABLES } from './environments-variables';

export const setupSwagger = (app: INestApplication): void => {
  if (!ENVIRONMENT_VARIABLES.SWAGGER_ENABLED) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Dodo Schedule API')
    .setDescription('REST API documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
};
