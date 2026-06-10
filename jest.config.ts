const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 100000,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          types: ['jest', 'node'],
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/'],
  testPathIgnorePatterns: ['<rootDir>/node_modules', '<rootDir>/dist'],
  extensionsToTreatAsEsm: ['.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};

module.exports = {
  verbose: true,
  projects: [
    {
      displayName: 'unit',
      ...baseConfig,
      setupFiles: ['<rootDir>/test/setup-env.ts'],
      testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
      collectCoverageFrom: [
        'src/modules/shared/**/*.ts',
        'src/modules/auth/**/*.ts',
        'src/modules/users/**/*.ts',
        '!**/*.module.ts',
        '!**/index.ts',
      ],
      coveragePathIgnorePatterns: [
        '/node_modules/',
        '\\.entity\\.ts$',
        '/dtos/',
        '/decorators/',
        '/constants/',
        '/strategies/',
        '/controllers/',
      ],
      coverageThreshold: {
        'src/modules/shared/': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/modules/auth/': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/modules/users/': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    {
      displayName: 'e2e',
      ...baseConfig,
      setupFiles: ['<rootDir>/test/setup-e2e-env.ts'],
      globalSetup: '<rootDir>/test/global-setup.ts',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
    },
    {
      displayName: 'integration',
      ...baseConfig,
      setupFiles: ['<rootDir>/test/setup-e2e-env.ts'],
      globalSetup: '<rootDir>/test/global-setup.ts',
      testMatch: ['<rootDir>/test/integration/**/*.integration-spec.ts'],
    },
    {
      displayName: 'contract',
      ...baseConfig,
      setupFiles: ['<rootDir>/test/setup-contract-env.ts'],
      globalSetup: '<rootDir>/test/global-setup.ts',
      testMatch: ['<rootDir>/test/contract/**/*.contract-spec.ts'],
    },
  ],
};
