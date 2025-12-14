# 🚀 部署运维手册

## 📖 文档说明

本手册详细介绍智慧村庄综合服务平台的部署方案、运维流程和故障处理方法，适用于系统管理员和运维工程师。

## 📋 目录

- [环境准备](#环境准备)
- [部署方案](#部署方案)
- [配置管理](#配置管理)
- [监控告警](#监控告警)
- [备份恢复](#备份恢复)
- [性能优化](#性能优化)
- [故障处理](#故障处理)
- [安全加固](#安全加固)
- [运维工具](#运维工具)

## 🛠️ 环境准备

### 系统要求

#### 最小配置 (试点部署)
```bash
# 硬件要求
CPU: 4核心 2.0GHz+
内存: 8GB RAM
存储: 100GB SSD
网络: 100Mbps带宽

# 软件要求  
OS: Ubuntu 20.04+ / CentOS 8+
Node.js: 20.17.0+
MongoDB: 6.0+ (可选)
Redis: 7.0+ (推荐)
Nginx: 1.20+
```

#### 推荐配置 (生产环境)
```bash
# 硬件要求
CPU: 8核心 2.4GHz+  
内存: 32GB RAM
存储: 500GB SSD (系统) + 2TB HDD (数据)
网络: 1000Mbps带宽

# 软件要求
OS: Ubuntu 22.04 LTS
Node.js: 20.17.0+
MongoDB: 7.0+ (副本集)
Redis: 7.0+ (哨兵模式)
Nginx: 1.22+
PM2: 5.0+
```

#### 高可用配置 (大规模部署)
```bash
# 集群配置
负载均衡器: 2台 (主备)
应用服务器: 3台+ (集群)
数据库服务器: 3台 (MongoDB副本集)
缓存服务器: 3台 (Redis Sentinel)
存储服务器: NFS/GFS分布式存储

# 网络要求
外网带宽: 500Mbps+
内网带宽: 10Gbps
```

### 环境初始化

#### 系统初始化脚本
```bash
#!/bin/bash
# init-system.sh - 系统环境初始化

echo "=== 智慧村庄平台系统初始化 ==="

# 更新系统
apt update && apt upgrade -y

# 安装基础工具
apt install -y curl wget git vim htop iotop

# 创建应用用户
useradd -m -s /bin/bash village
usermod -aG sudo village

# 设置时区
timedatectl set-timezone Asia/Shanghai

# 配置系统限制
cat >> /etc/security/limits.conf << EOF
village soft nofile 65536
village hard nofile 65536
village soft nproc 32768
village hard nproc 32768
EOF

# 优化内核参数
cat >> /etc/sysctl.conf << EOF
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
vm.swappiness = 10
EOF

sysctl -p

echo "系统初始化完成!"
```

#### Node.js环境安装
```bash
#!/bin/bash
# install-nodejs.sh

# 使用NodeSource仓库安装Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# 验证安装
node --version
npm --version

# 配置npm镜像
npm config set registry https://registry.npmmirror.com

# 安装全局工具
npm install -g pm2 nodemon

echo "Node.js环境安装完成!"
```

## 📦 部署方案

### 单机部署 (开发/测试环境)

#### 快速部署脚本
```bash
#!/bin/bash
# deploy-single.sh - 单机快速部署

set -e

PROJECT_DIR="/opt/smart-village"
SERVICE_USER="village" 
BACKUP_DIR="/backup/village"

echo "=== 开始单机部署 ==="

# 1. 创建目录
mkdir -p $PROJECT_DIR $BACKUP_DIR
chown -R $SERVICE_USER:$SERVICE_USER $PROJECT_DIR $BACKUP_DIR

# 2. 克隆代码
cd /tmp
git clone https://github.com/your-org/smart-village-platform.git
mv smart-village-platform/* $PROJECT_DIR/
chown -R $SERVICE_USER:$SERVICE_USER $PROJECT_DIR

# 3. 安装依赖
cd $PROJECT_DIR
sudo -u $SERVICE_USER npm install
cd client && sudo -u $SERVICE_USER npm install --legacy-peer-deps

# 4. 环境配置
cp .env.example .env
sed -i 's/mongodb:\/\/localhost/mongodb:\/\/localhost/' .env
sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env

# 5. 构建前端
cd client
sudo -u $SERVICE_USER npm run build

# 6. 初始化数据库
cd $PROJECT_DIR
sudo -u $SERVICE_USER npm run init-db

# 7. 启动服务
sudo -u $SERVICE_USER pm2 start ecosystem.config.js
sudo -u $SERVICE_USER pm2 save
pm2 startup

echo "=== 部署完成 ==="
echo "前端地址: http://localhost:3000"
echo "API地址: http://localhost:3001"
echo "监控面板: http://localhost:3001/monitoring"
```

#### PM2配置文件
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'village-main',
      script: './src/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      log_file: './logs/main-combined.log',
      time: true,
      max_memory_restart: '500M',
      node_args: '--max_old_space_size=1024'
    },
    {
      name: 'village-service',
      script: './server/app.js', 
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/service-error.log',
      out_file: './logs/service-out.log',
      time: true,
      max_memory_restart: '300M'
    }
  ]
}
```

### 集群部署 (生产环境)

#### Docker Compose部署
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Nginx负载均衡器
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./client/dist:/usr/share/nginx/html
    depends_on:
      - app1
      - app2
    restart: unless-stopped

  # 应用服务器1
  app1:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGO_URI=mongodb://mongo1:27017,mongo2:27017,mongo3:27017/village?replicaSet=rs0
      - REDIS_URL=redis://redis-sentinel:26379
      - SERVER_ID=app1
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - mongo1
      - redis
    restart: unless-stopped
    
  # 应用服务器2  
  app2:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGO_URI=mongodb://mongo1:27017,mongo2:27017,mongo3:27017/village?replicaSet=rs0
      - REDIS_URL=redis://redis-sentinel:26379
      - SERVER_ID=app2
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - mongo1
      - redis
    restart: unless-stopped

  # MongoDB主节点
  mongo1:
    image: mongo:7
    command: mongod --replSet rs0 --bind_ip_all
    ports:
      - "27017:27017"
    volumes:
      - mongo1_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js
    restart: unless-stopped
    
  # MongoDB副节点1
  mongo2:
    image: mongo:7
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo2_data:/data/db
    restart: unless-stopped
    
  # MongoDB副节点2  
  mongo3:
    image: mongo:7
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo3_data:/data/db
    restart: unless-stopped

  # Redis主节点
  redis:
    image: redis:7-alpine
    command: redis-server /usr/local/etc/redis/redis.conf
    ports:
      - "6379:6379"
    volumes:
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
      - redis_data:/data
    restart: unless-stopped
    
  # Redis哨兵
  redis-sentinel:
    image: redis:7-alpine
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    ports:
      - "26379:26379"
    volumes:
      - ./redis/sentinel.conf:/usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  mongo1_data:
  mongo2_data:
  mongo3_data:
  redis_data:
```

#### Kubernetes部署配置
```yaml
# k8s/village-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: village-app
  labels:
    app: village-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: village-app
  template:
    metadata:
      labels:
        app: village-app
    spec:
      containers:
      - name: village-app
        image: village/smart-village:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: village-secrets
              key: mongo-uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: village-secrets  
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: village-service
spec:
  selector:
    app: village-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3001
  type: LoadBalancer
```

## ⚙️ 配置管理

### Nginx配置优化
```nginx
# nginx/nginx.conf
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   'rt=$request_time ut=$upstream_response_time';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    # 性能优化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # 上游服务器
    upstream village_backend {
        least_conn;
        server app1:3001 max_fails=3 fail_timeout=30s;
        server app2:3001 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    # 主服务器配置
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        # SSL配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_stapling on;
        ssl_stapling_verify on;
        
        # 安全头
        add_header Strict-Transport-Security "max-age=63072000" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        
        # API代理
        location /api/ {
            proxy_pass http://village_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # 超时设置
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Socket.IO代理
        location /socket.io/ {
            proxy_pass http://village_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # 静态文件
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
            
            # 缓存策略
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        # 健康检查
        location /nginx-health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### 环境变量管理
```bash
# .env.production
# 应用配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# 数据库配置
MONGO_URI=mongodb://mongo1:27017,mongo2:27017,mongo3:27017/village?replicaSet=rs0&authSource=admin
REDIS_URL=redis://redis-sentinel:26379

# 安全配置
JWT_SECRET=your-super-secret-jwt-key-here
SESSION_SECRET=your-session-secret-here
ENCRYPTION_KEY=your-32-char-encryption-key-here

# 文件上传
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# 日志配置
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# 外部服务
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY=your-sms-access-key
SMS_SECRET_KEY=your-sms-secret-key

EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.exmail.qq.com
EMAIL_PORT=587
EMAIL_USER=noreply@your-domain.com
EMAIL_PASS=your-email-password

# 监控配置
MONITORING_ENABLED=true
METRICS_PORT=9090

# 性能配置
CLUSTER_WORKERS=0  # 0表示使用CPU核心数
MAX_MEMORY=1024    # MB
```

## 📊 监控告警

### 系统监控配置
```javascript
// monitoring/system-monitor.js
const os = require('os');
const fs = require('fs');
const { EventEmitter } = require('events');

class SystemMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.interval = options.interval || 30000; // 30秒
    this.thresholds = {
      cpu: options.cpuThreshold || 80,    // CPU使用率阈值
      memory: options.memoryThreshold || 85, // 内存使用率阈值  
      disk: options.diskThreshold || 90,  // 磁盘使用率阈值
      ...options.thresholds
    };
    this.isRunning = false;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, this.interval);
    
    console.log('系统监控启动');
  }
  
  stop() {
    if (!this.isRunning) return;
    
    clearInterval(this.monitorInterval);
    this.isRunning = false;
    console.log('系统监控停止');
  }
  
  async collectMetrics() {
    const metrics = {
      timestamp: new Date(),
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      disk: await this.getDiskUsage(),
      network: this.getNetworkStats(),
      processes: this.getProcessStats()
    };
    
    // 检查告警条件
    this.checkAlerts(metrics);
    
    // 发送监控数据
    this.emit('metrics', metrics);
    
    return metrics;
  }
  
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return {
      usage: usage,
      cores: cpus.length,
      model: cpus[0].model
    };
  }
  
  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;
    
    return {
      total: this.formatBytes(total),
      used: this.formatBytes(used),
      free: this.formatBytes(free),
      usage: Math.round(usage)
    };
  }
  
  async getDiskUsage() {
    return new Promise((resolve) => {
      const stats = fs.statSync('.');
      // 简化的磁盘使用率计算，生产环境建议使用专业工具
      resolve({
        usage: 0, // 需要实现具体的磁盘使用率计算
        total: '未知',
        used: '未知',
        free: '未知'
      });
    });
  }
  
  getNetworkStats() {
    const networkInterfaces = os.networkInterfaces();
    return {
      interfaces: Object.keys(networkInterfaces).length,
      details: networkInterfaces
    };
  }
  
  getProcessStats() {
    const usage = process.memoryUsage();
    return {
      pid: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: this.formatBytes(usage.rss),
        heapTotal: this.formatBytes(usage.heapTotal),
        heapUsed: this.formatBytes(usage.heapUsed),
        external: this.formatBytes(usage.external)
      }
    };
  }
  
  checkAlerts(metrics) {
    // CPU告警
    if (metrics.cpu.usage > this.thresholds.cpu) {
      this.emit('alert', {
        type: 'cpu',
        level: 'warning',
        message: `CPU使用率过高: ${metrics.cpu.usage}%`,
        metrics: metrics.cpu
      });
    }
    
    // 内存告警
    if (metrics.memory.usage > this.thresholds.memory) {
      this.emit('alert', {
        type: 'memory', 
        level: 'warning',
        message: `内存使用率过高: ${metrics.memory.usage}%`,
        metrics: metrics.memory
      });
    }
  }
  
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = SystemMonitor;
```

### 告警规则配置
```javascript
// monitoring/alert-rules.js
const alertRules = {
  // 系统资源告警
  system: {
    cpu: {
      warning: 80,   // CPU使用率超过80%警告
      critical: 95,  // CPU使用率超过95%严重告警
      duration: 300  // 持续5分钟触发告警
    },
    memory: {
      warning: 85,   // 内存使用率超过85%警告
      critical: 95,  // 内存使用率超过95%严重告警
      duration: 300
    },
    disk: {
      warning: 80,   // 磁盘使用率超过80%警告  
      critical: 90,  // 磁盘使用率超过90%严重告警
      duration: 600
    }
  },
  
  // 应用性能告警
  application: {
    responseTime: {
      warning: 2000,  // 响应时间超过2秒警告
      critical: 5000, // 响应时间超过5秒严重告警
      duration: 180
    },
    errorRate: {
      warning: 0.05,  // 错误率超过5%警告
      critical: 0.10, // 错误率超过10%严重告警
      duration: 300
    },
    throughput: {
      warning: 100,   // QPS低于100警告
      critical: 50,   // QPS低于50严重告警
      duration: 600
    }
  },
  
  // 数据库告警
  database: {
    connectionPool: {
      warning: 80,    // 连接池使用率超过80%警告
      critical: 95,   // 连接池使用率超过95%严重告警
      duration: 300
    },
    slowQuery: {
      warning: 1000,  // 慢查询超过1秒警告
      critical: 5000, // 慢查询超过5秒严重告警
      duration: 60
    }
  },
  
  // 业务指标告警
  business: {
    userLogin: {
      critical: 0.20, // 登录失败率超过20%严重告警
      duration: 900   // 持续15分钟
    },
    dataSync: {
      warning: 3600,  // 数据同步延迟超过1小时警告
      critical: 7200, // 数据同步延迟超过2小时严重告警
      duration: 300
    }
  }
};

// 告警通知配置
const notificationConfig = {
  channels: [
    {
      type: 'email',
      enabled: true,
      recipients: ['admin@village.com', 'ops@village.com'],
      levels: ['warning', 'critical']
    },
    {
      type: 'sms',
      enabled: true,
      recipients: ['+86138****1234'],
      levels: ['critical']
    },
    {
      type: 'webhook', 
      enabled: true,
      url: 'https://hooks.slack.com/services/xxx',
      levels: ['warning', 'critical']
    }
  ],
  
  // 告警抑制规则
  suppression: {
    maxAlertsPerHour: 10,  // 每小时最多发送10条告警
    cooldownPeriod: 1800,  // 同类型告警冷却期30分钟
    escalationDelay: 3600  // 告警升级延迟1小时
  }
};

module.exports = { alertRules, notificationConfig };
```

## 💾 备份恢复

### 自动备份脚本
```bash
#!/bin/bash
# scripts/backup.sh - 完整备份脚本

set -e

# 配置参数
BACKUP_DIR="/backup/village"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOG_FILE="/var/log/village-backup.log"

# MongoDB配置
MONGO_HOST="localhost"
MONGO_PORT="27017"  
MONGO_DB="village"
MONGO_USER=""
MONGO_PASS=""

# 应用配置
APP_DIR="/opt/smart-village"
CONFIG_DIR="/etc/village"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "开始执行备份任务"

# 创建备份目录
mkdir -p $BACKUP_DIR/{mongodb,files,config}

# 1. 备份MongoDB数据库
log "备份MongoDB数据库..."
if [ -n "$MONGO_USER" ]; then
    mongodump --host $MONGO_HOST:$MONGO_PORT \
              --db $MONGO_DB \
              --username $MONGO_USER \
              --password $MONGO_PASS \
              --out $BACKUP_DIR/mongodb/mongo_$DATE
else
    mongodump --host $MONGO_HOST:$MONGO_PORT \
              --db $MONGO_DB \
              --out $BACKUP_DIR/mongodb/mongo_$DATE
fi

# 2. 备份SQLite数据库
log "备份SQLite数据库..."
if [ -f "$APP_DIR/data/village.db" ]; then
    cp $APP_DIR/data/village.db $BACKUP_DIR/files/sqlite_$DATE.db
fi

# 3. 备份上传文件
log "备份用户上传文件..."
if [ -d "$APP_DIR/uploads" ]; then
    tar -czf $BACKUP_DIR/files/uploads_$DATE.tar.gz -C $APP_DIR uploads/
fi

# 4. 备份配置文件
log "备份配置文件..."
tar -czf $BACKUP_DIR/config/config_$DATE.tar.gz \
    -C $APP_DIR .env ecosystem.config.js \
    -C $CONFIG_DIR . \
    -C /etc/nginx sites-available/village

# 5. 备份应用日志
log "备份应用日志..."
if [ -d "$APP_DIR/logs" ]; then
    tar -czf $BACKUP_DIR/files/logs_$DATE.tar.gz -C $APP_DIR logs/
fi

# 6. 创建完整备份包
log "创建完整备份包..."
cd $BACKUP_DIR
tar -czf village_full_backup_$DATE.tar.gz \
    mongodb/mongo_$DATE \
    files/ \
    config/

# 7. 验证备份文件
log "验证备份文件..."
if [ -f "village_full_backup_$DATE.tar.gz" ]; then
    BACKUP_SIZE=$(stat -f%z village_full_backup_$DATE.tar.gz 2>/dev/null || stat -c%s village_full_backup_$DATE.tar.gz)
    log "备份文件创建成功，大小: $(($BACKUP_SIZE / 1024 / 1024))MB"
else
    log "错误: 备份文件创建失败"
    exit 1
fi

# 8. 清理旧备份
log "清理${RETENTION_DAYS}天前的备份文件..."
find $BACKUP_DIR -name "village_full_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/mongodb -name "mongo_*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
find $BACKUP_DIR/files -name "*_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find $BACKUP_DIR/files -name "*_*.db" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# 9. 上传到云存储 (可选)
if [ "$CLOUD_BACKUP_ENABLED" = "true" ]; then
    log "上传备份到云存储..."
    case $CLOUD_PROVIDER in
        "aws")
            aws s3 cp village_full_backup_$DATE.tar.gz s3://$S3_BUCKET/village-backups/
            ;;
        "aliyun") 
            # ossutil cp village_full_backup_$DATE.tar.gz oss://$OSS_BUCKET/village-backups/
            ;;
        "tencent")
            # coscli cp village_full_backup_$DATE.tar.gz cos://$COS_BUCKET/village-backups/
            ;;
    esac
