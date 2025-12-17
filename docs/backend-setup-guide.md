# 后端双服务器搭建指南

## 1. 主API服务器 (Port 3001)

### 目录结构
```
src/
├── app.js              # 主应用入口
├── config/             # 配置文件
│   ├── database.js
│   ├── redis.js
│   └── env.js
├── middleware/         # 中间件
│   ├── auth.js
│   ├── errorHandler.js
│   ├── rateLimit.js
│   └── logging.js
├── routes/             # 路由
│   ├── auth.js
│   ├── monitoring.js
│   ├── stability.js
│   └── i18n.js
├── services/           # 服务层
│   ├── monitoringService.js
│   ├── stabilityService.js
│   └── i18nService.js
├── utils/              # 工具函数
└── constants/          # 常量定义
```

### app.js 基础配置
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// 路由导入
const authRoutes = require('./routes/auth');
const monitoringRoutes = require('./routes/monitoring');
const stabilityRoutes = require('./routes/stability');
const i18nRoutes = require('./routes/i18n');

// 中间件导入
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('./middleware/rateLimit');
const logger = require('./middleware/logging');

const app = express();
const PORT = process.env.MAIN_PORT || 3001;

// 基础中间件
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// 日志和请求解析
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 限流
app.use(rateLimit);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// API路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);
app.use('/api/v1/stability', stabilityRoutes);
app.use('/api/v1/i18n', i18nRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: 'API endpoint not found'
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Main API Server running on port ${PORT}`);
});

module.exports = app;
```

## 2. 村务服务器 (Port 5000)

### 目录结构
```
server/
├── app.js              # 村务服务入口
├── config/             # 配置
├── middleware/         # 中间件
├── routes/             # 业务路由
│   ├── residents.js
│   ├── committee.js
│   ├── finance.js
│   └── announcements.js
├── services/           # 业务服务
├── models/             # 数据模型
└── socket/             # Socket.IO处理
```

### app.js 基础配置
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.VILLAGE_PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('📱 User connected:', socket.id);

  // 加入村庄房间
  socket.on('join-village', (villageId) => {
    socket.join(`village-${villageId}`);
    console.log(`User ${socket.id} joined village ${villageId}`);
  });

  // 应急广播
  socket.on('emergency-broadcast', (data) => {
    io.to(`village-${data.villageId}`).emit('emergency', data);
  });

  socket.on('disconnect', () => {
    console.log('📱 User disconnected:', socket.id);
  });
});

// 业务路由
app.use('/api/v1/residents', require('./routes/residents'));
app.use('/api/v1/committee', require('./routes/committee'));
app.use('/api/v1/finance', require('./routes/finance'));

server.listen(PORT, () => {
  console.log(`🏘️ Village Service running on port ${PORT}`);
});

module.exports = { app, io };
```

## 3. 环境配置

### .env 配置文件
```env
# 服务器配置
NODE_ENV=development
MAIN_PORT=3001
VILLAGE_PORT=5000
CLIENT_URL=http://localhost:3000

# 数据库配置
MONGO_URI=mongodb://localhost:27017/smart_village
MONGO_TEST_URI=mongodb://localhost:27017/smart_village_test

# Redis配置
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# 第三方API
BAIDU_OCR_API_KEY=your-baidu-ocr-key
BAIDU_OCR_SECRET_KEY=your-baidu-ocr-secret

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

## 4. 包管理配置

### package.json
```json
{
  "name": "smart-village-platform",
  "version": "1.0.0",
  "description": "智慧村庄综合服务平台",
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:village\"",
    "dev:main": "nodemon src/app.js",
    "dev:village": "nodemon server/app.js",
    "start": "concurrently \"node src/app.js\" \"node server/app.js\"",
    "test": "jest",
    "lint": "eslint src/ server/ --fix",
    "init-db": "node scripts/init-database.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "mongoose": "^7.5.0",
    "redis": "^4.6.7",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "express-rate-limit": "^6.8.1",
    "express-validator": "^7.0.1",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "concurrently": "^8.2.0",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "eslint": "^8.46.0"
  }
}
```

## 5. 启动脚本

### scripts/start-dev.sh
```bash
#!/bin/bash
echo "🚀 Starting Smart Village Platform Development Server..."

# 检查MongoDB是否运行
if ! pgrep -x "mongod" > /dev/null; then
    echo "📦 Starting MongoDB..."
    mongod --dbpath ./data/db &
fi

# 检查Redis是否运行
if ! pgrep -x "redis-server" > /dev/null; then
    echo "🔴 Starting Redis..."
    redis-server &
fi

# 启动后端服务
echo "🖥️ Starting backend services..."
npm run dev
```

## 快速启动命令

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 初始化数据库
npm run init-db

# 4. 启动开发服务器
npm run dev
```

## 验证服务启动

```bash
# 检查主API服务器
curl http://localhost:3001/health

# 检查村务服务器
curl http://localhost:5000/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "port": 3001
}
```