import 'dotenv/config';
import * as joi from 'joi';
import { ConfigurationEnvironmentVariableError } from '../modules/shared/domain/errors/configuration';

interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
}

const environmentSchema = joi
  .object({
    NODE_ENV: joi
      .string()
      .valid('development', 'production', 'test')
      .required(),
    PORT: joi.number().default(3000),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().required(),
    DB_USERNAME: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_DATABASE: joi.string().required(),
  })
  .unknown();

const { error, value } = environmentSchema.validate(process.env);

if (error) throw new ConfigurationEnvironmentVariableError(error.message);

const environmentVariables: EnvironmentVariables = value;

export const ENVIRONMENT_VARIABLES = {
  NODE_ENV: environmentVariables.NODE_ENV,
  PORT: environmentVariables.PORT,
  DB_HOST: environmentVariables.DB_HOST,
  DB_PORT: environmentVariables.DB_PORT,
  DB_USERNAME: environmentVariables.DB_USERNAME,
  DB_PASSWORD: environmentVariables.DB_PASSWORD,
  DB_DATABASE: environmentVariables.DB_DATABASE,
};
