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
  HELMET_ENABLED: boolean;
  THROTTLE_ENABLED: boolean;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
  IP_FILTER_ENABLED: boolean;
  IP_ALLOWLIST: string;
  TRUST_PROXY: boolean;
  HTTP_RESILIENCE_ENABLED: boolean;
  HTTP_TIMEOUT_MS: number;
  HTTP_RETRY_MAX_ATTEMPTS: number;
  HTTP_RETRY_DELAY_MS: number;
  HTTP_RETRY_BACKOFF_MULTIPLIER: number;
  HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD: number;
  HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS: number;
  OTEL_TRACES_ENABLED: boolean;
  OTEL_SERVICE_NAME: string;
  OTEL_EXPORTER_OTLP_ENDPOINT: string;
  METRICS_ENABLED: boolean;
  HEALTH_DISK_PATH: string;
  HEALTH_DISK_THRESHOLD_PERCENT: number;
  OUTBOX_RELAY_ENABLED: boolean;
  OUTBOX_RELAY_CRON: string;
  OUTBOX_RELAY_BATCH_SIZE: number;
  OUTBOX_RELAY_MAX_ATTEMPTS: number;
  SWAGGER_ENABLED: boolean;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
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
    HELMET_ENABLED: booleanEnv(true),
    THROTTLE_ENABLED: booleanEnv(true),
    THROTTLE_TTL: joi.number().default(60),
    THROTTLE_LIMIT: joi.number().default(100),
    IP_FILTER_ENABLED: booleanEnv(false),
    IP_ALLOWLIST: joi.string().default('127.0.0.1,::1'),
    TRUST_PROXY: booleanEnv(false),
    HTTP_RESILIENCE_ENABLED: booleanEnv(true),
    HTTP_TIMEOUT_MS: joi.number().default(5000),
    HTTP_RETRY_MAX_ATTEMPTS: joi.number().default(3),
    HTTP_RETRY_DELAY_MS: joi.number().default(500),
    HTTP_RETRY_BACKOFF_MULTIPLIER: joi.number().default(2),
    HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD: joi.number().default(5),
    HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS: joi.number().default(30000),
    OTEL_TRACES_ENABLED: booleanEnv(true),
    OTEL_SERVICE_NAME: joi.string().default('dodo-schedule-api'),
    OTEL_EXPORTER_OTLP_ENDPOINT: joi
      .string()
      .default('http://localhost:4318/v1/traces'),
    METRICS_ENABLED: booleanEnv(true),
    HEALTH_DISK_PATH: joi.string().default('/'),
    HEALTH_DISK_THRESHOLD_PERCENT: joi.number().min(0).max(1).default(0.9),
    OUTBOX_RELAY_ENABLED: booleanEnv(false),
    OUTBOX_RELAY_CRON: joi.string().default('*/5 * * * * *'),
    OUTBOX_RELAY_BATCH_SIZE: joi.number().min(1).default(50),
    OUTBOX_RELAY_MAX_ATTEMPTS: joi.number().min(1).default(5),
    SWAGGER_ENABLED: booleanEnv(process.env.NODE_ENV === 'development'),
    JWT_ACCESS_SECRET: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.string().min(32).required(),
      otherwise: joi
        .string()
        .default('dev-access-secret-change-in-production-32chars'),
    }),
    JWT_REFRESH_SECRET: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.string().min(32).required(),
      otherwise: joi
        .string()
        .default('dev-refresh-secret-change-in-production-32chars'),
    }),
    JWT_ACCESS_EXPIRES_IN: joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: joi.string().default('7d'),
    BCRYPT_ROUNDS: joi.number().min(10).max(15).default(12),
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
  HELMET_ENABLED: environmentVariables.HELMET_ENABLED,
  THROTTLE_ENABLED: environmentVariables.THROTTLE_ENABLED,
  THROTTLE_TTL: environmentVariables.THROTTLE_TTL,
  THROTTLE_LIMIT: environmentVariables.THROTTLE_LIMIT,
  IP_FILTER_ENABLED: environmentVariables.IP_FILTER_ENABLED,
  IP_ALLOWLIST: parseCsv(environmentVariables.IP_ALLOWLIST),
  TRUST_PROXY: environmentVariables.TRUST_PROXY,
  HTTP_RESILIENCE_ENABLED: environmentVariables.HTTP_RESILIENCE_ENABLED,
  HTTP_TIMEOUT_MS: environmentVariables.HTTP_TIMEOUT_MS,
  HTTP_RETRY_MAX_ATTEMPTS: environmentVariables.HTTP_RETRY_MAX_ATTEMPTS,
  HTTP_RETRY_DELAY_MS: environmentVariables.HTTP_RETRY_DELAY_MS,
  HTTP_RETRY_BACKOFF_MULTIPLIER:
    environmentVariables.HTTP_RETRY_BACKOFF_MULTIPLIER,
  HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD:
    environmentVariables.HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS:
    environmentVariables.HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
  OTEL_TRACES_ENABLED: environmentVariables.OTEL_TRACES_ENABLED,
  OTEL_SERVICE_NAME: environmentVariables.OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT: environmentVariables.OTEL_EXPORTER_OTLP_ENDPOINT,
  METRICS_ENABLED: environmentVariables.METRICS_ENABLED,
  HEALTH_DISK_PATH: environmentVariables.HEALTH_DISK_PATH,
  HEALTH_DISK_THRESHOLD_PERCENT:
    environmentVariables.HEALTH_DISK_THRESHOLD_PERCENT,
  OUTBOX_RELAY_ENABLED: environmentVariables.OUTBOX_RELAY_ENABLED,
  OUTBOX_RELAY_CRON: environmentVariables.OUTBOX_RELAY_CRON,
  OUTBOX_RELAY_BATCH_SIZE: environmentVariables.OUTBOX_RELAY_BATCH_SIZE,
  OUTBOX_RELAY_MAX_ATTEMPTS: environmentVariables.OUTBOX_RELAY_MAX_ATTEMPTS,
  SWAGGER_ENABLED: environmentVariables.SWAGGER_ENABLED,
  JWT_ACCESS_SECRET: environmentVariables.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: environmentVariables.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: environmentVariables.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: environmentVariables.JWT_REFRESH_EXPIRES_IN,
  BCRYPT_ROUNDS: environmentVariables.BCRYPT_ROUNDS,
};
