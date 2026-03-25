module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '!**/__tests__/commands/auth.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/__tests__/**',
    '!src/cli/index.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  moduleNameMapper: {
    '^chalk$': '<rootDir>/src/__tests__/__mocks__/chalk.js',
    '^ora$': '<rootDir>/src/__tests__/__mocks__/ora.js',
    '^@inquirer/prompts$': '<rootDir>/src/__tests__/__mocks__/inquirer.js',
  },
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
