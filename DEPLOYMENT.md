# 智慧乡村综合服务平台 - 部署指南

## 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (反向代理)                       │
│                     Port 80 / 443                       │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
┌───────▼────┐ ┌─▼──────┐ ┌▼─────────┐
│ Node.js    │ │Python  │ │   Go     │
│ Port 3001  │ │Port 8000│ │Port 9000 │
│            │ │        │ │          │
│ 主服务      │ │AI服务  │ │区块链    │
│            │ │        │ │          │
└───────┬────┘ └─┬──────┘ └┬─────────┘
        │         │         │
        └─────────┼─────────┘
                  │
        ┌─────────▼─────────┐
        │   MongoDB         │
        │   Port 27017      │
        │                   │
        │   Redis           │
        │   Port 6379       │
        └───────────────────┘
```

## 环境要求

| 服务 | 版本要求 |
|------|----------|
| Node.js | >= 20.17.0 |
| Python | >= 3.9 |
| Go | >= 1.21 |
| MongoDB | >= 5.0 |
| Redis | >= 6.0 |
| Nginx | >= 1.18 |

---

## 🐳 Docker 部署（推荐）

### 1. 构建镜像

```bash
# 构建Node.js服务
docker build -t smart-village-node:latest -f docker/Dockerfile.node .

# 构建Python服务
docker build -t smart-village-python:latest -f docker/Dockerfile.python .

# 构建Go服务
docker build -t smart-village-go:latest -f docker/Dockerfile.go .
```

### 2. 启动服务

```bash
docker-compose up -d
```

---

## 📦 手动部署

### 主服务 (Node.js)

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 初始化数据库
npm run init-db

# 4. 启动服务
NODE_ENV=production npm start
```

### 农技AI服务 (Python)

```bash
cd services/agriculture-service

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

### 区块链存证服务 (Go)

```bash
cd services/blockchain-service

# 下载依赖
go mod download

# 编译
go build -o blockchain-service main.go

# 启动服务
./blockchain-service
```

---

## 🔧 Nginx 配置

```nginx
# /etc/nginx/conf.d/smart-village.conf

upstream nodejs_backend {
    server localhost:3001;
}

upstream python_backend {
    server localhost:8000;
}

upstream go_backend {
    server localhost:9000;
}

server {
    listen 80;
    server_name village.example.com;

    # 客户端
    location / {
        root /var/www/smart-village/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # 主API服务
    location /api/v1/ {
        proxy_pass http://nodejs_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 农技AI服务
    location /api/v2/agriculture {
        proxy_pass http://python_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 区块链服务
    location /api/v1/blockchain {
        proxy_pass http://go_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 文件上传大小限制
    client_max_body_size 100M;
}
```

---

## 🔑 环境变量配置

### Node.js 服务 (.env)

```bash
# 应用配置
NODE_ENV=production
PORT=3001

# 数据库
MONGO_URI=mongodb://localhost:27017/smart_village
REDIS_URL=redis://localhost:6379

# JWT密钥 (生产环境必须使用强密钥)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# CORS
CORS_ORIGIN=https://village.example.com

# 文件上传
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=100MB

# 外部服务
BAIDU_TTS_API_KEY=xxx
TENCENT_OCR_SECRET_ID=xxx
TENCENT_OCR_SECRET_KEY=xxx
```

### Python 服务 (.env)

```bash
# 应用配置
APP_NAME=智慧乡村农技AI服务
DEBUG=False

# 数据库
MONGODB_URI=mongodb://localhost:27017/smart_village
REDIS_URL=redis://localhost:6379/1

# AI服务
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# 向量数据库
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=us-east1-aws
```

### Go 服务 (.env)

```bash
# 应用配置
PORT=9000
GIN_MODE=release

# 数据库
MONGO_URI=mongodb://localhost:27017/smart_village
REDIS_ADDR=localhost:6379

# 区块链配置
ETHEREUM_NETWORK=polygon
ETHEREUM_RPC_URL=https://polygon-rpc.com
CONTRACT_ADDRESS=0xxxx

# IPFS
IPFS_API_URL=http://localhost:5001
```

---

## 🚀 PM2 进程管理

### 安装PM2

```bash
npm install -g pm2
```

### 配置文件

```javascript
// ecosystem.config.js
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
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false
    }
  ]
};
```

### 启动命令

```bash
# 启动所有服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all
```

---

## 🛡️ 生产环境检查清单

### 安全

- [ ] 修改默认密码
- [ ] 设置强JWT密钥
- [ ] 配置HTTPS
- [ ] 启用防火墙
- [ ] 设置速率限制
- [ ] 启用CSP头部

### 性能

- [ ] 启用Gzip压缩
- [ ] 配置CDN
- [ ] 数据库索引优化
- [ ] Redis缓存配置
- [ ] 静态资源压缩

### 监控

- [ ] 配置日志收集
- [ ] 设置错误告警
- [ ] 性能监控
- [ ] 健康检查端点

### 备份

- [ ] 数据库定期备份
- [ ] 文件备份策略
- [ ] 灾难恢复计划

---

## 📊 监控与日志

### 健康检查端点

```bash
# 主服务
curl http://localhost:3001/health

# Python服务
curl http://localhost:8000/health

# Go服务
curl http://localhost:9000/health
```

### 日志位置

| 服务 | 日志位置 |
|------|----------|
| Node.js | `./logs/` |
| Python | `./logs/agriculture.log` |
| Go | `./logs/blockchain.log` |
| Nginx | `/var/log/nginx/` |

---

## 🔄 更新部署

### 滚动更新步骤

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install

# 3. 构建前端
npm run build

# 4. 重启服务
pm2 reload smart-village-main
```

---

## 📞 技术支持

如有问题，请联系：
- 项目仓库：https://github.com/your-org/smart-village
- 问题反馈：https://github.com/your-org/smart-village/issues
