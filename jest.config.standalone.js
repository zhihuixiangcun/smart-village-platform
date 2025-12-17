/**
 * Standalone Jest configuration - no external setup dependencies
 */
module.exports = {
  displayName: 'Standalone Edge Tests',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // NO setup files - completely standalone
  // setupFilesAfterEnv: [],

  // Coverage disabled for edge case testing
  collectCoverage: false,
  
  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Global test variables
  globals: {
    'NODE_ENV': 'test'
  },

  // Force exit after tests complete
  forceExit: true,

  // Maximum worker processes
  maxWorkers: 1,

  // Silence warnings
  silent: false
};