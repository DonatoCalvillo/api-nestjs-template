export const enum ErrorCodes {
  ENVIRONMENT_VARIABLE_ERROR = 'E-CONFIG',
  DATABASE_ERROR = 'E-DB',
  CONCURRENCY_CONFLICT = 'E-CONCURRENCY',
  EXTERNAL_SERVICE = 'E-EXT-SERVICE',
  CIRCUIT_OPEN = 'E-CIRCUIT-OPEN',
  UNEXPECTED_ERROR = 'E-UNEXPECTED',
}
export const ErrorCodesMessages = {
  [ErrorCodes.ENVIRONMENT_VARIABLE_ERROR]: () =>
    `There was an error with the environment variable`,
  [ErrorCodes.DATABASE_ERROR]: () => `There was a database error`,
  [ErrorCodes.CONCURRENCY_CONFLICT]: () =>
    `The record was modified by another request. Reload and try again.`,
  [ErrorCodes.EXTERNAL_SERVICE]: () => `External service is unavailable`,
  [ErrorCodes.CIRCUIT_OPEN]: () => `External service circuit breaker is open`,
  [ErrorCodes.UNEXPECTED_ERROR]: () => `An unexpected error occurred`,
};
