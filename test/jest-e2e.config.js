/** Testes de integração (e2e): API real + PostgreSQL real. */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  roots: ['<rootDir>/test'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleNameMapper: { '^@test/(.*)$': '<rootDir>/test/$1' },
  testEnvironment: 'node',
  watchman: false,
  globalSetup: '<rootDir>/test/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/test/e2e/global-teardown.ts',
  testTimeout: 60000,
};
