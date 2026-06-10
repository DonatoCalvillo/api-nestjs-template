import { DataSource, DataSourceOptions } from 'typeorm';
import { entities } from '../../src/database/entities';

export const getTestDataSourceOptions = (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'test',
  password: process.env.DB_PASSWORD ?? 'test',
  database: process.env.DB_DATABASE ?? 'test',
  entities,
  synchronize: false,
  logging: false,
});

export const createTestDataSource = async (): Promise<DataSource> => {
  const dataSource = new DataSource(getTestDataSourceOptions());
  await dataSource.initialize();
  return dataSource;
};
