# 智慧乡村人脸识别系统部署指南

## 系统概述

本指南详细介绍如何部署和配置智慧乡村人脸识别系统。该系统提供安全可靠的人脸识别、活体检测、亲属代理和审计功能，符合《个人信息保护法》和GDPR合规要求。

### 系统架构
```
┌─────────────────────────────────────────────────────────────────┐
│                         智慧乡村人脸识别系统                          │
├─────────────────────────────────────────────────────────────────┤
│                      前端应用层 (Vue.js)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ 人脸采集组件 │ │ 身份验证组件 │ │ 代理管理界面 │ │ 审计日志界面 │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     后端API层 (Node.js)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ 人脸识别API  │ │ 权限管理API  │ │ 代理关系API  │ │ 审计日志API  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    AI处理层 (Python)                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ 人脸检测模块 │ │ 特征提取模块 │ │ 活体检测模块 │ │ 防欺骗模块   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     数据存储层                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ MongoDB      │ │ Redis缓存    │ │ 加密文件存储 │ │ 日志存储     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 环境要求

### 硬件要求
- **CPU**: 4核心以上，推荐8核心
- **内存**: 8GB以上，推荐16GB
- **存储**: 100GB以上可用空间
- **GPU**: 支持CUDA的NVIDIA GPU（可选，用于加速AI处理）
- **网络**: 稳定的互联网连接

### 软件要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **Node.js**: 18.x LTS或更高版本
- **Python**: 3.9+ 或 3.10+
- **MongoDB**: 5.0+ 或 4.4+
- **Redis**: 6.0+
- **Docker**: 20.10+（可选，用于容器化部署）
- **Nginx**: 1.18+（用于反向代理）

## 部署步骤

### 1. 环境准备

#### 1.1 安装Node.js
```bash
# 使用nvm安装Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

#### 1.2 安装Python
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.9 python3.9-pip python3.9-venv

# CentOS/RHEL
sudo yum install python39 python39-pip

# Windows
# 从 https://python.org 下载Python 3.9+ 安装包
```

#### 1.3 安装MongoDB
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 1.4 安装Redis
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# 启动Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 2. 下载和配置项目

#### 2.1 克隆项目代码
```bash
git clone https://github.com/your-org/smart-village-face-recognition.git
cd smart-village-face-recognition
```

#### 2.2 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env.production
```

编辑 `.env.production` 文件：
```bash
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/smart_village_face_recognition
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# 人脸识别服务配置
FACE_RECOGNITION_SERVICE_URL=http://localhost:8080
FACE_MODEL_DIR=./services/face_recognition_core/models

# 加密配置
ENCRYPTION_KEY=your-32-character-encryption-key
FACE_FEATURE_KEY=your-face-feature-encryption-key

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=60000
MAX_LOGIN_ATTEMPTS=5

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 邮件配置（用于通知）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# 应用配置
NODE_ENV=production
PORT=3001
CLIENT_URL=https://your-domain.com

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs

# 监控配置
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 3. 安装依赖

#### 3.1 安装Node.js依赖
```bash
# 安装项目依赖
npm ci --only=production

# 全局安装PM2（进程管理器）
npm install -g pm2
```

#### 3.2 安装Python依赖
```bash
cd services/face_recognition_core

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 安装Python依赖
pip install -r requirements.txt

# 下载预训练模型（如果需要）
python download_models.py

# 返回项目根目录
cd ../..
```

#### 3.3 下载AI模型文件
```bash
# 创建模型目录
mkdir -p services/face_recognition_core/models

# 下载人脸检测模型
wget -O services/face_recognition_core/models/face_detector.tflite \
  https://github.com/your-models/face_detector.tflite

# 下载人脸识别模型
wget -O services/face_recognition_core/models/face_encoder.tflite \
  https://github.com/your-models/face_encoder.tflite

# 下载活体检测模型
wget -O services/face_recognition_core/models/liveness_detector.tflite \
  https://github.com/your-models/liveness_detector.tflite
```

### 4. 数据库初始化

#### 4.1 MongoDB初始化
```bash
# 创建数据库和索引
node scripts/init-database.js

# 创建管理员用户
node scripts/create-admin.js
```

#### 4.2 Redis配置
```bash
# 编辑Redis配置文件
sudo nano /etc/redis/redis.conf

# 设置密码
requirepass your-redis-password

