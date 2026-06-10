import './instrumentation';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ENVIRONMENT_VARIABLES } from './configuration/environments-variables';
import { getCorsOptions } from './configuration/cors';
import { getHelmetMiddleware } from './configuration/helmet';
import { setupSwagger } from './configuration/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (ENVIRONMENT_VARIABLES.TRUST_PROXY) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  if (ENVIRONMENT_VARIABLES.HELMET_ENABLED) {
    app.use(getHelmetMiddleware());
  }

  if (ENVIRONMENT_VARIABLES.CORS_ENABLED) {
    app.enableCors(getCorsOptions());
  }

  setupSwagger(app);

  await app.listen(ENVIRONMENT_VARIABLES.PORT);
}
bootstrap();
