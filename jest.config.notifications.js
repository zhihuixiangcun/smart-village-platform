/**
 * Jest configuration for NotificationsService testing
 */
module.exports = {
  displayName: 'NotificationsService Tests',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/helpers/testHelpers.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'server/services/notificationsService.js',
    '!server/services/**/*.mock.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  coverageDirectory: 'coverage/notifications',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    'server/services/notificationsService.js': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },

  // Test timeout
  testTimeout: 15000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Transform configuration (if using TypeScript)
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module name mapping for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Global test variables
  globals: {
    'NODE_ENV': 'test'
  },

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Maximum worker processes
  maxWorkers: 1,

  // Test result processor
  testResultsProcessor: '<rootDir>/tests/helpers/testResultsProcessor.js'
};