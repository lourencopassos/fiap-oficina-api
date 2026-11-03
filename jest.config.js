/** Testes unitários: domínio e camada de aplicação (domínios críticos). */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleNameMapper: {
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  testEnvironment: 'node',
  watchman: false,
  collectCoverageFrom: [
    'src/shared/domain/**/*.ts',
    'src/modules/*/domain/**/*.ts',
    'src/modules/*/application/**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};
