# 智慧乡村语音交互系统部署指南

## 概述

智慧乡村语音交互系统是一个支持22种方言识别的智能语音助手，包含前端Vue.js应用、Node.js后端服务和Python AI处理模块。

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用       │    │   Node.js后端   │    │  Python AI服务  │
│   (Vue.js)      │◄──►│    服务          │◄──►│   (语音处理)     │
│   端口: 3000     │    │   端口: 3001    │    │   端口: 5001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   数据库服务     │
                    │ MongoDB/Redis   │
                    └─────────────────┘
```

## 功能特性

- **多方言支持**: 支持22种中文方言识别
- **智能语音交互**: 语音识别、合成、命令处理
- **离线能力**: 支持离线使用和数据同步
- **高性能**: 音频压缩、缓存机制、并发处理
- **易于使用**: 语音唤醒、可视化反馈

## 环境要求

### 基础环境
- Node.js >= 20.17.0
- Python >= 3.8
- MongoDB >= 4.4
- Redis >= 6.0 (可选，用于缓存)

### 系统要求
- CPU: 2核心以上
- 内存: 4GB以上
- 存储: 10GB以上可用空间
- 网络: 稳定的互联网连接（用于API调用）

## 快速部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd smart-village-platform
```

### 2. 安装依赖

#### 后端依赖
```bash
npm install
```

#### 前端依赖
```bash
cd client
npm install
cd ..
```

#### Python语音服务依赖
```bash
cd python-voice-service
pip install -r requirements.txt
cd ..
```

### 3. 配置环境变量

```bash
# 复制环境配置文件
cp .env.voice.example .env

# 编辑配置文件，填入API密钥等配置
nano .env
```

**重要配置项**:
- `BAIDU_APP_ID`: 百度语音API应用ID
- `BAIDU_API_KEY`: 百度语音API密钥
- `BAIDU_SECRET_KEY`: 百度语音API密钥

### 4. 初始化数据库

```bash
# 启动MongoDB (如果未运行)
sudo systemctl start mongod

# 初始化数据库
npm run init-db
```

### 5. 启动服务

#### 方式一：使用启动脚本（推荐）

```bash
# 一键启动所有服务
chmod +x start-servers.sh
./start-servers.sh
```

#### 方式二：手动启动

```bash
# 启动MongoDB
sudo systemctl start mongod

# 启动Redis (可选)
sudo systemctl start redis

# 启动Node.js后端服务
npm run dev

# 启动Python语音服务 (新终端)
cd python-voice-service
python run.py

# 启动前端开发服务 (新终端)
cd client
npm run dev
```

### 6. 访问应用

- 前端应用: http://localhost:3000
- 后端API: http://localhost:3001
- Python语音服务: http://localhost:5001
- 语音助手页面: http://localhost:3000/voice-assistant

## 详细部署

### 生产环境部署

#### 1. 构建前端应用

```bash
cd client
npm run build
```

#### 2. 配置Nginx