fi

# 10. 发送备份报告
log "发送备份报告..."
BACKUP_REPORT="
备份任务执行完成

时间: $(date '+%Y-%m-%d %H:%M:%S')
备份文件: village_full_backup_$DATE.tar.gz
文件大小: $(($BACKUP_SIZE / 1024 / 1024))MB
备份位置: $BACKUP_DIR

包含内容:
- MongoDB数据库
- SQLite数据库  
- 用户上传文件
- 配置文件
- 应用日志
"

echo "$BACKUP_REPORT" | mail -s "智慧村庄平台备份报告" admin@village.com

log "备份任务执行完成"
```

### 数据恢复脚本
```bash
#!/bin/bash
# scripts/restore.sh - 数据恢复脚本

set -e

BACKUP_FILE=$1
RESTORE_DIR="/tmp/village-restore"
APP_DIR="/opt/smart-village"
LOG_FILE="/var/log/village-restore.log"

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: $0 <备份文件路径>"
    echo "例如: $0 /backup/village/village_full_backup_20250113_143022.tar.gz"
    exit 1
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "开始数据恢复，备份文件: $BACKUP_FILE"

# 1. 验证备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    log "错误: 备份文件不存在"
    exit 1
fi

# 2. 停止应用服务
log "停止应用服务..."
pm2 stop village-main village-service || true
systemctl stop nginx || true

