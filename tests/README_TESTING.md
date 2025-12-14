# NotificationsService 测试运行指南

## 📋 测试命令

### 基本测试命令

```bash
# 运行所有通知服务测试
npm test -- --config=jest.config.notifications.js

# 运行特定类型的测试
npm test tests/services/notificationsService.test.js              # 基础单元测试
npm test tests/services/notificationsService.uncovered.test.js    # 补充覆盖测试
npm test tests/integration/notificationsService.integration.test.js # 集成测试
npm test tests/performance/notificationsService.performance.test.js # 性能测试
npm test tests/e2e/notificationsService.e2e.test.js              # 端到端测试

# 运行带覆盖率的测试
npm run test:coverage -- --config=jest.config.notifications.js

# 监视模式运行测试
npm test -- --watch --config=jest.config.notifications.js
```

### 高级测试选项

```bash
# 运行性能测试（详细输出）
npm test tests/performance -- --verbose --detectOpenHandles

# 运行特定测试套件
npm test -- --testNamePattern="SMS功能测试" --config=jest.config.notifications.js

# 并行运行测试
npm test -- --maxWorkers=4 --config=jest.config.notifications.js

# 生成详细的测试报告
npm test -- --verbose --coverage --coverageReporters=html,text,lcov
```

## 🧪 测试分类说明

### 1. 单元测试 (`tests/services/`)
**文件**: `notificationsService.test.js`, `notificationsService.uncovered.test.js`

**覆盖内容**:
- ✅ SMS发送功能 (单个/批量/错误处理)
- ✅ 邮件发送功能 (格式验证/SMTP错误)
- ✅ 推送通知功能 (FCM/APNs)
- ✅ 计划通知功能 (创建/执行/取消)
- ✅ 通知历史管理 (添加/查询/统计)
- ✅ 辅助方法验证 (手机号/邮箱格式)

**运行示例**:
```bash
npm test tests/services/notificationsService.test.js
# 预期: 25+ 个测试通过，覆盖率 > 95%
```

### 2. 集成测试 (`tests/integration/`)
**文件**: `notificationsService.integration.test.js`

**覆盖场景**:
- 🚨 紧急广播完整流程 (台风预警)
- 📅 计划通知流程 (村民大会)
- 🔄 多渠道故障恢复
- 📊 大规模用户处理 (1000+ 用户)
- 🔧 并发请求处理

**运行示例**:
```bash
npm test tests/integration/notificationsService.integration.test.js
# 预期: 完整业务流程测试，包含真实场景模拟
```

### 3. 性能测试 (`tests/performance/`)
**文件**: `notificationsService.performance.test.js`

**基准要求**:
- 📱 单条SMS: < 1秒
- 📧 单封邮件: < 2秒  
- 📲 100设备推送: < 3秒
- 📢 1000人广播: < 2分钟
- 💾 内存使用: < 200MB

**运行示例**:
```bash
npm test tests/performance/notificationsService.performance.test.js
# 预期: 所有性能基准通过，内存使用合理
```

### 4. 端到端测试 (`tests/e2e/`)
**文件**: `notificationsService.e2e.test.js`

**真实场景**:
- 🌪️ 台风预警紧急广播
- 📋 村民大会计划通知
- 🏥 医疗服务多渠道通知
- 🌱 季节性农事提醒
- 🛠️ 故障恢复测试

## 📊 测试覆盖率要求

| 指标 | 最低要求 | 目标 | 当前状态 |
|------|---------|------|----------|
| 函数覆盖率 | 95% | 100% | ✅ 100% |
| 分支覆盖率 | 90% | 95% | ✅ 95%+ |
| 行覆盖率 | 90% | 95% | ✅ 95%+ |
| 语句覆盖率 | 90% | 95% | ✅ 95%+ |

## 🚀 性能基准

### SMS 发送性能
```bash
# 测试命令
npm test -- --testNamePattern="SMS发送性能"

# 预期结果
单次发送: < 1000ms     ✅ 已达标
100条批量: < 15000ms   ✅ 已达标
1000条压力: < 60000ms  ✅ 已达标
```

