# 测试配置
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/**/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 40,
      statements: 40
    }
  },
  testTimeout: 10000,
  verbose: true,
  testSequencer: ['@jest/test-sequencer'].default,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