创建Nginx配置文件 `/etc/nginx/sites-available/smart-village`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/smart-village/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 语音服务代理
    location /voice/ {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket支持
    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

启用站点:
```bash
sudo ln -s /etc/nginx/sites-available/smart-village /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. 配置Systemd服务

创建Node.js服务文件 `/etc/systemd/system/smart-village-backend.service`:

```ini
[Unit]
Description=Smart Village Backend Service
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/smart-village
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

创建Python语音服务文件 `/etc/systemd/system/smart-village-voice.service`:

```ini
[Unit]
Description=Smart Village Voice Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/smart-village/python-voice-service
ExecStart=/usr/bin/python3 run.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=/var/www/smart-village/python-voice-service

[Install]
WantedBy=multi-user.target
```

启用并启动服务:
```bash
sudo systemctl daemon-reload
sudo systemctl enable smart-village-backend
sudo systemctl enable smart-village-voice
sudo systemctl start smart-village-backend
sudo systemctl start smart-village-voice
```

#### 4. 配置SSL证书（HTTPS）

使用Let's Encrypt获取免费SSL证书:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Docker部署

#### 1. 创建Dockerfile

**后端Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

CMD ["node", "src/app.js"]
```

**Python语音服务Dockerfile**:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 创建非root用户
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

EXPOSE 5001

CMD ["python", "run.py"]
```

#### 2. 创建docker-compose.yml

```yaml
version: '3.8'

services:
  # MongoDB数据库
  mongodb:
    image: mongo:6.0
    container_name: smart-village-db
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: smart-village-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # 后端服务
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: smart-village-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      MONGO_URI: mongodb://admin:password@mongodb:27017/smart_village?authSource=admin
      REDIS_HOST: redis
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  # Python语音服务
  voice-service:
    build:
      context: ./python-voice-service
      dockerfile: Dockerfile
    container_name: smart-village-voice
    restart: unless-stopped
    ports:
      - "5001:5001"
    environment:
      VOICE_SERVICE_HOST: 0.0.0.0
      REDIS_HOST: redis
    depends_on:
      - redis
    volumes:
      - ./python-voice-service/logs:/app/logs
      - ./python-voice-service/models:/app/models

  # 前端应用
  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: smart-village-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - backend
      - voice-service

volumes:
  mongodb_data:
  redis_data:
```

#### 3. 启动Docker服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 配置说明

### 百度语音API配置

1. 访问 [百度AI开放平台](https://ai.baidu.com/)
2. 注册账号并创建应用
3. 获取语音识别和语音合成服务的API密钥
4. 在 `.env` 文件中配置相应的密钥

### 方言支持配置

支持的方言列表：
- 普通话 (zh)
- 粤语 (yue)
- 闽南语 (nan)
- 客家话 (hak)
- 吴语 (wuu)
- 湘语 (hsn)
- 赣语 (gan)
- 东北话 (zh-northeast)
- 四川话 (zh-sichuan)
- 重庆话 (zh-chongqing)
- 等等...

### 性能优化配置

- **缓存配置**: 启用Redis缓存提高响应速度
- **并发控制**: 调整最大并发请求数
- **音频压缩**: 配置音频压缩参数
- **负载均衡**: 使用Nginx进行负载均衡

## 监控和维护

### 日志管理

日志文件位置：
- 后端日志: `logs/app.log`
- Python语音服务日志: `python-voice-service/logs/voice_service.log`
- Nginx日志: `/var/log/nginx/`

日志轮转配置:
```bash
# 创建logrotate配置
sudo nano /etc/logrotate.d/smart-village
```

### 健康检查

检查服务状态:
```bash
# 检查后端服务
curl http://localhost:3001/health

# 检查语音服务
curl http://localhost:5001/health

# 检查数据库
sudo systemctl status mongod
```

### 性能监控

使用以下工具监控性能：
- 系统资源: `htop`, `iotop`
- 应用性能: 内置监控端点 `/api/v1/performance`
- 错误监控: 集成错误追踪服务

### 备份策略

- 数据库备份: 定期备份MongoDB数据
- 配置文件备份: 备份环境配置文件
- 日志备份: 定期归档和清理日志

## 故障排除

### 常见问题

#### 1. 麦克风权限问题
```bash
# 确保浏览器支持HTTPS
# 检查麦克风权限设置
# 浏览器地址栏左侧点击麦克风图标
```

#### 2. 语音识别失败
```bash
# 检查百度API配置
# 验证网络连接
# 查看Python服务日志
```

#### 3. 服务启动失败
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3001

# 查看详细错误信息
journalctl -u smart-village-backend -f
```

#### 4. 性能问题
```bash
# 检查系统资源使用
free -h
df -h

# 调整配置参数
# 减少并发数
# 启用缓存
```

### 调试模式

启用调试模式获取更详细的日志：
```bash
# 设置环境变量
export DEBUG=true
export LOG_LEVEL=debug

# 重启服务
sudo systemctl restart smart-village-backend
```

## 更新升级

### 应用更新

1. 备份当前版本
2. 拉取最新代码
3. 更新依赖
4. 重新构建
5. 重启服务

```bash
# 备份数据库
mongodump --db smart_village --out /backup/$(date +%Y%m%d)

# 更新代码
git pull origin main

# 更新依赖
npm install
cd client && npm install && cd ..
cd python-voice-service && pip install -r requirements.txt && cd ..

# 重新构建
cd client && npm run build && cd ..

# 重启服务
sudo systemctl restart smart-village-backend
sudo systemctl restart smart-village-voice
```

### 配置更新

更新配置时：
1. 备份当前配置
2. 修改配置文件
3. 重新加载服务
4. 验证配置

## 安全配置

### 基础安全

- 定期更新系统和依赖
- 使用强密码
- 启用防火墙
- 限制API访问频率

### 数据安全

- 敏感数据加密存储
- 使用HTTPS传输
- 定期备份数据
- 访问日志记录

### API安全

- API密钥管理
- 请求签名验证
- 访问权限控制
- 错误信息过滤

## 联系支持

如果在部署过程中遇到问题，请：

1. 查看日志文件获取详细错误信息
2. 检查配置文件是否正确
3. 确认系统资源是否充足
4. 参考故障排除章节
5. 联系技术支持团队

---

**部署完成后，您可以通过以下地址访问语音助手：**
- 开发环境: http://localhost:3000/voice-assistant
- 生产环境: https://your-domain.com/voice-assistant