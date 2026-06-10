import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  getPostgresConnectionConfig,
  startPostgresContainer,
} from './helpers/postgres-container';
import { runMigrations } from './helpers/run-migrations';

const ENV_FILE = join(__dirname, '.testcontainers-env.json');

export default async function globalSetup(): Promise<() => Promise<void>> {
  const container = await startPostgresContainer();
  const connectionConfig = getPostgresConnectionConfig(container);

  writeFileSync(ENV_FILE, JSON.stringify(connectionConfig));

  await runMigrations(connectionConfig);

  return async () => {
    await container.stop();
  };
}