# 重启Redis
sudo systemctl restart redis-server
```

### 5. 构建前端应用

#### 5.1 安装前端依赖
```bash
cd client
npm ci
```

#### 5.2 构建生产版本
```bash
# 设置生产环境变量
export NODE_ENV=production
export VUE_APP_API_BASE_URL=https://your-api-domain.com/api

# 构建应用
npm run build

# 返回项目根目录
cd ..
```

### 6. 配置Nginx

#### 6.1 创建Nginx配置文件
```bash
sudo nano /etc/nginx/sites-available/smart-village-face-recognition
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' wss: https:;";

    # 前端静态文件
    location / {
        root /path/to/smart-village-face-recognition/client/dist;
        try_files $uri $uri/ /index.html;

        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 文件上传限制
    client_max_body_size 50M;

    # 日志配置
    access_log /var/log/nginx/smart-village-face-recognition.access.log;
    error_log /var/log/nginx/smart-village-face-recognition.error.log;
}
```

#### 6.2 启用站点
```bash
sudo ln -s /etc/nginx/sites-available/smart-village-face-recognition /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. 创建systemd服务

#### 7.1 创建Node.js服务
```bash
sudo nano /etc/systemd/system/smart-village-api.service
```

```ini
[Unit]
Description=Smart Village Face Recognition API
After=network.target mongod.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/smart-village-face-recognition
Environment=NODE_ENV=production
EnvironmentFile=/path/to/smart-village-face-recognition/.env.production
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=smart-village-api

# 资源限制
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

#### 7.2 创建Python服务
```bash
sudo nano /etc/systemd/system/smart-village-face-recognition.service
```

```ini
[Unit]
Description=Smart Village Face Recognition Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/smart-village-face-recognition/services/face_recognition_core
Environment=PATH=/path/to/smart-village-face-recognition/services/face_recognition_core/venv/bin
EnvironmentFile=/path/to/smart-village-face-recognition/.env.production
ExecStart=/path/to/smart-village-face-recognition/services/face_recognition_core/venv/bin/python api_server.py
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=smart-village-face-recognition

# 资源限制
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

#### 7.3 启用服务
```bash
sudo systemctl daemon-reload
sudo systemctl enable smart-village-api.service
sudo systemctl enable smart-village-face-recognition.service
sudo systemctl start smart-village-api.service
sudo systemctl start smart-village-face-recognition.service
```

### 8. 配置SSL证书

#### 8.1 使用Let's Encrypt（推荐）
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 8.2 使用自签名证书（仅用于测试）
```bash
# 生成自签名证书
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/smart-village.key \
  -out /etc/ssl/certs/smart-village.crt
```

### 9. 配置防火墙

#### 9.1 UFW配置（Ubuntu）
```bash
# 启用防火墙
sudo ufw enable

# 允许必要端口
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 查看防火墙状态
sudo ufw status
```

#### 9.2 iptables配置（通用）
```bash
# 允许HTTP和HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 允许SSH（根据需要调整端口）
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 保存规则
sudo iptables-save > /etc/iptables/rules.v4
```

### 10. 监控和日志

#### 10.1 配置日志轮转
```bash
sudo nano /etc/logrotate.d/smart-village-face-recognition
```

```
/path/to/smart-village-face-recognition/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload smart-village-api
        systemctl reload smart-village-face-recognition
    endscript
}
```

#### 10.2 设置监控
```bash
# 创建监控脚本
cat > monitor-services.sh << 'EOF'
#!/bin/bash

# 检查服务状态
services=("smart-village-api" "smart-village-face-recognition")

for service in "${services[@]}"; do
    if ! systemctl is-active --quiet "$service"; then
        echo "Service $service is not running, attempting to restart..."
        systemctl restart "$service"
        echo "$(date): Restarted $service" >> /var/log/service-restarts.log
    fi
done

# 检查磁盘空间
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 80 ]; then
    echo "$(date): High disk usage: ${disk_usage}%" >> /var/log/system-alerts.log
fi

# 检查内存使用
memory_usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
if (( $(echo "$memory_usage > 90" | bc -l) )); then
    echo "$(date): High memory usage: ${memory_usage}%" >> /var/log/system-alerts.log
fi
EOF

chmod +x monitor-services.sh

# 添加到crontab（每5分钟检查一次）
echo "*/5 * * * * /path/to/monitor-services.sh" | sudo crontab -
```

### 11. 性能优化

