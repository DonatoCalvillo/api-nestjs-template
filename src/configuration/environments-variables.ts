import 'dotenv/config';
import * as joi from 'joi';
import { ConfigurationEnvironmentVariableError } from '../modules/shared/domain/errors/configuration';

const booleanEnv = (defaultValue: boolean) =>
  joi.boolean().truthy('true').falsy('false').default(defaultValue);

const parseCsv = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  CORS_ENABLED: boolean;
  CORS_ORIGINS: string;
  CORS_CREDENTIALS: boolean;
  THROTTLE_ENABLED: boolean;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
  IP_FILTER_ENABLED: boolean;
  IP_ALLOWLIST: string;
  TRUST_PROXY: boolean;
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
    CORS_ENABLED: booleanEnv(true),
    CORS_ORIGINS: joi.string().default('*'),
    CORS_CREDENTIALS: booleanEnv(false),
    THROTTLE_ENABLED: booleanEnv(true),
    THROTTLE_TTL: joi.number().default(60),
    THROTTLE_LIMIT: joi.number().default(100),
    IP_FILTER_ENABLED: booleanEnv(false),
    IP_ALLOWLIST: joi.string().default('127.0.0.1,::1'),
    TRUST_PROXY: booleanEnv(false),
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
  CORS_ENABLED: environmentVariables.CORS_ENABLED,
  CORS_ORIGINS: environmentVariables.CORS_ORIGINS,
  CORS_CREDENTIALS: environmentVariables.CORS_CREDENTIALS,
  THROTTLE_ENABLED: environmentVariables.THROTTLE_ENABLED,
  THROTTLE_TTL: environmentVariables.THROTTLE_TTL,
  THROTTLE_LIMIT: environmentVariables.THROTTLE_LIMIT,
  IP_FILTER_ENABLED: environmentVariables.IP_FILTER_ENABLED,
  IP_ALLOWLIST: parseCsv(environmentVariables.IP_ALLOWLIST),
  TRUST_PROXY: environmentVariables.TRUST_PROXY,
};
