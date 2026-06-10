export const enum ErrorCodes {
  ENVIRONMENT_VARIABLE_ERROR = 'E-CONFIG',
  DATABASE_ERROR = 'E-DB',
}
export const ErrorCodesMessages = {
  [ErrorCodes.ENVIRONMENT_VARIABLE_ERROR]: () =>
    `There was an error with the environment variable`,
  [ErrorCodes.DATABASE_ERROR]: () => `There was a database error`,
};
