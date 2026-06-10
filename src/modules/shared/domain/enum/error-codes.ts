export const enum ErrorCodes {
  ENVIRONMENT_VARIABLE_ERROR = 'E-CONFIG',
  VALIDATION = 'E-VALIDATION',
  UNAUTHORIZED = 'E-UNAUTHORIZED',
  FORBIDDEN = 'E-FORBIDDEN',
  NOT_FOUND = 'E-NOT-FOUND',
  CONFLICT = 'E-CONFLICT',
  THROTTLE = 'E-THROTTLE',
  DATABASE_ERROR = 'E-DB',
  CONCURRENCY_CONFLICT = 'E-CONCURRENCY',
  EXTERNAL_SERVICE = 'E-EXT-SERVICE',
  CIRCUIT_OPEN = 'E-CIRCUIT-OPEN',
  UNEXPECTED_ERROR = 'E-UNEXPECTED',
}
export const ErrorCodesMessages = {
  [ErrorCodes.ENVIRONMENT_VARIABLE_ERROR]: () =>
    `There was an error with the environment variable`,
  [ErrorCodes.VALIDATION]: () => `Validation failed`,
  [ErrorCodes.UNAUTHORIZED]: () => `Unauthorized`,
  [ErrorCodes.FORBIDDEN]: () => `Forbidden`,
  [ErrorCodes.NOT_FOUND]: () => `Resource not found`,
  [ErrorCodes.CONFLICT]: () => `Conflict`,
  [ErrorCodes.THROTTLE]: () => `Too many requests`,
  [ErrorCodes.DATABASE_ERROR]: () => `There was a database error`,
  [ErrorCodes.CONCURRENCY_CONFLICT]: () =>
    `The record was modified by another request. Reload and try again.`,
  [ErrorCodes.EXTERNAL_SERVICE]: () => `External service is unavailable`,
  [ErrorCodes.CIRCUIT_OPEN]: () => `External service circuit breaker is open`,
  [ErrorCodes.UNEXPECTED_ERROR]: () => `An unexpected error occurred`,
};
