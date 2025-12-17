# 🚀 实时计算引擎集成部署指南

## 📋 概述

本指南详细说明如何将实时计算引擎集成到智慧村庄平台中，包括完整的部署架构、配置说明和运维指南。

## 🏗️ 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    智慧村庄平台完整架构                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   前端应用       │    │   API网关        │    │   移动应用       │ │
│  │  (Vue.js)       │    │  (Gateway)      │    │ (小程序/APP)    │ │
│  │  Port: 3000    │◄──►│  Port: 8080    │◄──►│                 │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                │                                   │
│           ┌────────────────────┼────────────────────┐            │
│           ▼                    ▼                    ▼            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  认证服务       │  │  村务服务       │  │ 主服务(实时计算) │   │
│  │ Port: 3001     │  │ Port: 5000     │  │ Port: 3001     │   │
│  │ (Auth)         │  │ (Village)      │  │ (Realtime)     │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                      │            │
│                       ┌────────────────────────────┼────────────┐ │
│                       ▼                            ▼            │ │
│              ┌─────────────────┐          ┌─────────────────┐   │
│              │   Redis缓存     │          │   MongoDB       │   │
│              │  Port: 6379    │          │  Port: 27017   │   │
│              └─────────────────┘          └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 服务组件

| 组件 | 端口 | 描述 | 技术栈 |
|------|------|------|--------|
| 前端应用 | 3000 | Vue.js用户界面 | Vue 3 + Element Plus |
| API网关 | 8080 | 统一入口、路由转发 | Express + http-proxy |
| 主服务 | 3001 | 实时计算引擎核心 | Node.js + Redis |
| 认证服务 | 3001 | JWT认证管理 | Node.js + JWT |
| 村务服务 | 5000 | 村务业务逻辑 | Express + Socket.IO |
| Redis缓存 | 6379 | 实时数据存储 | Redis 6.x |
| MongoDB | 27017 | 持久化数据存储 | MongoDB 5.x |

## 🚀 快速部署

### 1. 环境准备

#### 系统要求
- **操作系统**: Linux (Ubuntu 20.04+) / macOS / Windows 10+
- **Node.js**: 18.x 或更高版本
- **内存**: 最少 8GB，推荐 16GB
- **磁盘**: 最少 50GB 可用空间
- **网络**: 稳定的互联网连接

#### 依赖服务
- **Redis**: 6.0+
- **MongoDB**: 5.0+
- **Nginx**: 1.18+ (生产环境推荐)

### 2. 安装步骤

#### 步骤1: 克隆项目
```bash
git clone <repository-url>
cd smart-village-platform
```

#### 步骤2: 安装依赖
```bash
# 安装全局依赖
npm install -g pm2

# 安装项目依赖
npm run install:all
```

#### 步骤3: 配置环境变量
```bash
# 复制环境配置模板
cp .env.example .env

# 编辑配置文件
nano .env
```

#### 环境变量配置
```bash
# 基础配置
NODE_ENV=production
PORT=3001

# 数据库配置
MONGO_URI=mongodb://localhost:27017/smart_village
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# 服务配置
CLIENT_URL=http://localhost:3000
GATEWAY_PORT=8080

# 实时计算配置
REALTIME_ENABLED=true
REALTIME_CACHE_TIMEOUT=600000
BEHAVIOR_TRACKING_ENABLED=true

# Redis配置 (实时计算专用)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs

# 安全配置
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
```

#### 步骤4: 启动基础服务
```bash
# 启动Redis
sudo systemctl start redis
sudo systemctl enable redis

# 启动MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 步骤5: 初始化数据库
```bash
# 初始化MongoDB数据
npm run init-db

# 创建索引
npm run create-indexes
```

#### 步骤6: 启动应用服务
```bash
# 开发环境启动
npm run dev

# 生产环境启动
npm run start

# 使用PM2启动 (推荐生产环境)
pm2 start ecosystem.config.js
```

### 3. 验证部署

#### 健康检查
```bash
# 检查主服务
curl http://localhost:3001/health

