# 智慧乡村平台部署指南

## 📋 概述

本文档提供智慧乡村综合服务平台的完整部署指南，包括代码推送、测试验证、环境配置和生产部署。

---

## 🚀 一、代码推送

### 当前状态
本地有2个新提交等待推送到GitHub：
- `33293ea` - 村情地图功能开发
- `63836b5` - 村民服务增强、安全防护和移动端优化功能

### 推送命令
```bash
# 推送到远程仓库
git push origin main

# 如果遇到冲突，先拉取远程更新
git pull --rebase origin main
git push origin main
```

### 验证推送
```bash
# 查看远程提交历史
git log origin/main --oneline -5

# 或者直接访问GitHub
# https://github.com/zhihuixiangcun/smart-village-platform
```

---

## 🧪 二、运行测试

### 1. 安装测试依赖
```bash
npm install
```

### 2. 运行所有测试
```bash
# 运行完整测试套件
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 3. 运行特定测试

#### 智能值班表系统测试
```bash
# 单元测试
npm test -- tests/unit/duty

# 集成测试
npm test -- tests/integration/duty

# E2E测试
npm test -- tests/e2e/dutyCompleteFlow.test.js

# 或使用批处理脚本（Windows）
run-duty-tests.bat
```

#### 村情地图功能测试
```bash
# 单元测试
npm test -- tests/unit/map

# 集成测试
npm test -- tests/integration/map

# E2E测试
npm test -- tests/e2e/villageMapCompleteFlow.test.js

# 或使用批处理脚本（Windows）
run-map-tests.bat
```

### 4. 查看测试报告
```bash
# 打开覆盖率报告
npm run coverage:report
```

### 5. 测试覆盖目标
- 单元测试覆盖率：85%+
- 集成测试覆盖率：80%+
- E2E测试：覆盖主要用户场景

---

## ⚙️ 三、环境配置

### 1. 创建环境变量文件

在项目根目录创建 `.env` 文件：

```env
# ==================== 基础配置 ====================
NODE_ENV=production
PORT=3001
CLIENT_URL=http://localhost:3000

# ==================== 数据库配置 ====================
MONGO_URI=mongodb://localhost:27017/smart-village
# 或使用MongoDB Atlas
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-village

# ==================== JWT配置 ====================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# ==================== 高德地图配置 ====================
AMAP_API_KEY=your_amap_api_key
AMAP_SECURITY_KEY=your_amap_security_key

# 获取地址：https://console.amap.com/dev/key/app

# ==================== 百度语音API配置 ====================
BAIDU_SPEECH_API_KEY=your_baidu_speech_api_key
BAIDU_SPEECH_SECRET_KEY=your_baidu_speech_secret_key

# 获取地址：https://cloud.baidu.com/product/speech/asr

# ==================== 加密配置 ====================
# AES加密密钥（32字符）
ID_CARD_ENCRYPTION_KEY=your-32-character-aes-encryption-key

# AES加密IV（16字符）
ID_CARD_ENCRYPTION_IV=your-16-char-iv

# ==================== Redis配置（可选） ====================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# ==================== SMS配置（可选） ====================
SMS_ACCESS_KEY=your_sms_access_key
SMS_SECRET_KEY=your_sms_secret_key
SMS_SIGN_NAME=your_sms_sign_name
SMS_TEMPLATE_CODE=your_template_code

# ==================== 邮件配置（可选） ====================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# ==================== 区块链配置（可选） ====================
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETHEREUM_PRIVATE_KEY=your_ethereum_private_key
CONTRACT_ADDRESS=your_smart_contract_address

# ==================== 日志配置 ====================
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# ==================== 文件上传配置 ====================
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### 2. 客户端环境变量

在 `client/` 目录下创建 `.env` 文件：

```env
# ==================== API地址 ====================
VITE_API_BASE_URL=http://localhost:3001/api

# ==================== 高德地图 ====================
VITE_AMAP_KEY=your_amap_api_key

# ==================== 应用配置 ====================
VITE_APP_TITLE=智慧乡村综合服务平台
VITE_APP_VERSION=1.0.0
```

### 3. 配置高德地图

