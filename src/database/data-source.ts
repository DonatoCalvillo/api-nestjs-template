import { ENVIRONMENT_VARIABLES } from '../configuration/environments-variables';
import { DataSource, DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: ENVIRONMENT_VARIABLES.DB_HOST,
  port: ENVIRONMENT_VARIABLES.DB_PORT,
  username: ENVIRONMENT_VARIABLES.DB_USERNAME,
  password: ENVIRONMENT_VARIABLES.DB_PASSWORD,
  database: ENVIRONMENT_VARIABLES.DB_DATABASE,
  entities: ['dist/**/*.entity.js'],
  migrationsTableName: 'migrations',
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  migrationsRun: ENVIRONMENT_VARIABLES.DB_MIGRATIONS_RUN,
  logging:
    ENVIRONMENT_VARIABLES.NODE_ENV === 'development' ? true : ['error', 'warn'],
  ssl: ENVIRONMENT_VARIABLES.DB_SSL ? { rejectUnauthorized: true } : false,
  extra: {
    max: ENVIRONMENT_VARIABLES.DB_POOL_MAX,
    idleTimeoutMillis: ENVIRONMENT_VARIABLES.DB_POOL_IDLE_TIMEOUT_MS,
  },
};

export default new DataSource(dataSourceOptions);
