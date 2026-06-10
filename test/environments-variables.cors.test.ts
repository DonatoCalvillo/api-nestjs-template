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

describe('environments-variables CORS production warning', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, ...baseEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('warns when CORS_ORIGINS is * in production', async () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    await loadEnvironmentVariables();

    expect(warnSpy).toHaveBeenCalledWith(
      'CORS_ORIGINS=* in production allows any origin. Set explicit origins.',
    );

    warnSpy.mockRestore();
  });

  it('does not warn when CORS_ORIGINS is explicit in production', async () => {
    process.env.CORS_ORIGINS = 'https://app.example.com';
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    await loadEnvironmentVariables();

    expect(warnSpy).not.toHaveBeenCalledWith(
      'CORS_ORIGINS=* in production allows any origin. Set explicit origins.',
    );

    warnSpy.mockRestore();
  });
});
