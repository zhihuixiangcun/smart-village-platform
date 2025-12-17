/**
 * 智慧乡村综合服务平台 - Jest测试配置
 * 针对全面测试套件的配置，支持>80%覆盖率
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],

  // 覆盖率收集
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**',
    '!src/config/**',
    '!src/migrations/**',
    '!src/seeds/**'
  ],

  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],

  // 覆盖率输出目录
  coverageDirectory: 'coverage/comprehensive',

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/controllers/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/models/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // 忽略的覆盖率文件
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/',
    'src/app.js', // 入口文件通常不需要覆盖
    'src/config/database.js',
    'src/middleware/errorHandler.js'
  ],

  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/comprehensive.setup.js'
  ],

  // 模块路径映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // 全局变量
  globals: {
    'process.env.NODE_ENV': 'test'
  },

  // 测试超时
  testTimeout: 30000,

  // 最大工作进程数（避免数据库冲突）
  maxWorkers: 1,

  // 详细输出
  verbose: true,

  // 错误时停止
  bail: false,

  // 缓存
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // 转换忽略模式
  transformIgnorePatterns: [
    'node_modules/(?!(express|mongoose|jsonwebtoken|bcryptjs|ioredis|node-cache|lru-cache)/)'
  ],

  // 清理模拟
  clearMocks: true,
  restoreMocks: true,

  // 测试结果处理器
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage/junit',
        outputName: 'comprehensive-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // 测试序列化器
  snapshotSerializers: [],

  // 监视模式忽略模式
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/.jest-cache/'
  ],

  // 强制退出
  forceExit: true,

  // 检测打开的句柄
  detectOpenHandles: true,

  // 检测泄漏
  detectLeaks: false,

  // 通知
  notify: false,
  notifyMode: 'failure-change'
};