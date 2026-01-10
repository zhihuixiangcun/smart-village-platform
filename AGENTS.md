# Smart Village Platform - 开发指南

本文档为开发人员提供代码库的关键信息，包括构建命令、测试命令和代码风格规范。

## 项目结构

- **主服务**: `src/app.js` (端口 3001) - API服务器，包含监控、i18n、通知系统
- **村务服务**: `server/app.js` (端口 5000) - 村务服务，Socket.IO实时通信
- **前端**: `client/` - Vue 3 + Vite + Element Plus

## 核心命令

### 开发启动

```bash
# 安装依赖
npm run init

# 启动主服务 (端口3001)
npm run dev

# 启动前端开发服务器 (端口3000)
npm run client

# 同时启动两个服务
npm run dev && npm run client

# 构建生产前端
npm run build
```

### 测试命令

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 运行特定模块测试
npm run test:residents

# 运行综合测试
npm run test:comprehensive

# 运行性能测试
npm run test:performance

# 运行安全测试
npm run test:security

# 单个测试文件 (推荐方式)
NODE_ENV=test npx jest tests/unit/example.test.js

# 单个测试文件带配置
NODE_ENV=test jest --config tests/jest.config.comprehensive.js --testNamePattern="residents"
```

### 代码质量

```bash
# ESLint 检查并修复
npm run lint

# 前端代码检查
npm run lint:client

# 代码格式化
npm run format

# 检查格式是否符合要求
npm run format:check

# 前端代码格式化
npm run format:client

# 完整质量检查
npm run code-quality
```

### 数据库命令

```bash
# 初始化数据库
npm run init-db

# 启动数据库
npm run database:start

# 重置数据库
npm run database:reset

# 查看数据库状态
npm run database:status
```

## 代码风格规范

### 导入规范

```javascript
// 1. Node.js 内置模块
const path = require('path');
const crypto = require('crypto');

// 2. 第三方模块
const express = require('express');
const mongoose = require('mongoose');

// 3. 项目内部模块 (按相对路径排序)
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const User = require('./models/User');
```

### 命名约定

```javascript
// 变量和函数: 小驼峰
const villageId = 'village_001';
function getResidentInfo() { }

// 常量: 全大写下划线分隔
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;

// 类: 大驼峰
class VillageService { }
class ResidentController { }

// 文件: 小写下划线
const residentController = require('./controllers/resident_controller');
const authMiddleware = require('./middleware/auth');

// 路由路径: 连字符
app.use('/api/v1/residents', residentsRoutes);
```

### 格式化规则

- **缩进**: 2个空格
- **引号**: 单引号优先
- **分号**: 必须使用
- **尾逗号**: 仅多行时使用 (ES5兼容)
- **行宽**: 100字符

```javascript
// 正确示例
const config = {
  name: 'smart-village',
  version: '1.0.0',
  features: ['residents', 'governance'],
};

async function createResident(data) {
  const resident = new Resident(data);
  return await resident.save();
}

// 错误示例 (禁止)
const config = {name: 'test',version: '1.0.0'};
function createResident(data) {
  return (new Resident(data)).save();
}
```

### 错误处理

```javascript
// 1. 异步函数使用 try/catch
async function getResident(req, res) {
  try {
    const resident = await Resident.findById(req.params.id);
    if (!resident) {
      return res.status(404).json({ success: false, error: '村民不存在' });
    }
    res.json({ success: true, data: resident });
  } catch (error) {
    console.error('获取村民信息失败:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
}

// 2. Promise 拒绝使用 Error 对象
Promise.reject(new Error('操作失败'));

// 3. 禁止直接抛出字符串
// 错误: throw 'error message';
// 正确: throw new Error('error message');
```

### 异步代码

```javascript
// 优先使用 async/await
async function processVillageData(villageId) {
  const data = await fetchVillageData(villageId);
  return transformData(data);
}

// 使用 Promise.all 并行处理
const [residents, announcements] = await Promise.all([
  Resident.find({ villageId }),
  Announcement.find({ villageId }).sort({ createdAt: -1 }),
]);
```

### 注释规范

```javascript
// 1. 单行注释 (空格后书写)
function calculateScore() {
  // 基础分值为0
  let score = 0;
  score += calculateBaseScore();
}

// 2. 多行注释
/**
 * 获取村民信息
 * @param {string} id - 村民ID
 * @returns {Promise<Object>} 村民信息对象
 */

// 3. TODO 注释注明负责人
// TODO(@username): 需要优化数据库查询性能
```

### 安全实践

```javascript
// 1. 禁止使用 eval
// 2. 禁止直接拼接 SQL
// 3. 敏感信息必须脱敏
const MONGO_URI = process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');

// 4. 使用参数化查询
const user = await User.findOne({ username, villageId });

// 5. 限制请求体大小
app.use(express.json({ limit: '5mb' }));
```

### API响应格式

```javascript
// 成功响应
res.json({
  success: true,
  data: result,
  message: '操作成功',
});

// 错误响应
res.status(400).json({
  success: false,
  error: '参数错误',
  message: error.message,
});

// 分页响应
res.json({
  success: true,
  data: items,
  pagination: {
    page: 1,
    limit: 20,
    total: 100,
  },
});
```

## 前端规范 (Vue 3)

```javascript
// 组件命名: 大驼峰
import ResidentCard from '@/components/ResidentCard.vue';

// Props 定义
const props = defineProps({
  villageId: { type: String, required: true },
  residents: { type: Array, default: () => [] },
});

// 事件emit
const emit = defineEmits(['update', 'delete']);

// 组合式API优先
import { ref, computed, onMounted } from 'vue';
const count = ref(0);
```

## 关键配置

- **ESLint配置**: `.eslintrc.js`
- **Prettier配置**: `.prettierrc`
- **数据库**: MongoDB (通过 `src/config/database.js` 配置)
- **环境变量**: `.env` 文件

## 注意事项

1. 某些路由模块因依赖问题已临时禁用，修改前请检查 `src/app.js` 中的注释
2. 生产环境使用 `NODE_ENV=production` 启动
3. 实时计算引擎默认禁用以避免启动问题
4. 测试时请使用 `maxWorkers: 1` 避免数据库冲突
