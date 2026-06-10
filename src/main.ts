import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ENVIRONMENT_VARIABLES } from './configuration/environments-variables';
import { configureApp } from './bootstrap/configure-app';

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

  configureApp(app);

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
