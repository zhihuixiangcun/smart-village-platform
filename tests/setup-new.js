/**
 * 测试环境设置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-12345678';
process.env.MONGO_URI = 'mongodb://localhost:27017/smart_village_test';

// 全局测试钩子
beforeAll(async () => {
  // 可以在这里添加全局设置
});

afterAll(async () => {
  // 清理工作
});

// 抑制控制台输出（可选）
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