# 3. 解压备份文件
log "解压备份文件..."
rm -rf $RESTORE_DIR
mkdir -p $RESTORE_DIR
cd $RESTORE_DIR
tar -xzf $BACKUP_FILE

# 4. 恢复MongoDB数据库
log "恢复MongoDB数据库..."
if [ -d "mongodb" ]; then
    # 备份当前数据库
    mongodump --db village --out backup_before_restore_$(date +%Y%m%d_%H%M%S)
    
    # 删除现有数据
    mongo village --eval "db.dropDatabase()"
    
    # 恢复数据
    MONGO_BACKUP_DIR=$(find mongodb -name "village" -type d | head -1)
    if [ -n "$MONGO_BACKUP_DIR" ]; then
        mongorestore --db village $MONGO_BACKUP_DIR
        log "MongoDB数据库恢复完成"
    else
        log "警告: 未找到MongoDB备份数据"
    fi
fi

# 5. 恢复SQLite数据库
log "恢复SQLite数据库..."
if [ -f "files/sqlite_*.db" ]; then
    # 备份当前数据库
    [ -f "$APP_DIR/data/village.db" ] && cp $APP_DIR/data/village.db $APP_DIR/data/village.db.backup.$(date +%Y%m%d_%H%M%S)
    
    # 恢复数据库
    SQLITE_FILE=$(ls files/sqlite_*.db | head -1)
    mkdir -p $APP_DIR/data
    cp $SQLITE_FILE $APP_DIR/data/village.db
    chown village:village $APP_DIR/data/village.db
    log "SQLite数据库恢复完成"
