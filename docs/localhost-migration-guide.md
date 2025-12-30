# 硬编码 URL 迁移指南

## 概述

项目中存在 47 个文件包含硬编码的 localhost URL。本指南提供迁移步骤，将所有硬编码 URL 替换为环境变量配置。

## 配置文件

### 新增配置文件

1. **后端配置**: `src/config/service.config.js` - 集中的服务配置
2. **前端环境变量**: `client/.env.example` - 前端环境变量示例

## 后端文件迁移 (31 个文件)

### 需要迁移的文件列表

```
src\app.js
src\services\webSocketService.js
src\services\voice\voiceInteractionService.js
src\config\database.js
src\utils\codeGenerator.js
src\streaming\streamingMonitor.js
src\streaming\kafkaManager.js
src\streaming\flinkProcessor.js
src\services\voiceRecognitionService.js
src\services\realtimeNotification.js
src\services\ecommerceService.js
src\services\databaseShardingManager.js
src\routes\speech.js
src\routes\smartVillageAuth.js
src\messaging\MessageQueueManager.js
src\config\database-optimized.js
src\api\smartVillageAuth.js
src\streaming\sparkAnalytics.js
src\streaming\hudiDataLake.js
src\services\blockchainService.js
src\messaging\MessagingService.js
src\demo\service-demo.js
src\database\connectionPool.js
src\controllers\faceRecognitionController.js
src\app-unified.js
src\services\production-monitoring.js
src\services\database-manager.js
src\services\monitoringSystem.js
src\middleware\api-optimization.js
src\utils\apiDocumentation.js
src\security\production-security.js
```

### 迁移步骤

#### 步骤 1: 导入配置

```javascript
// 在文件顶部添加
const { getApiUrl, getWebSocketUrl, getClientUrl } = require('../config/service.config');
```

#### 步骤 2: 替换硬编码 URL

**替换前:**
```javascript
const apiUrl = 'http://localhost:3001/api/v1';
const wsUrl = 'ws://localhost:3001';
const mongoUrl = 'mongodb://localhost:27017/smart_village';
```

**替换后:**
```javascript
const apiUrl = getApiUrl('/api/v1');
const wsUrl = getWebSocketUrl();
const mongoUrl = process.env.MONGO_URI || config.database.mongo.uri;
```

### 示例迁移

#### 示例 1: webSocketService.js

**替换前:**
```javascript
const socket = io('http://localhost:3001', {
  transports: ['websocket']
});
```

**替换后:**
```javascript
const { getWebSocketUrl } = require('../config/service.config');

const socket = io(getWebSocketUrl(), {
  transports: ['websocket']
});
```

#### 示例 2: database.js

**替换前:**
```javascript
const mongoUri = 'mongodb://localhost:27017/smart_village';
```

**替换后:**
```javascript
const { config } = require('../config/service.config');
const mongoUri = process.env.MONGO_URI || config.database.mongo.uri;
```

## 前端文件迁移 (16 个文件)

### 需要迁移的文件列表

```
client\src\views\DashboardView.vue
client\src\views\auth\TestLogin.vue
client\src\test\setup.ts
client\src\test\mocks\api.ts
client\src\services\userFeedbackService.js
client\src\services\enhancedPermissionService.js
client\src\api\userApi.js
client\src\api\feedbackApi.js
client\src\composables\useVoiceInteraction.js
client\src\App.vue
client\src\components\analytics\Dashboard.vue
client\src\services\apiService.js (已使用环境变量，只需确认)
client\src\services\socket.js
client\src\utils\http.js
client\src\services\notificationService.js
client\src\api\agricultural.js
```

### 迁移步骤

#### 步骤 1: 创建环境变量文件

复制 `client/.env.example` 为 `client/.env.local`

```bash
cp client/.env.example client/.env.local
```

#### 步骤 2: 修改硬编码 URL

**替换前:**
```javascript
const API_URL = 'http://localhost:3001/api/v1';
const WS_URL = 'ws://localhost:3001';
```

**替换后:**
```javascript
const API_URL = import.meta.env.VITE_API_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
```

### 示例迁移

#### 示例 1: socket.js

**替换前:**
```javascript
const socket = io('http://localhost:3001');
```

**替换后:**
```javascript
const socket = io(import.meta.env.VITE_WS_URL);
```

#### 示例 2: DashboardView.vue

**替换前:**
```javascript
window.open('http://localhost:3001/monitoring', '_blank')
```

**替换后:**
```javascript
window.open(import.meta.env.VITE_MONITORING_URL, '_blank')
```

## 环境变量配置

### 后端 (.env)

在项目根目录的 `.env` 文件中添加/更新：

```bash
# API服务器
API_HOST=localhost
API_PORT=3001
API_PROTOCOL=http

# 村务服务器
VILLAGE_SERVER_HOST=localhost
VILLAGE_SERVER_PORT=5000

# 数据库
MONGO_URI=mongodb://localhost:27017/smart_village
MONGO_HOST=localhost
MONGO_PORT=27017

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# WebSocket
WS_HOST=localhost
WS_PORT=3001
WS_PROTOCOL=ws
```

### 前端 (client/.env.local)

```bash
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_VILLAGE_SERVER_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:3001
VITE_MONITORING_URL=http://localhost:3001/monitoring
```

## 验证

### 后端验证

```bash
# 检查配置加载
node -e "const cfg = require('./src/config/service.config'); console.log(cfg.config.api.baseUrl)"

# 启动服务器
npm start
```

### 前端验证

```bash
cd client
npm run dev
# 检查控制台输出中的 API_URL
```

## 迁移检查清单

- [ ] 创建 `src/config/service.config.js`
- [ ] 创建 `client/.env.local`
- [ ] 更新 `.env` 添加新配置
- [ ] 迁移后端文件 (31个)
- [ ] 迁移前端文件 (16个)
- [ ] 测试开发环境
- [ ] 测试生产环境配置
- [ ] 更新 CI/CD 配置

## 生产环境配置

### 后端生产环境变量

```bash
NODE_ENV=production
API_HOST=your-production-domain.com
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart_village
REDIS_HOST=redis-production.example.com
# ... 其他生产配置
```

### 前端生产环境变量

在构建时设置：

```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_MONITORING_URL=https://monitoring.your-domain.com
# ... 其他生产配置

npm run build
```

## 注意事项

1. **不要提交 .env 文件到版本控制**
2. **生产环境密钥使用密钥管理服务** (如 AWS Secrets Manager)
3. **更新所有相关文档**
4. **通知团队成员环境变量变更**
