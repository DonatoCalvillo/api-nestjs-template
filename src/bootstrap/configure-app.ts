import compression from 'compression';
import {
  BadRequestException,
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { json } from 'express';
import { Logger } from 'nestjs-pino';
import {
  API_GLOBAL_PREFIX,
  SWAGGER_PATH,
} from '../configuration/api.constants';
import { getCorsOptions } from '../configuration/cors';
import { ENVIRONMENT_VARIABLES } from '../configuration/environments-variables';
import { getHelmetMiddleware } from '../configuration/helmet';
import { setupSwagger } from '../configuration/swagger';
import { ErrorCodes } from '../modules/shared/domain/enum/error-codes';
import { ResponseDto } from '../modules/shared/domain/response/response';
import { flattenValidationErrors } from '../modules/shared/infrastructure/response/validation-errors.util';

export const configureApp = (app: INestApplication): void => {
  app.use(json({ limit: ENVIRONMENT_VARIABLES.HTTP_BODY_LIMIT }));
  app.use(compression());

  try {
    app.useLogger(app.get(Logger));
  } catch {
    // Logger may not be registered in minimal test modules
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
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

  app.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/(.*)', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.GET },
      { path: SWAGGER_PATH, method: RequestMethod.ALL },
      { path: `${SWAGGER_PATH}-json`, method: RequestMethod.GET },
    ],
  });

  setupSwagger(app);
};