fi

# 6. 恢复上传文件
log "恢复用户上传文件..."
if [ -f "files/uploads_*.tar.gz" ]; then
    # 备份当前文件
    [ -d "$APP_DIR/uploads" ] && mv $APP_DIR/uploads $APP_DIR/uploads.backup.$(date +%Y%m%d_%H%M%S)
    
    # 恢复文件
    UPLOADS_FILE=$(ls files/uploads_*.tar.gz | head -1)
    cd $APP_DIR
    tar -xzf $RESTORE_DIR/$UPLOADS_FILE
    chown -R village:village uploads/
    log "用户上传文件恢复完成"
fi

# 7. 恢复配置文件 (谨慎操作)
read -p "是否恢复配置文件? 这可能会覆盖当前配置 (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "恢复配置文件..."
    if [ -f "config/config_*.tar.gz" ]; then
        CONFIG_FILE=$(ls config/config_*.tar.gz | head -1)
        cd /tmp
        tar -xzf $RESTORE_DIR/$CONFIG_FILE
        
        # 恢复应用配置
        [ -f ".env" ] && cp .env $APP_DIR/.env.restored
        [ -f "ecosystem.config.js" ] && cp ecosystem.config.js $APP_DIR/ecosystem.config.js.restored
        
        log "配置文件已恢复到 *.restored 文件，请手动检查后重命名"
    fi
