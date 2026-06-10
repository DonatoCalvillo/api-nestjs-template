import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ENVIRONMENT_VARIABLES } from './configuration/environments-variables';
import { getCorsOptions } from './configuration/cors';
import { getHelmetMiddleware } from './configuration/helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.useLogger(app.get(Logger));

  if (ENVIRONMENT_VARIABLES.TRUST_PROXY) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  if (ENVIRONMENT_VARIABLES.HELMET_ENABLED) {
    app.use(getHelmetMiddleware());
  }

  if (ENVIRONMENT_VARIABLES.CORS_ENABLED) {
    app.enableCors(getCorsOptions());
  }

  await app.listen(ENVIRONMENT_VARIABLES.PORT);
}
bootstrap();
