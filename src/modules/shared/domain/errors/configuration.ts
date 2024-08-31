import { ErrorCodes } from '../enum/error-codes';

export class ConfigurationEnvironmentVariableError extends Error {
  public readonly code = ErrorCodes.ENVIRONMENT_VARIABLE_ERROR;
  constructor(environmentVariable: string) {
    super(
      `There was an error with the environment variable: ${environmentVariable}`,
    );
  }
}