fi

# 8. 验证数据恢复
log "验证数据恢复..."
cd $APP_DIR

# 检查数据库连接
if command -v mongo &> /dev/null; then
    MONGO_COUNT=$(mongo village --quiet --eval "db.users.count()")
    log "MongoDB用户数据恢复: $MONGO_COUNT 条记录"
fi

if [ -f "data/village.db" ]; then
    SQLITE_SIZE=$(stat -f%z data/village.db 2>/dev/null || stat -c%s data/village.db)
    log "SQLite数据库大小: $(($SQLITE_SIZE / 1024))KB"
fi

# 9. 重启服务
log "重启服务..."
systemctl start nginx
pm2 start ecosystem.config.js
pm2 save

# 等待服务启动
sleep 10

# 检查服务状态
if pm2 list | grep -q "online"; then
    log "服务启动成功"
else
    log "警告: 部分服务可能未正常启动，请检查"
fi

# 10. 清理临时文件
log "清理临时文件..."
rm -rf $RESTORE_DIR

log "数据恢复完成！请验证系统功能是否正常"

# 11. 发送恢复报告
RESTORE_REPORT="
数据恢复任务完成

时间: $(date '+%Y-%m-%d %H:%M:%S')
备份文件: $BACKUP_FILE
恢复状态: 成功