# 检查API网关
curl http://localhost:8080/health

# 检查实时计算状态
curl http://localhost:3001/api/v1/realtime/status
```

#### 功能测试
```bash
# 测试API网关
curl http://localhost:8080/api/v1/info

# 测试实时计算
curl -X POST http://localhost:3001/api/v1/realtime/data \
  -H "Content-Type: application/json" \
  -d '{"dataType":"test","data":{"message":"Hello World"}}'
```

## 🔧 配置说明

### 主服务配置 (`src/config/realtimeConfig.js`)

#### Redis配置
```javascript
redis: {
  host: 'localhost',
  port: 6379,
  password: null,
  db: 0,
  keyPrefix: 'realtime:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
}
```

#### 实时引擎配置
```javascript
realtimeEngine: {
  dataRetention: {
    '1m': 60 * 1000,      // 1分钟
    '5m': 5 * 60 * 1000,  // 5分钟
    '1h': 60 * 60 * 1000, // 1小时
    '1d': 24 * 60 * 60 * 1000 // 1天
  },

  aggregationWindows: {
    sliding: {
      '1m': { size: 60, step: 1 },
      '5m': { size: 300, step: 5 }
    }
  },

  batchProcessing: {
    enabled: true,
    batchSize: 100,
    flushInterval: 1000
  }
}
```

#### 流处理配置
```javascript
streamProcessor: {
  processors: {
    behavior: {
      enabled: true,
      bufferSize: 1000,
      flushInterval: 1000,
      batchSize: 50
    },

    finance: {
      enabled: true,
      bufferSize: 500,
      flushInterval: 2000,
      batchSize: 25
    }
  }
}
```

### API网关配置 (`gateway/app.js`)

#### 服务代理配置
```javascript
const SERVICES = {
  auth: {
    url: 'http://localhost:3001',
    timeout: 5000
  },
  village: {
    url: 'http://localhost:5000',
    timeout: 5000
  },
  realtime: {
    url: 'http://localhost:3001',
    timeout: 5000
  }
};
```

#### 限流配置
```javascript
// 全局限流
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP最多1000请求
  message: {
    error: 'API请求过于频繁',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// 严格限流 (敏感操作)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: '敏感操作请求过于频繁',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  }
});
```

## 🐳 Docker部署

### Docker Compose配置
```yaml
version: '3.8'

services:
  # Redis缓存
  redis:
    image: redis:6.2-alpine
    container_name: smart-village-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  # MongoDB数据库
  mongodb:
    image: mongo:5.0
    container_name: smart-village-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    restart: unless-stopped

  # 主服务(实时计算)
  main-service:
    build:
      context: .
      dockerfile: Dockerfile.main
    container_name: smart-village-main
    ports:
      - "3001:3001"
    depends_on:
      - redis
      - mongodb
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://admin:password@mongodb:27017/smart_village?authSource=admin
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-production-secret
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped

  # API网关
  api-gateway:
    build:
      context: ./gateway
      dockerfile: Dockerfile
    container_name: smart-village-gateway
    ports:
      - "8080:8080"
    depends_on:
      - main-service
    environment:
      - NODE_ENV=production
      - REALTIME_SERVICE_URL=http://main-service:3001
      - AUTH_SERVICE_URL=http://main-service:3001
      - VILLAGE_SERVICE_URL=http://main-service:5000
    restart: unless-stopped

  # 前端应用
  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: smart-village-frontend
    ports:
      - "3000:80"
    depends_on:
      - api-gateway
    environment:
      - VITE_API_BASE_URL=http://localhost:8080
    restart: unless-stopped

volumes:
  redis_data:
  mongodb_data:
```

### Dockerfile配置
```dockerfile
# Dockerfile.main (主服务)
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY src/ ./src/
COPY logs/ ./logs/

# 安装依赖
RUN npm ci --only=production

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 启动应用
CMD ["npm", "start"]
```

### 启动Docker环境
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f main-service
```

## 🚦 生产环境优化

### 1. 性能优化

