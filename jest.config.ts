module.exports = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 100000,
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  transform: {
    '^.+\\.(t|j)s?$': [
      'ts-jest',
      {
        tsconfig: {
          types: ['jest', 'node'],
        },
      },
    ],
  },
  testMatch: [
    '**/tests/**/*.+(ts|tsx|js)',
    '**/(?!!+)(*.)+(spec|test).+(ts|tsx|js)',
    '**/tests/e2e/**/*.e2e.spec.+(ts|tsx|js)',
  ],
  transformIgnorePatterns: ['/node_modules/'],
  testPathIgnorePatterns: ['<rootDir>/node_modules', '<rootDir>/dist'],
  extensionsToTreatAsEsm: ['.ts'],
};