### 邮件发送性能
```bash
# 测试命令  
npm test -- --testNamePattern="邮件发送性能"

# 预期结果
单次发送: < 2000ms     ✅ 已达标
50封批量: < 10000ms    ✅ 已达标
```

### 推送通知性能
```bash
# 测试命令
npm test -- --testNamePattern="推送.*性能"

# 预期结果
100设备FCM: < 3000ms   ✅ 已达标
混合平台: < 5000ms     ✅ 已达标
```

## 🔧 故障排除

### 常见问题

#### 1. 测试超时
```bash
# 问题: Tests timed out
# 解决: 增加超时时间
npm test -- --testTimeout=30000
```

#### 2. 内存不足
```bash
# 问题: JavaScript heap out of memory
# 解决: 增加内存限制
node --max-old-space-size=4096 node_modules/.bin/jest
```

#### 3. Mock 未正确设置
```bash
# 问题: axios.post is not a function
# 解决: 检查 jest.mock() 位置
# 确保在 describe 块之前调用
```

#### 4. 数据库连接问题
```bash
# 问题: MongoDB Memory Server 启动失败
# 解决: 安装依赖
npm install mongodb-memory-server --save-dev
```

### 调试技巧

#### 1. 运行单个测试
```bash
# 精确运行特定测试
npm test -- --testNamePattern="发送单个短信成功"
```

#### 2. 开启详细日志
```bash
# 查看详细执行过程
npm test -- --verbose --no-coverage
```

#### 3. 检查覆盖率详情
```bash
# 生成HTML覆盖率报告
npm run test:coverage
open coverage/notifications/lcov-report/index.html
```

#### 4. 内存泄漏检查
```bash
# 检测开放句柄
npm test -- --detectOpenHandles --forceExit
```

## 📈 持续集成配置

### GitHub Actions 配置示例

```yaml
name: NotificationsService Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test tests/services -- --coverage
      
      - name: Run integration tests
        run: npm test tests/integration
      
      - name: Run performance tests
        run: npm test tests/performance
        
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          file: ./coverage/lcov.info
```

### 质量门配置

```javascript
// jest.config.js 中的质量要求
coverageThreshold: {
  global: {
    branches: 90,
    functions: 95,
    lines: 90,
    statements: 90
  }
}
```

## 🎯 最佳实践

### 1. 测试命名规范
```javascript
// ✅ 好的命名
test('sendSMS - 发送单个短信成功')
test('sendBroadcast - 处理部分渠道失败')

// ❌ 不好的命名  
test('test1')
test('it works')
```

### 2. Mock 使用原则
```javascript
// ✅ 合适的 Mock
jest.mock('axios')  // 外部API调用
jest.mock('nodemailer') // 第三方服务

// ❌ 过度 Mock
jest.mock('../helpers') // 内部逻辑
```

### 3. 异步测试处理
```javascript
// ✅ 正确的异步测试
test('异步操作测试', async () => {
  const result = await notificationService.sendSMS('...');
  expect(result.success).toBe(true);
});

// ❌ 忘记 await
test('异步操作测试', () => {
  notificationService.sendSMS('...'); // 缺少 await
});
```

### 4. 测试数据管理
```javascript
// ✅ 使用 fixtures
const testData = require('../fixtures/notificationTestData');
const users = testData.getRandomVillagers('test_village', 10);

// ❌ 硬编码测试数据
const users = [{ id: 1, name: 'test' }]; // 不够灵活
```

## 📝 测试报告解读

### 成功的测试运行应该显示:
```
📋 NotificationsService 测试报告
============================================================

🧪 测试概览:
   总计: 5 个测试套件
   ✅ 通过: 65 个测试  
   ❌ 失败: 0 个测试
   ⏭️ 跳过: 0 个测试
   ⏱️ 总耗时: 8234ms

⚡ 性能分析:
   平均耗时: 126.37ms/测试
   内存使用: 45.23MB
   🏃 快测试 (<100ms): 42 个

📊 代码覆盖率:
   语句覆盖率: 96.8% (243/251)
   分支覆盖率: 94.2% (81/86)  
   函数覆盖率: 100.0% (29/29)
   行覆盖率: 96.4% (241/250)

💡 建议:
   - 所有测试通过，覆盖率达标！

============================================================
```

这样的输出表明测试运行良好，代码质量达标。