#### Node.js优化
```javascript
// 设置进程标题
process.title = 'smart-village-main';

// 启用集群模式
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`主进程 ${process.pid} 正在运行`);

  // 创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出`);
    cluster.fork();
  });
} else {
  require('./src/app');
}
```

#### Redis优化
```bash
# Redis配置优化
echo "maxmemory 2gb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
echo "save 900 1" >> /etc/redis/redis.conf
echo "save 300 10" >> /etc/redis/redis.conf
echo "save 60 10000" >> /etc/redis/redis.conf
```

#### MongoDB优化
```bash
# MongoDB配置优化
echo "storage.wiredTiger.cacheSizeGB: 2" >> /etc/mongod.conf
echo "operationProfiling.slowOpThresholdMs: 100" >> /etc/mongod.conf
echo "replication.replSetName: rs0" >> /etc/mongod.conf
```

### 2. 安全配置

#### Nginx反向代理
```nginx
# /etc/nginx/sites-available/smart-village
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL配置
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 前端静态文件
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API网关
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 限制文件上传大小
    client_max_body_size 50M;

    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

#### 防火墙配置
```bash
# UFW防火墙配置
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 6379/tcp  # Redis (仅内部访问)
sudo ufw deny 27017/tcp # MongoDB (仅内部访问)
```

### 3. 监控配置

#### PM2配置 (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'smart-village-main',
      script: './src/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },

      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 监控配置
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '1G',

      // 重启策略
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // 健康检查
      health_check_url: 'http://localhost:3001/health',
      health_check_grace_period: 3000
    }
  ]
};
```

#### 系统监控脚本
```bash
#!/bin/bash
# monitor.sh - 系统监控脚本

LOG_FILE="/var/log/smart-village-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# 检查服务状态
check_service() {
    local service_name=$1
    local url=$2

    if curl -f -s "$url" > /dev/null; then
        echo "[$DATE] $service_name: OK" >> $LOG_FILE
        return 0
    else
        echo "[$DATE] $service_name: FAILED" >> $LOG_FILE
        # 发送告警
        curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
             -d "chat_id=<CHAT_ID>" \
             -d "text=🚨 $service_name 服务异常"
        return 1
    fi
}

# 检查系统资源
check_system() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    local mem_usage=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

    echo "[$DATE] CPU: ${cpu_usage}%, MEM: ${mem_usage}%, DISK: ${disk_usage}%" >> $LOG_FILE

    # 检查阈值
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        echo "[$DATE] WARNING: CPU usage ${cpu_usage}%" >> $LOG_FILE
    fi

    if (( $(echo "$mem_usage > 80" | bc -l) )); then
        echo "[$DATE] WARNING: Memory usage ${mem_usage}%" >> $LOG_FILE
    fi

    if [ "$disk_usage" -gt 80 ]; then
        echo "[$DATE] WARNING: Disk usage ${disk_usage}%" >> $LOG_FILE
    fi
}

# 执行检查
check_service "API Gateway" "http://localhost:8080/health"
check_service "Main Service" "http://localhost:3001/health"
check_system

# 检查日志文件大小
find /app/logs -name "*.log" -size +100M -exec truncate -s 50M {} \;
```

## 🔄 运维指南

### 1. 日常维护

#### 日志管理
```bash
# 日志轮转配置
cat > /etc/logrotate.d/smart-village << EOF
/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 node node
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# 手动轮转
sudo logrotate -f /etc/logrotate.d/smart-village
```

#### 数据备份
```bash
#!/bin/bash
# backup.sh - 数据备份脚本

BACKUP_DIR="/backup/smart-village"
DATE=$(date '+%Y%m%d_%H%M%S')

# 创建备份目录
mkdir -p "$BACKUP_DIR/$DATE"

# 备份MongoDB
mongodump --host localhost:27017 --out "$BACKUP_DIR/$DATE/mongodb"

# 备份Redis
redis-cli --rdb "$BACKUP_DIR/$DATE/redis.rdb"

# 备份配置文件
cp -r /app/config "$BACKUP_DIR/$DATE/"
cp /app/.env "$BACKUP_DIR/$DATE/"

