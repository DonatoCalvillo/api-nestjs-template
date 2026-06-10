import { join } from 'path';
import { DataSource } from 'typeorm';
import { PostgresConnectionConfig } from './postgres-container';

export const runMigrations = async (
  config: PostgresConnectionConfig,
): Promise<void> => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: config.DB_HOST,
    port: Number(config.DB_PORT),
    username: config.DB_USERNAME,
    password: config.DB_PASSWORD,
    database: config.DB_DATABASE,
    entities: [join(__dirname, '../../dist/**/*.entity.js')],
    migrations: [join(__dirname, '../../dist/database/migrations/*.js')],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await dataSource.runMigrations();
  await dataSource.destroy();
};
