import { ENVIRONMENT_VARIABLES } from 'src/configuration/environments-variables';
import { DataSource, DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: ENVIRONMENT_VARIABLES.SCHEDULE_DB_HOST,
  port: ENVIRONMENT_VARIABLES.SCHEDULE_DB_PORT,
  username: ENVIRONMENT_VARIABLES.SCHEDULE_DB_USERNAME,
  password: ENVIRONMENT_VARIABLES.SCHEDULE_DB_PASSWORD,
  database: ENVIRONMENT_VARIABLES.SCHEDULE_DB_DATABASE,
  entities: ['dist/**/*.entity.js'],
  migrationsTableName: 'migrations',
  migrations: ['dist/database/migrations/*.js'],
  logging: ENVIRONMENT_VARIABLES.NODE_ENV === 'development',
};

export const dataSource: DataSource = new DataSource(dataSourceOptions);
export default dataSource;
