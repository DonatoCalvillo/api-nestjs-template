import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ENVIRONMENT_VARIABLES } from './environments-variables';

export const getCorsOptions = (): CorsOptions => {
  const allowAllOrigins = ENVIRONMENT_VARIABLES.CORS_ORIGINS === '*';

  if (allowAllOrigins && ENVIRONMENT_VARIABLES.CORS_CREDENTIALS) {
    throw new Error(
      'CORS_CREDENTIALS cannot be enabled when CORS_ORIGINS is "*". Use explicit origins instead.',
    );
  }

  return {
    origin: allowAllOrigins
      ? true
      : ENVIRONMENT_VARIABLES.CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
    credentials: ENVIRONMENT_VARIABLES.CORS_CREDENTIALS,
  };
};
