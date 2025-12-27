# 智慧乡村平台 - 测试运行和调试指南

## 📋 目录

1. [快速开始](#快速开始)
2. [测试环境配置](#测试环境配置)
3. [运行测试](#运行测试)
4. [调试测试](#调试测试)
5. [常见问题](#常见问题)
6. [CI/CD配置](#cicd配置)

---

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行所有测试

```bash
# Windows
npm test

# Unix/Linux
NODE_ENV=test npm test
```

### 运行特定测试套件

```bash
# 单元测试
npx jest tests/unit/ --maxWorkers=1

# 集成测试
npx jest tests/integration/ --maxWorkers=1

# 查询验证系统测试
npx jest tests/integration/query-verification-system.test.js --maxWorkers=1
```

---

## 测试环境配置

### 必需的环境变量

在 `.env.test` 文件中配置：

```env
# 测试环境标识
NODE_ENV=test

# MongoDB (使用 MongoDB Memory Server)
MONGO_URI=mongodb://localhost:27017/smart-village-test

# JWT密钥
JWT_SECRET=test-jwt-secret-key-2024

# Redis (可选)
REDIS_URL=redis://localhost:6379

# API端口
PORT=3001
API_PORT=3001

# 客户端URL
CLIENT_URL=http://localhost:3000

# 外部服务密钥 (测试用)
BAIDU_API_KEY=test_key
BAIDU_SECRET_KEY=test_secret
TENCENT_SECRET_ID=test_secret_id
TENCENT_SECRET_KEY=test_secret_key
ALIYUN_ACCESS_KEY_ID=test_access_key
ALIYUN_ACCESS_KEY_SECRET=test_secret
SMS_API_KEY=test_sms_key
SMS_API_SECRET=test_sms_secret
```

### 测试数据库

项目使用 MongoDB Memory Server 进行测试，无需本地 MongoDB：

```javascript
// tests/setup.js 自动配置
{
  "MongoBinary": {
    "downloadDir": "./node_modules/.cache/mongodb-memory-server"
  }
}
```

---

## 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行单元测试
npx jest tests/unit/

# 运行集成测试
npx jest tests/integration/

# 运行特定测试文件
npx jest tests/integration/query-verification-system.test.js

# 运行特定测试用例
npx jest -t "应该成功进行人脸验证"

# 监听模式（开发时使用）
npm run test:watch
```

### Jest 选项

```bash
# 单线程运行（推荐用于集成测试）
--maxWorkers=1

# 超时设置
--testTimeout=30000

# 详细输出
--verbose

# 覆盖率报告
--coverage

# 不生成覆盖率（更快）
--no-coverage

# 更新快照
--updateSnapshot
```

### 常用测试命令组合

```bash
# 快速单元测试
npx jest tests/unit/ --maxWorkers=1 --no-coverage

# 完整集成测试
npx jest tests/integration/ --maxWorkers=1 --testTimeout=30000 --no-coverage

# 查询验证系统测试
npx jest tests/integration/query-verification-system.test.js --maxWorkers=1 --no-coverage

# 性能测试
npx jest tests/performance/ --maxWorkers=1 --no-coverage

# 安全测试
npx jest tests/security/ --maxWorkers=1 --no-coverage
```

---

## 调试测试

### VSCode 调试配置

在 `.vscode/launch.json` 中添加：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "${fileBasename}",
        "--config",
        "jest.config.js",
        "--no-coverage",
        "--maxWorkers=1"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: All Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--config",
        "jest.config.js",
        "--no-coverage",
        "--maxWorkers=1"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 调试技巧

#### 1. 使用 console.log

```javascript
test('应该成功', () => {
  console.log('当前值:', someValue);
  expect(someValue).toBe(expected);
});
```

#### 2. 使用 Jest 的调试模式

```bash
# Node.js 调试
node --inspect-brk node_modules/.bin/jest --runInBand

# Chrome DevTools 调试
node --inspect-brk node_modules/.bin/jest --runInBand
# 然后在 Chrome 中打开 chrome://inspect
```

#### 3. 只运行特定测试

```javascript
// 只运行这个测试
test.only('应该成功', () => {
  // ...
});

// 跳过这个测试
test.skip('应该成功', () => {
  // ...
});
```

#### 4. 测试前/后钩子调试

```javascript
describe('测试套件', () => {
  beforeAll(() => {
    console.log('测试套件开始前执行');
  });

  beforeEach(() => {
    console.log('每个测试前执行');
  });

  afterEach(() => {
    console.log('每个测试后执行');
  });

  afterAll(() => {
    console.log('测试套件结束后执行');
  });
});
```

---

## 常见问题

### 1. 测试超时

**问题**: 测试运行超过默认超时时间

**解决方案**:
```bash
# 增加超时时间
npx jest tests/integration/ --testTimeout=60000

# 在测试中指定超时
test('应该完成', async () => {
  // ...
}, 30000); // 30秒超时
```

### 2. 数据库连接失败

**问题**: MongoDB 连接错误

**解决方案**:
```bash
# 确保设置了测试环境
export NODE_ENV=test

# 或使用 .env.test 文件
cp .env.test.example .env.test
```

### 3. Jest 无法退出

**问题**: 测试完成后 Jest 不退出

**原因**: 未清理的定时器或数据库连接

**解决方案**:
```javascript
// 在测试文件中添加
afterAll(async () => {
  // 清理数据库连接
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  // 停止定时器
  if (serviceInstance) {
    serviceInstance.stopProcessing();
  }
});
```

### 4. 测试隔离问题

**问题**: 测试之间互相影响

**解决方案**:
```javascript
// 使用 jest.clearAllMocks()
beforeEach(() => {
  jest.clearAllMocks();
});

// 重置模块
beforeEach(() => {
  jest.resetModules();
});

// 使用独立的测试数据库
let uniqueDbName = `test_${Date.now()}_${Math.random()}`;
```

### 5. Mock 不生效

**问题**: Mock 函数没有被调用

**解决方案**:
```javascript
// 确保在使用前 mock
jest.mock('../service');

// 导入时必须在使用 mock 之后
const service = require('../service');

// 使用 jest.spyOn
const spy = jest.spyOn(service, 'method').mockReturnValue(value);
```

---

## CI/CD 配置

### GitHub Actions 配置

项目使用 GitHub Actions 进行持续集成。配置文件：`.github/workflows/ci.yml`

#### 关键配置

```yaml
env:
  NODE_VERSION: '20'  # 匹配 package.json 要求
  MONGO_VERSION: '5.0'
  REDIS_VERSION: '6'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:${{ env.MONGO_VERSION }}
        ports:
          - 27017:27017
    steps:
      - run: npx jest tests/unit/ --maxWorkers=1 --no-coverage
        env:
          NODE_ENV: test
          MONGO_URI: mongodb://localhost:27017/test
          JWT_SECRET: test-secret
```

### 本地 CI 测试

```bash
# 模拟 CI 环境运行测试
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# 运行 CI 中的测试套件
npx jest tests/unit/ --maxWorkers=1 --no-coverage
npx jest tests/integration/ --maxWorkers=1 --no-coverage --testTimeout=30000
```

---

## 测试最佳实践

### 1. 测试命名规范

```javascript
// 好的命名
test('应该成功创建用户', async () => { });
test('应该在密码错误时返回401', async () => { });

// 避免模糊的命名
test('测试用户创建', async () => { });
test('测试用户', async () => { });
```

### 2. 测试结构

```javascript
describe('UserService', () => {
  // 准备测试数据
  let userService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('createUser', () => {
    test('应该成功创建用户', async () => {
      // Arrange (准备)
      const userData = { name: '张三', age: 30 };

      // Act (执行)
      const result = await userService.createUser(userData);

      // Assert (断言)
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('张三');
    });
  });
});
```

### 3. Mock 使用

```javascript
// Mock 外部服务
jest.mock('../services/externalService');

// 创建可预测的返回
beforeEach(() => {
  externalService.getData.mockResolvedValue({ data: 'test' });
});

// 清理 mock
afterEach(() => {
  jest.clearAllMocks();
});
```

### 4. 异步测试

```javascript
// 使用 async/await
test('应该返回数据', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// 使用 Promise
test('应该成功', () => {
  return fetchData().then(result => {
    expect(result).toBe('success');
  });
});

// 使用 .resolves / .rejects
test('应该成功', async () => {
  await expect(fetchData()).resolves.toBe('success');
});

test('应该失败', async () => {
  await expect(fetchData()).rejects.toThrow('Error');
});
```

---

## 测试覆盖率

### 生成覆盖率报告

```bash
# 生成覆盖率报告
npx jest --coverage

# 查看特定目录覆盖率
npx jest tests/unit/ --coverage --collectCoverageFrom=src/services/

# 设置覆盖率阈值
npx jest --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

### 覆盖率配置

在 `jest.config.js` 中：

```javascript
module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

---

## 性能测试

### 运行性能测试

```bash
# 使用 Artillery 进行负载测试
npm install -g artillery
artillery run tests/performance/load-test.yml

# 使用 Jest 性能测试
npx jest tests/performance/ --maxWorkers=1
```

### 性能基准

当前性能基准（参考值）：

| 操作 | 预期响应时间 |
|------|--------------|
| API健康检查 | < 100ms |
| 用户登录 | < 500ms |
| 数据查询 | < 1000ms |
| 批量操作 | < 3000ms |

---

## 调试资源

### 有用的 Jest 命令

```bash
# 列出所有测试
npx jest --listTests

# 运行失败的测试
npx jest --onlyFailures

# 查找测试
npxjest --findRelatedTests tests/integration/

# 生成测试文档
npx jest --generateOutput
```

### 日志级别配置

```javascript
// 在测试中设置日志级别
process.env.LOG_LEVEL = 'error'; // 只显示错误日志
process.env.LOG_LEVEL = 'debug'; // 显示详细日志
```

---

## 更新日志

- **2024-12-27**: 创建文档
- **2024-12-27**: 添加 setInterval 问题修复说明
- **2024-12-27**: 添加 CI/CD 配置指南