#### 11.1 Node.js优化
```bash
# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 启用集群模式
pm2 start src/app.js -i max --name smart-village-api
```

#### 11.2 数据库优化
```bash
# MongoDB配置优化
sudo nano /etc/mongod.conf
```

```yaml
# MongoDB配置
net:
  port: 27017
  bindIp: 127.0.0.1

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
```

### 12. 备份策略

#### 12.1 数据库备份
```bash
# 创建备份脚本
cat > backup-database.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="smart_village_face_recognition"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
mongodump --db $DB_NAME --out $BACKUP_DIR/backup_$DATE

# 压缩备份文件
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# 删除7天前的备份
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "$(date): Database backup completed" >> /var/log/backup.log
EOF

chmod +x backup-database.sh

# 添加到crontab（每天凌晨2点备份）
echo "0 2 * * * /path/to/backup-database.sh" | sudo crontab -
```

#### 12.2 文件备份
```bash
# 创建文件备份脚本
cat > backup-files.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backup/files"
DATE=$(date +%Y%m%d_%H%M%S)
SOURCE_DIR="/path/to/smart-village-face-recognition/uploads"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 同步文件
rsync -av --delete $SOURCE_DIR/ $BACKUP_DIR/files_$DATE/

echo "$(date): Files backup completed" >> /var/log/backup.log
EOF

chmod +x backup-files.sh

# 添加到crontab（每天凌晨3点备份）
echo "0 3 * * * /path/to/backup-files.sh" | sudo crontab -
```

## 安全配置

### 1. 系统安全
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 禁用root登录
sudo nano /etc/ssh/sshd_config
# 修改: PermitRootLogin no

# 配置fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. 应用安全
```bash
# 设置文件权限
sudo chown -R www-data:www-data /path/to/smart-village-face-recognition
sudo chmod -R 755 /path/to/smart-village-face-recognition

# 保护敏感文件
sudo chmod 600 /path/to/smart-village-face-recognition/.env.production
```

### 3. 网络安全
```bash
# 配置fail2ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

## 验证部署

### 1. 检查服务状态
```bash
# 检查所有服务
sudo systemctl status smart-village-api
sudo systemctl status smart-village-face-recognition
sudo systemctl status mongod
sudo systemctl status redis-server
sudo systemctl status nginx
```

### 2. 测试API
```bash
# 测试健康检查端点
curl -X GET https://your-domain.com/api/health

# 测试人脸检测API
curl -X POST https://your-domain.com/api/face/detect \
  -H "Content-Type: application/json" \
  -d '{"image":"base64-image-data","villageId":"test-village"}'
```

### 3. 访问前端应用
在浏览器中访问 `https://your-domain.com`，验证：
- 页面正常加载
- 用户可以正常登录
- 人脸识别功能正常工作

## 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 查看服务日志
sudo journalctl -u smart-village-api -f
sudo journalctl -u smart-village-face-recognition -f
```

#### 2. 数据库连接失败
```bash
# 检查MongoDB状态
sudo systemctl status mongod
sudo mongosh --eval "db.adminCommand('ismaster')"

# 检查连接配置
netstat -tlnp | grep 27017
```

#### 3. 内存不足
```bash
# 检查内存使用
free -h
ps aux --sort=-%mem | head

# 增加交换空间
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 4. 磁盘空间不足
```bash
# 检查磁盘使用
df -h
du -sh /path/to/smart-village-face-recognition

# 清理日志文件
sudo journalctl --vacuum-time=7d
```

## 维护指南

### 1. 定期维护任务
- **每日**: 检查服务状态、监控系统资源
- **每周**: 检查日志文件、更新系统补丁
- **每月**: 数据库优化、清理旧数据、检查备份
- **每季度**: 性能调优、安全审计

### 2. 监控指标
- 服务可用性
- 响应时间
- 错误率
- 资源使用率（CPU、内存、磁盘、网络）
- 人脸识别成功率
- 活体检测准确率

### 3. 性能调优
- 数据库索引优化
- 缓存策略调整
- 负载均衡配置
- CDN配置

## 联系支持

如果在部署过程中遇到问题，请：
1. 查看系统日志和错误信息
2. 检查本文档的故障排除部分
3. 联系技术支持团队

技术支持邮箱：support@smart-village.com
技术支持电话：400-XXX-XXXX

---

**文档版本**: v1.0
**最后更新**: 2025-12-19
**维护者**: Smart Village开发团队