请登录系统验证以下功能:
1. 用户登录功能
2. 数据查询功能  
3. 文件上传功能
4. 系统监控功能

如有问题请及时联系技术人员。
"

echo "$RESTORE_REPORT" | mail -s "智慧村庄平台恢复报告" admin@village.com
```

### 定时备份配置
```bash
# 添加到crontab
# crontab -e

# 每天凌晨2点执行完整备份
0 2 * * * /opt/smart-village/scripts/backup.sh >> /var/log/village-backup.log 2>&1

# 每12小时执行增量备份（仅备份变更的文件）
0 */12 * * * /opt/smart-village/scripts/backup-incremental.sh >> /var/log/village-backup.log 2>&1

# 每周日执行深度备份（包含系统配置）
0 3 * * 0 /opt/smart-village/scripts/backup-deep.sh >> /var/log/village-backup.log 2>&1

# 每月1号清理过期备份和日志
0 4 1 * * /opt/smart-village/scripts/cleanup-old-backups.sh >> /var/log/village-backup.log 2>&1
```

## 🚨 故障处理

### 常见故障处理手册
```bash
#!/bin/bash
# scripts/troubleshoot.sh - 故障诊断和处理脚本

case "$1" in
    "service-down")
        echo "=== 服务停止故障处理 ==="
        
        # 检查进程状态
        pm2 list
        
        # 检查端口占用
        netstat -tlnp | grep -E ":3001|:5000"
        
        # 检查日志
        tail -50 logs/main-error.log
        tail -50 logs/service-error.log
        
        # 尝试重启服务
        pm2 restart all
        ;;
        
    "high-cpu")
        echo "=== CPU使用率过高处理 ==="
        
        # 显示CPU占用最高的进程
        ps aux --sort=-%cpu | head -10
        
        # 检查Node.js进程
        ps aux | grep node
        
        # 生成性能报告
        node --prof-process --preprocess -j isolate-0x*.log > cpu-profile.json
        
        # 建议处理方案
        echo "建议处理方案:"
        echo "1. 检查是否有死循环或无限递归"
        echo "2. 优化数据库查询性能"
        echo "3. 考虑增加服务器实例"
        ;;
        
    "memory-leak")
        echo "=== 内存泄漏处理 ==="
        
        # 显示内存占用
        free -h
        ps aux --sort=-%mem | head -10
        
        # 生成内存快照
        node --inspect=localhost:9229 src/app.js &
        sleep 5
        curl -X POST http://localhost:9229/json/runtime/evaluate \
             -d '{"expression":"require(\"v8\").writeHeapSnapshot()"}' \
             -H "Content-Type: application/json"
        
        echo "内存快照已生成，请使用Chrome DevTools分析"
        ;;
        
    "database-slow")
        echo "=== 数据库性能问题处理 ==="
        
        # 检查MongoDB慢查询
        mongo village --eval "db.runCommand({profile: 2, slowms: 1000})"
        mongo village --eval "db.system.profile.find().sort({ts: -1}).limit(5).pretty()"
        
        # 检查索引使用情况
        mongo village --eval "db.users.getIndexes()"
        
        # 检查连接数
        mongo village --eval "db.serverStatus().connections"
        
        echo "建议处理方案:"
        echo "1. 为慢查询添加合适的索引"
        echo "2. 优化查询语句"
        echo "3. 考虑分页查询大量数据"
        ;;
        
    "disk-full")
        echo "=== 磁盘空间不足处理 ==="
        
        # 显示磁盘使用情况
        df -h
        
        # 查找大文件
        find /opt/smart-village -type f -size +100M -exec ls -lh {} \; | sort -k5 -rh
        
        # 清理日志文件
        find /opt/smart-village/logs -name "*.log" -mtime +7 -exec rm {} \;
        
        # 清理上传的临时文件
        find /opt/smart-village/uploads/temp -mtime +1 -exec rm {} \;
        
        # 清理系统缓存
        echo 3 > /proc/sys/vm/drop_caches
        ;;
        
    "network-issue")
        echo "=== 网络连接问题处理 ==="
        
        # 检查网络连接
        ping -c 3 8.8.8.8
        
        # 检查DNS解析
        nslookup google.com
        
        # 检查端口连通性
        telnet localhost 3001
        telnet localhost 5000
        
        # 检查防火墙设置
        iptables -L
        
        echo "建议处理方案:"
        echo "1. 检查网络配置"
        echo "2. 检查防火墙规则"  
        echo "3. 检查DNS设置"
        ;;
        
    *)
        echo "用法: $0 {service-down|high-cpu|memory-leak|database-slow|disk-full|network-issue}"
        echo ""
        echo "故障类型说明:"
        echo "  service-down   - 服务停止或无响应"
        echo "  high-cpu       - CPU使用率过高"
        echo "  memory-leak    - 内存泄漏问题"
        echo "  database-slow  - 数据库性能问题"
        echo "  disk-full      - 磁盘空间不足"
        echo "  network-issue  - 网络连接问题"
        ;;
