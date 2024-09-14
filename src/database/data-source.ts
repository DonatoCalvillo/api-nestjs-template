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
  logging: ENVIRONMENT_VARIABLES.NODE_ENV === 'development',
};

export const dataSource: DataSource = new DataSource(dataSourceOptions);
export default dataSource;