# 压缩备份
tar -czf "$BACKUP_DIR/smart-village-$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# 清理旧备份 (保留30天)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $BACKUP_DIR/smart-village-$DATE.tar.gz"
```

### 2. 故障排除

#### 常见问题诊断

##### 1. 实时计算引擎启动失败
```bash
# 检查Redis连接
redis-cli ping

# 检查日志
tail -f /app/logs/realtime.log

# 重启服务
pm2 restart smart-village-main
```

##### 2. 内存使用过高
```bash
# 检查内存使用
pm2 monit

# 检查Redis内存
redis-cli info memory

# 清理Redis缓存
redis-cli flushdb

# 重启Node.js进程
pm2 restart all
```

##### 3. 数据库连接问题
```bash
# 检查MongoDB状态
sudo systemctl status mongod

# 检查连接
mongo --eval "db.adminCommand('ismaster')"

# 重启MongoDB
sudo systemctl restart mongod
```

#### 性能调优

##### 1. Redis性能优化
```bash
# 监控Redis性能
redis-cli --latency-history -i 1

# 优化配置
echo "tcp-keepalive 300" >> /etc/redis/redis.conf
echo "timeout 0" >> /etc/redis/redis.conf
```

##### 2. MongoDB性能优化
```javascript
// 创建复合索引
db.behavior_logs.createIndex({
  "villageId": 1,
  "timestamp": -1,
  "action": 1
});

// 分析查询性能
db.behavior_logs.find({ villageId: "test" }).explain("executionStats")
```

### 3. 扩容部署

#### 水平扩容
```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  main-service:
    scale: 3  # 扩展到3个实例

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - main-service
```

#### 负载均衡配置
```nginx
upstream main_service {
    least_conn;
    server main-service_1:3001 max_fails=3 fail_timeout=30s;
    server main-service_2:3001 max_fails=3 fail_timeout=30s;
    server main-service_3:3001 max_fails=3 fail_timeout=30s;
}

server {
    location /api/v1/realtime/ {
        # 实时计算需要会话保持
        ip_hash;
        proxy_pass http://main_service;
    }
}
```

## 📊 监控指标

### 关键性能指标 (KPI)

| 指标类别 | 指标名称 | 正常范围 | 告警阈值 |
|----------|----------|----------|----------|
| 系统性能 | CPU使用率 | < 70% | > 85% |
| 系统性能 | 内存使用率 | < 80% | > 90% |
| 系统性能 | 磁盘使用率 | < 85% | > 95% |
| 应用性能 | API响应时间 | < 500ms | > 2000ms |
| 应用性能 | 错误率 | < 1% | > 5% |
| 实时计算 | 数据处理延迟 | < 100ms | > 500ms |
| 实时计算 | 内存缓存命中率 | > 90% | < 80% |
| 数据库 | MongoDB连接数 | < 100 | > 200 |
| 数据库 | Redis内存使用 | < 2GB | > 4GB |

### 监控工具集成

#### Prometheus + Grafana
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'smart-village'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

#### Grafana仪表板
- 系统性能监控
- 实时计算引擎监控
- API网关监控
- 业务指标监控

## 🔐 安全最佳实践

### 1. 应用安全
- 定期更新依赖包
- 使用HTTPS加密传输
- 实施API速率限制
- 输入验证和输出编码

### 2. 数据安全
- 敏感数据加密存储
- 定期数据备份
- 访问权限控制
- 审计日志记录

### 3. 网络安全
- 防火墙配置
- VPN访问控制
- DDoS防护
- 安全头配置

## 📞 技术支持

### 联系方式
- **技术支持邮箱**: 18886990223@163.com
- **问题反馈**: GitHub Issues
- **文档更新**: 查看最新文档

### 故障上报
1. 收集系统日志和错误信息
2. 提供详细的复现步骤
3. 包含环境配置信息
4. 描述预期行为和实际行为

---

**文档版本**: v1.0.0
**更新时间**: 2024年12月14日
**维护人员**: Smart Village Team