esac
```

### 故障应急预案
```yaml
# emergency-response.yml
emergencyPlans:
  serviceOutage:
    detection:
      - 健康检查失败
      - 大量500错误
      - 用户反馈无法访问
    immediateActions:
      - 检查服务进程状态
      - 查看错误日志
      - 重启相关服务
    escalation:
      - 5分钟内未恢复 -> 通知主管
      - 15分钟内未恢复 -> 启用备用服务
      - 30分钟内未恢复 -> 激活灾备中心
    
  dataCorruption:
    detection:
      - 数据校验失败
      - 查询返回异常
      - 用户报告数据错误
    immediateActions:
      - 停止写操作
      - 验证备份完整性
      - 隔离受影响的数据
    escalation:
      - 立即通知DBA
      - 启动数据恢复流程
      - 评估数据丢失范围
    
  securityIncident:
    detection:
      - 异常登录行为
      - 权限越权访问
      - 系统入侵迹象
    immediateActions:
      - 立即修改所有管理员密码
      - 禁用受影响账户
      - 启用额外安全措施
    escalation:
      - 立即通知安全团队
      - 保留日志证据
      - 考虑临时关闭服务
```

---

## 📞 技术支持

### 运维联系方式
- **紧急故障**: +86-400-xxx-xxxx (7x24小时)
- **技术支持**: support@village-platform.com
- **运维团队**: ops@village-platform.com

### 文档更新
本文档会根据系统升级和运维经验持续更新，请关注最新版本。

---

> 💡 **重要提醒**: 
> 1. 所有生产环境操作都应该有备份和回滚方案
> 2. 重要变更应该在非业务高峰期执行  
> 3. 建议建立操作审计制度，记录所有变更操作
>
> 📅 **最后更新**: 2025年1月
> 
> 🔄 **版本**: v1.0.0