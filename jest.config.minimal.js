/**
 * Jest configuration for NotificationsService testing - Minimal Version
 */
module.exports = {
  displayName: 'NotificationsService Edge Tests',
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
    '<rootDir>/tests/setup.js'
  ],

  // Coverage configuration - disabled for edge cases
  collectCoverage: false,
  
  // Test timeout
  testTimeout: 15000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Transform configuration
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
  maxWorkers: 1
};