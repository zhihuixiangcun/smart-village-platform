# 智慧乡村综合服务平台 - 开发者指南

## 目录

- [开发环境搭建](#开发环境搭建)
- [项目结构说明](#项目结构说明)
- [本地开发](#本地开发)
- [调试技巧](#调试技巧)
- [测试指南](#测试指南)
- [代码规范](#代码规范)
- [Git工作流](#git工作流)
- [常见问题](#常见问题)

---

## 开发环境搭建

### 必需软件

| 软件 | 版本要求 | 用途 |
|-----|---------|------|
| Node.js | >= 20.17.0 | 运行时环境 |
| npm | >= 10.0.0 | 包管理器 |
| MongoDB | >= 6.0 | 数据库 (可选) |
| VS Code | 最新 | 推荐IDE |

### 推荐软件

| 软件 | 用途 |
|-----|------|
| Git | 版本控制 |
| Postman | API测试 |
| Redis Desktop Manager | Redis可视化管理 |
| MongoDB Compass | MongoDB可视化管理 |
| Chrome DevTools | 前端调试 |

### 快速安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/zhihuixiangcun/smart-village-platform.git
cd smart-village-platform
```

#### 2. 安装依赖

```bash
# 安装所有依赖 (根目录 + 客户端)
npm run init

# 或分别安装
npm install
cd client && npm install
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env
```

#### 4. 初始化数据库

```bash
# 启动MongoDB (如使用Docker)
docker-compose up -d mongodb

# 初始化数据库
npm run init-db

# 创建测试数据
node scripts/create-demo-data.js
```

#### 5. 启动开发服务

```bash
# 方式一: 分别启动 (推荐用于调试)
npm run dev          # 终端1: 启动后端服务 (3001)
npm run client       # 终端2: 启动前端服务 (3006)

# 方式二: 同时启动
npm run dev:servers
```

---

## 项目结构说明

### 根目录结构

```
smart-village-platform/
├── src/                        # 主API服务器
│   ├── app.js                  # 主服务入口
│   ├── routes/                 # API路由 (70+ 文件)
│   ├── controllers/            # 控制器 (30+ 文件)
│   ├── models/                 # 数据模型 (80+ 文件)
│   ├── services/               # 业务服务
│   ├── middleware/             # 中间件
│   ├── utils/                  # 工具函数
│   ├── config/                 # 配置文件
│   ├── security/               # 安全模块
│   ├── monitoring/             # 监控系统
│   ├── integrator/             # 实时计算引擎
│   └── i18n/                   # 国际化
│
├── server/                     # 村务服务器
│   └── app.js                  # 村务服务入口
│
├── client/                     # Vue.js前端
│   ├── src/
│   │   ├── views/              # 页面组件
│   │   ├── components/         # 公共组件
│   │   ├── api/                # API调用
│   │   ├── router/             # 路由配置
│   │   ├── stores/             # Pinia状态
│   │   ├── utils/              # 工具函数
│   │   └── assets/             # 静态资源
│   ├── vite.config.js          # Vite配置
│   └── package.json
│
├── tests/                      # 测试文件
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   ├── e2e/                    # 端到端测试
│   └── edge-cases/             # 边界测试
│
├── docs/                       # 项目文档
├── scripts/                    # 脚本文件
├── deployment/                 # 部署配置
├── public/                     # 静态资源
└── package.json
```

### 前端目录详解

```
client/src/
├── views/                      # 页面组件
│   ├── auth/                   # 认证相关
│   │   ├── LoginView.vue
│   │   └── RegisterView.vue
│   ├── dashboard/              # 仪表板
│   │   └── DashboardView.vue
│   ├── residents/              # 村民管理
│   │   ├── ResidentList.vue
│   │   └── ResidentDetail.vue
│   ├── governance/             # 村务治理
│   │   ├── Announcements.vue
│   │   └── Voting.vue
│   ├── finance/                # 财务管理
│   │   └── FinanceView.vue
│   └── emergency/              # 应急管理
│       └── EmergencyView.vue
│
├── components/                 # 公共组件
│   ├── base/                   # 基础组件
│   │   ├── Button.vue
│   │   └── Input.vue
│   └── business/               # 业务组件
│       ├── ResidentCard.vue
│       └── FinanceChart.vue
│
├── api/                        # API调用
│   ├── index.js                # Axios实例配置
│   ├── auth.js                 # 认证API
│   ├── residents.js            # 村民API
│   └── finance.js              # 财务API
│
├── router/                     # 路由配置
│   └── index.js                # 路由定义
│
├── stores/                     # Pinia状态
│   ├── user.js                 # 用户状态
│   ├── resident.js             # 村民状态
│   └── app.js                  # 应用状态
│
├── utils/                      # 工具函数
│   ├── request.js              # HTTP封装
│   ├── validators.js           # 表单验证
│   └── formatters.js           # 数据格式化
│
├── composables/                # 组合式函数
│   ├── useAuth.js              # 认证逻辑
│   └── useApi.js               # API调用
│
└── assets/                     # 静态资源
    ├── styles/                 # 样式文件
    ├── images/                 # 图片资源
    └── icons/                  # 图标资源
```

### 后端目录详解

```
src/
├── routes/                     # API路由
│   ├── auth.js                 # 认证路由
│   ├── residents.js            # 村民路由
│   ├── governance.js           # 治理路由
│   ├── finance.js              # 财务路由
│   └── emergency.js            # 应急路由
│
├── controllers/                # 控制器
│   ├── authController.js       # 认证控制器
│   ├── residentController.js   # 村民控制器
│   └── financeController.js    # 财务控制器
│
├── models/                     # 数据模型
│   ├── User.js                 # 用户模型
│   ├── Resident.js             # 村民模型
│   ├── Household.js            # 户籍模型
│   └── Finance.js              # 财务模型
│
├── services/                   # 业务服务
│   ├── authService.js          # 认证服务
│   ├── residentService.js      # 村民服务
│   └── emailService.js         # 邮件服务
│
├── middleware/                 # 中间件
│   ├── auth.js                 # 认证中间件
│   ├── validation.js           # 验证中间件
│   ├── errorHandler.js         # 错误处理
│   └── rateLimit.js            # 限流中间件
│
├── utils/                      # 工具函数
│   ├── logger.js               # 日志工具
│   ├── encryption.js           # 加密工具
│   └── validators.js           # 验证工具
│
├── config/                     # 配置文件
│   ├── database.js             # 数据库配置
│   └── redis.js                # Redis配置
│
└── app.js                      # 主应用入口
```

---

## 本地开发

### 开发命令

```bash
# 启动主API服务 (Port 3001)
npm run dev

# 启动前端开发服务 (Port 3006)
npm run client

# 同时启动前后端
npm run dev:servers

# 构建前端
npm run build

# 运行测试
npm test
npm run test:watch
npm run test:coverage

# 代码检查
npm run lint
npm run format
```

### 热重载开发

#### 前端热重载

前端使用Vite，支持原生ES模块热重载：

```javascript
// 修改Vue组件后自动刷新
// client/src/views/DashboardView.vue
<template>
  <div>
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('智慧乡村平台')
// 修改后自动热更新
</script>
```

#### 后端热重载

使用nodemon实现后端热重载：

```bash
# 安装nodemon
npm install -g nodemon

# 使用nodemon启动
nodemon src/app.js
```

nodemon配置 (`nodemon.json`):
```json
{
  "watch": ["src"],
  "ext": "js,json",
  "ignore": ["tests", "coverage"],
  "exec": "node src/app.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### 调试配置

#### VS Code调试配置

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动主API服务",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/app.js",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3001"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "启动村务服务",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/server/app.js",
      "env": {
        "NODE_ENV": "development",
        "PORT": "5000"
      }
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "启动前端调试",
      "url": "http://localhost:3006",
      "webRoot": "${workspaceFolder}/client/src"
    },
    {
      "name": "运行当前Jest测试",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-cache",
        "${fileBasename}"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## 调试技巧

### 后端调试

#### 1. 使用Chrome DevTools调试Node.js

启动时添加inspect参数:
```bash
node --inspect=0.0.0.0:9229 src/app.js
```

然后在Chrome中打开 `chrome://inspect` 进行调试。

#### 2. 使用debug模块

```javascript
const debug = require('debug')('app:server');

debug('Server starting on port %d', 3001);

// 设置环境变量启用调试
// DEBUG=app:* npm run dev
```

#### 3. 使用Winston日志

```javascript
const logger = require('./utils/logger');

logger.info('Server started', { port: 3001 });
logger.warn('Memory usage high', { usage: '85%' });
logger.error('Database connection failed', { error: err });
```

### 前端调试

#### 1. Vue DevTools

安装浏览器扩展:
- Chrome: Vue.js devtools
- Firefox: Vue.js devtools

#### 2. Console调试

```javascript
// 在Vue组件中使用
console.log('Current user:', user.value)

// 使用Vue DevTools
// 在浏览器中查看组件状态、Pinia store、路由等
```

#### 3. Network调试

```javascript
// 在api/index.js中添加拦截器
axios.interceptors.request.use(config => {
  console.log('API Request:', config)
  return config
})

axios.interceptors.response.use(response => {
  console.log('API Response:', response)
  return response
})
```

---

## 测试指南

### 测试命令

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 覆盖率报告
npm run test:coverage

# 运行特定测试
npm test -- --testNamePattern="resident"

# 运行特定测试文件
npm test -- tests/unit/resident.test.js
```

### 单元测试示例

```javascript
// tests/unit/resident.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Resident API', () => {
  let authToken;

  beforeAll(async () => {
    // 登录获取token
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'password123'
      });
    authToken = res.body.data.token;
  });

  describe('GET /api/v1/residents', () => {
    it('should return residents list', async () => {
      const res = await request(app)
        .get('/api/v1/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by name', async () => {
      const res = await request(app)
        .get('/api/v1/residents?name=张')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.every(r => r.name.includes('张'))).toBe(true);
    });
  });

  describe('POST /api/v1/residents', () => {
    it('should create new resident', async () => {
      const residentData = {
        name: '测试村民',
        idCard: '110101199001011234',
        phone: '13800138000',
        householdId: 'TEST001'
      };

      const res = await request(app)
        .post('/api/v1/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(residentData)
        .expect(201);

      expect(res.body.data.name).toBe('测试村民');
      expect(res.body.data.idCard).toBeDefined();
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
```

### 集成测试示例

```javascript
// tests/integration/resident-flow.test.js
const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const Resident = require('../../src/models/Resident');

describe('Resident Management Flow', () => {
  let authToken;
  let residentId;

  beforeAll(async () => {
    // 连接测试数据库
    await mongoose.connect(process.env.MONGO_TEST_URI);

    // 创建测试用户并登录
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = res.body.data.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should complete resident lifecycle', async () => {
    // 1. 创建村民
    const createRes = await request(app)
      .post('/api/v1/residents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '张三',
        idCard: '110101199001011234',
        phone: '13800138000'
      });

    expect(createRes.status).toBe(201);
    residentId = createRes.body.data.id;

    // 2. 查询村民
    const getRes = await request(app)
      .get(`/api/v1/residents/${residentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getRes.body.data.name).toBe('张三');

    // 3. 更新村民
    const updateRes = await request(app)
      .put(`/api/v1/residents/${residentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ phone: '13900139000' });

    expect(updateRes.body.data.phone).toBe('13900139000');

    // 4. 删除村民
    const deleteRes = await request(app)
      .delete(`/api/v1/residents/${residentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteRes.status).toBe(200);
  });
});
```

---

## 代码规范

### JavaScript规范

使用ESLint + Prettier进行代码检查和格式化：

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint -- --fix

# 格式化代码
npm run format
```

ESLint配置 (`.eslintrc.js`):
```javascript
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single']
  }
};
```

### Vue组件规范

```vue
<template>
  <!-- 使用kebab-case命名HTML属性 -->
  <div class="resident-card">
    <h2>{{ residentName }}</h2>
    <button @click="handleEdit">编辑</button>
  </div>
</template>

<script setup>
// 使用Composition API
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// 定义props
const props = defineProps({
  residentId: {
    type: String,
    required: true
  }
})

// 定义emits
const emit = defineEmits(['update', 'delete'])

// 响应式数据
const resident = ref(null)
const loading = ref(false)

// 计算属性
const residentName = computed(() => {
  return resident.value?.name || '未知'
})

// 方法
const handleEdit = () => {
  emit('update', resident.value)
}

// 生命周期
onMounted(async () => {
  await loadResident()
})

// 异步方法
async function loadResident() {
  loading.value = true
  try {
    // 加载数据
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 使用scoped样式避免污染 */
.resident-card {
  padding: 1rem;
}
</style>
```

### 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 文件名 | kebab-case | `resident-list.js` |
| 组件名 | PascalCase | `ResidentList.vue` |
| 变量/函数 | camelCase | `getResidentById()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| 类 | PascalCase | `class UserService` |
| 私有变量 | 下划线前缀 | `_privateMethod` |

---

## Git工作流

### 分支策略

```
main          - 生产分支，受保护
├── develop   - 开发分支
    ├── feature/xxx   - 功能分支
    ├── bugfix/xxx    - 修复分支
    └── hotfix/xxx    - 紧急修复分支
```

### 提交规范

使用Conventional Commits规范：

```bash
# 格式
<type>(<scope>): <subject>

<body>

<footer>
```

类型:
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例:
```bash
git commit -m "feat(residents): add resident search by name

Implement full-text search for resident names using
MongoDB text indexing for better performance.

Closes #123"
```

### 开发流程

```bash
# 1. 从develop创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/add-resident-export

# 2. 开发并提交
git add .
git commit -m "feat: add resident export to Excel"

# 3. 推送到远程
git push origin feature/add-resident-export

# 4. 创建Pull Request到develop

# 5. 代码审查通过后合并

# 6. 删除分支
git branch -d feature/add-resident-export
```

---

## 常见问题

### 端口占用

```bash
# 查找占用端口的进程
netstat -ano | findstr :3001

# 或使用lsof (Linux/Mac)
lsof -i :3001

# 终止进程
taskkill /PID <PID> /F
```

### MongoDB连接失败

```bash
# 检查MongoDB状态
systemctl status mongod

# 启动MongoDB
systemctl start mongod

# 使用Docker启动
docker-compose up -d mongodb
```

### 模块导入错误

```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install

# 或使用npm ci
npm ci
```

### 前端构建失败

```bash
# 清除dist目录重新构建
cd client
rm -rf dist node_modules/.vite
npm run build
```

### 测试失败

```bash
# 使用详细模式运行测试
npm test -- --verbose

# 单独运行失败的测试
npm test -- --testNamePattern="should create resident"
```

---

## 有用的资源

### 官方文档

- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Element Plus](https://element-plus.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://docs.mongodb.com/)
- [Mongoose](https://mongoosejs.com/)
- [Jest](https://jestjs.io/)

### 社区资源

- [Stack Overflow](https://stackoverflow.com/)
- [GitHub Issues](https://github.com/zhihuixiangcun/smart-village-platform/issues)

---

本文档持续更新中...