1. 访问 [高德开放平台](https://console.amap.com/dev/key/app)
2. 注册并创建应用
3. 获取API Key和安全密钥
4. 更新 `.env` 文件中的 `AMAP_API_KEY` 和 `AMAP_SECURITY_KEY`

### 4. 配置百度语音API

1. 访问 [百度智能云](https://cloud.baidu.com/product/speech/asr)
2. 开通语音识别和语音合成服务
3. 获取API Key和Secret Key
4. 更新 `.env` 文件中的百度语音配置

### 5. 生成加密密钥

```bash
# 生成AES加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成AES加密IV
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# 生成JWT密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🗄️ 四、数据库初始化

### 1. 启动MongoDB

#### 使用Docker（推荐）
```bash
# 启动MongoDB容器
docker run -d \
  --name smart-village-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongo-data:/data/db \
  mongo:latest

# 查看日志
docker logs -f smart-village-mongo
```

#### 或使用本地安装
```bash
# Windows
net start MongoDB

# Linux/Mac
brew services start mongodb
# 或
sudo systemctl start mongod
```

### 2. 初始化数据库

```bash
# 运行初始化脚本
npm run init-db

# 或手动初始化各个模块
node server/models/initDutyData.js
node server/models/initMapData.js
node server/models/initFamilyData.js
```

### 3. 创建数据库索引

```bash
# 创建所有索引
node server/models/createDutyIndexes.js create
node server/models/createFamilyIndexes.js create

# 或查看索引
node server/models/createDutyIndexes.js list
```

---

## 🏗️ 五、生产部署

### 1. 构建前端

```bash
cd client

# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建结果在 client/dist 目录
```

### 2. 配置反向代理（Nginx）

```nginx
# /etc/nginx/sites-available/smart-village

server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.IO代理
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 使用PM2管理后端进程

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start src/app.js --name smart-village-api

# 查看状态
pm2 status

# 查看日志
pm2 logs smart-village-api

# 设置开机自启
pm2 startup
pm2 save
```

### 4. 配置HTTPS（Let's Encrypt）

```bash
# 安装Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📦 六、Docker部署（推荐）

### 1. 创建Dockerfile

#### 后端Dockerfile
```dockerfile
# server/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY server ./server
COPY src ./src

RUN npm install --only=production

EXPOSE 3001

CMD ["node", "src/app.js"]
```

#### 前端Dockerfile
```dockerfile
# client/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. 创建docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: smart-village-mongo
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:alpine
    container_name: smart-village-redis
    restart: always
    ports:
      - "6379:6379"

  backend:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: smart-village-api
    restart: always
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://admin:password@mongodb:27017/smart-village?authSource=admin
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: smart-village-web
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo-data:
```

### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

---

## 🔍 七、健康检查

### 1. API健康检查

```bash
# 检查API状态
curl http://localhost:3001/api/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2025-01-03T12:00:00.000Z",
  "uptime": 12345,
  "database": "connected",
  "redis": "connected"
}
```

### 2. 数据库连接检查

```bash
# MongoDB连接测试
mongosh "mongodb://localhost:27017/smart-village" --eval "db.adminCommand('ping')"

# 预期输出
{ ok: 1 }
```

### 3. 前端访问检查

```bash
# 访问前端
curl http://localhost:3000

# 或在浏览器打开
# http://localhost:3000
```

---

## 📊 八、监控和日志

### 1. PM2监控

```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 show smart-village-api

# 查看日志
pm2 logs smart-village-api --lines 100
```

### 2. 日志管理

```bash
# 查看应用日志
tail -f logs/combined.log
tail -f logs/error.log

# 日志轮转配置（logrotate）
sudo nano /etc/logrotate.d/smart-village

/etc/logrotate.d/smart-village 内容：
/path/to/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### 3. 性能监控

```bash
# 运行性能测试
npm run performance:test

# 查看性能报告
npm run performance:report
```

---

## 🔐 九、安全检查

### 1. 运行安全审计

```bash
# 审计依赖包
npm audit

# 修复安全问题
npm audit fix

# 运行安全测试
npm run security:test
```

### 2. 配置防火墙

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 🎯 十、部署检查清单

### 部署前
- [ ] 代码已推送到GitHub
- [ ] 所有测试通过
- [ ] 环境变量已配置
- [ ] 数据库已初始化
- [ ] 依赖包已安装

### 部署中
- [ ] 前端构建成功
- [ ] 后端服务启动
- [ ] 数据库连接正常
- [ ] 反向代理配置完成
- [ ] SSL证书已安装

### 部署后
- [ ] 健康检查通过
- [ ] API接口正常
- [ ] 前端页面加载
- [ ] 日志正常记录
- [ ] 监控系统运行

---

## 📞 十一、故障排查

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查MongoDB是否运行
sudo systemctl status mongod

# 检查连接字符串
echo $MONGO_URI
```

#### 2. API端口被占用
```bash
# 查找占用进程
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

#### 3. 前端构建失败
```bash
# 清理缓存
rm -rf node_modules
rm -rf client/node_modules
npm install
cd client && npm install
```

#### 4. 内存不足
```bash
# 增加Node.js内存限制
NODE_OPTIONS="--max-old-space-size=4096" node src/app.js
```

---

## 📚 十二、相关文档

- [开发指南](../CLAUDE.md)
- [API文档](./api-documentation.md)
- [测试指南](../tests/duty/README.md)
- [功能说明](./village-committee-enhancement-plan.md)

---

## 🆘 十三、获取帮助

如遇到问题，请：
1. 查看日志文件
2. 检查环境变量配置
3. 运行健康检查
4. 查阅相关文档
5. 提交Issue到GitHub

---

**最后更新**: 2025-01-03
**版本**: 1.0.0
**维护者**: Smart Village Team