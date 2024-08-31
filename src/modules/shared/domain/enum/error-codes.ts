export const enum ErrorCodes {
  ENVIRONMENT_VARIABLE_ERROR = 'E-CONFIG',
}
export const ErrorCodesMessages = {
  [ErrorCodes.ENVIRONMENT_VARIABLE_ERROR]: () =>
    `There was an error with the environment variable`,
};
