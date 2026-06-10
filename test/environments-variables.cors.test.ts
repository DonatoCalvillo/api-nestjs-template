const baseEnv = {
  NODE_ENV: 'production',
  PORT: '3000',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'test',
  DB_PASSWORD: 'test',
  DB_DATABASE: 'test',
  CORS_ENABLED: 'true',
  CORS_ORIGINS: '*',
  CORS_CREDENTIALS: 'false',
  JWT_ACCESS_SECRET: 'production-access-secret-minimum-32-characters',
  JWT_REFRESH_SECRET: 'production-refresh-secret-minimum-32-characters',
};

const loadEnvironmentVariables = async (): Promise<void> => {
  await import('../src/configuration/environments-variables');
};

describe('environments-variables CORS production validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, ...baseEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when CORS_ORIGINS is * in production', async () => {
    try {
      await loadEnvironmentVariables();
      fail('Expected load to throw');
    } catch (error) {
      expect((error as Error).message).toContain('CORS_ORIGINS cannot be "*"');
      expect((error as { code?: string }).code).toBe('E-CONFIG');
    }
  });

  it('does not throw when CORS_ORIGINS is explicit in production', async () => {
    process.env.CORS_ORIGINS = 'https://app.example.com';

    await expect(loadEnvironmentVariables()).resolves.toBeUndefined();
  });

  it('does not throw when CORS_ORIGINS is * in development', async () => {
    process.env.NODE_ENV = 'development';

    await expect(loadEnvironmentVariables()).resolves.toBeUndefined();
  });
});
