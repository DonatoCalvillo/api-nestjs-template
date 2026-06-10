import './instrumentation';
import compression from 'compression';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ENVIRONMENT_VARIABLES } from './configuration/environments-variables';
import { getCorsOptions } from './configuration/cors';
import { getHelmetMiddleware } from './configuration/helmet';
import { setupSwagger } from './configuration/swagger';
import { ErrorCodes } from './modules/shared/domain/enum/error-codes';
import { ResponseDto } from './modules/shared/domain/response/response';
import { flattenValidationErrors } from './modules/shared/infrastructure/response/validation-errors.util';

let isShuttingDown = false;

async function gracefulShutdown(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  signal: string,
  logger: Logger,
): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.log(`Received ${signal}, starting graceful shutdown`);

  const forceExit = setTimeout(() => {
    logger.error(
      `Shutdown drain timeout exceeded (${ENVIRONMENT_VARIABLES.SHUTDOWN_DRAIN_TIMEOUT_MS}ms), forcing exit`,
    );
    const server = app.getHttpServer();

    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }

    process.exit(1);
  }, ENVIRONMENT_VARIABLES.SHUTDOWN_DRAIN_TIMEOUT_MS);

  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Error during graceful shutdown',
    );
    process.exit(1);
  } finally {
    clearTimeout(forceExit);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  app.use(json({ limit: ENVIRONMENT_VARIABLES.HTTP_BODY_LIMIT }));
  app.use(compression());
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const fieldErrors = flattenValidationErrors(errors);

        return new BadRequestException(
          ResponseDto.error('Validation failed', ErrorCodes.VALIDATION, {
            errors: fieldErrors,
          }),
        );
      },
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

  const logger = app.get(Logger);
  await app.listen(ENVIRONMENT_VARIABLES.PORT);

  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, () => {
      void gracefulShutdown(app, signal, logger);
    });
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
