import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | null = null;

export type PostgresConnectionConfig = {
  DB_HOST: string;
  DB_PORT: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
};

export const startPostgresContainer =
  async (): Promise<StartedPostgreSqlContainer> => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    return container;
  };

export const getPostgresConnectionConfig = (
  startedContainer: StartedPostgreSqlContainer,
): PostgresConnectionConfig => ({
  DB_HOST: startedContainer.getHost(),
  DB_PORT: String(startedContainer.getPort()),
  DB_USERNAME: startedContainer.getUsername(),
  DB_PASSWORD: startedContainer.getPassword(),
  DB_DATABASE: startedContainer.getDatabase(),
});

export const stopPostgresContainer = async (): Promise<void> => {
  if (container) {
    await container.stop();
    container = null;
  }
};
