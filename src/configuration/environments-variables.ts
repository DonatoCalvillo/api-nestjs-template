import 'dotenv/config';
import * as joi from 'joi';
import { ConfigurationEnvironmentVariableError } from '../modules/shared/domain/errors/configuration';

interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  SCHEDULE_DB_HOST: string;
  SCHEDULE_DB_PORT: number;
  SCHEDULE_DB_USERNAME: string;
  SCHEDULE_DB_PASSWORD: string;
  SCHEDULE_DB_DATABASE: string;
}

const environmentSchema = joi
  .object({
    NODE_ENV: joi
      .string()
      .valid('development', 'production', 'test')
      .required(),
    PORT: joi.number().default(3000),
    SCHEDULE_DB_HOST: joi.string().required(),
    SCHEDULE_DB_PORT: joi.number().required(),
    SCHEDULE_DB_USERNAME: joi.string().required(),
    SCHEDULE_DB_PASSWORD: joi.string().required(),
    SCHEDULE_DB_DATABASE: joi.string().required(),
  })
  .unknown();

const { error, value } = environmentSchema.validate(process.env);

if (error) throw new ConfigurationEnvironmentVariableError(error.message);

const environmentVariables: EnvironmentVariables = value;

export const ENVIRONMENT_VARIABLES = {
  NODE_ENV: environmentVariables.NODE_ENV,
  PORT: environmentVariables.PORT,
  SCHEDULE_DB_HOST: environmentVariables.SCHEDULE_DB_HOST,
  SCHEDULE_DB_PORT: environmentVariables.SCHEDULE_DB_PORT,
  SCHEDULE_DB_USERNAME: environmentVariables.SCHEDULE_DB_USERNAME,
  SCHEDULE_DB_PASSWORD: environmentVariables.SCHEDULE_DB_PASSWORD,
  SCHEDULE_DB_DATABASE: environmentVariables.SCHEDULE_DB_DATABASE,
};
