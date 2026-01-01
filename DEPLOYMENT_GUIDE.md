# 智慧乡村微服务部署和测试指南

## 📋 目录

1. [环境准备](#环境准备)
2. [快速部署](#快速部署)
3. [完整部署](#完整部署)
4. [服务测试](#服务测试)
5. [数据迁移](#数据迁移)
6. [灰度上线](#灰度上线)
7. [故障排查](#故障排查)
8. [性能优化](#性能优化)

## 🔧 环境准备

### 系统要求

- **操作系统**: Windows 10+, Linux, macOS
- **Node.js**: >= 16.0.0
- **MongoDB**: >= 4.4
- **Redis**: >= 6.0
- **内存**: >= 8GB
- **磁盘**: >= 20GB 可用空间

### 依赖软件安装

#### 1. Node.js 安装
```bash
# Windows: 从 https://nodejs.org 下载安装包
# macOS: brew install node
# Linux (Ubuntu): curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
#              sudo apt-get install -y nodejs
```

#### 2. MongoDB 安装
```bash
# Windows: 从 https://www.mongodb.com 下载安装
# macOS: brew install mongodb-community
# Linux (Ubuntu): sudo apt-get install -y mongodb
```

#### 3. Redis 安装
```bash
# Windows: 从 https://github.com/microsoftarchive/redis 下载
# macOS: brew install redis
# Linux (Ubuntu): sudo apt-get install redis-server
```

#### 4. RabbitMQ (可选)
```bash
# Windows: 从 https://www.rabbitmq.com 下载安装
# macOS: brew install rabbitmq
# Linux (Ubuntu): sudo apt-get install rabbitmq-server
```

### 验证环境
```bash
node --version    # 应显示 v16.x.x 或更高
npm --version     # 应显示 npm 版本
mongod --version  # 验证 MongoDB
redis-server --version  # 验证 Redis
```

## 🚀 快速部署

### 1. 一键启动微服务
```bash
# Windows
microservices\deploy\quick-start.bat

# Linux/macOS
chmod +x microservices/deploy/quick-start.sh
./microservices/deploy/quick-start.sh
```

### 2. 验证服务状态
访问以下地址验证服务是否正常启动：

- **API网关**: http://localhost:8080/health
- **监控服务**: http://localhost:3001/health
- **AIOps服务**: http://localhost:7000/health

### 3. 停止服务
```bash
# Windows: 关闭所有启动的命令行窗口
# Linux/macOS: pkill -f "node.*SmartVillage"
```

## 🏗️ 完整部署

### 1. 环境配置
```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用其他编辑器
```

### 2. 运行完整部署脚本
```bash
# Windows (管理员权限)
microservices\deploy\deploy-microservices.bat

# Linux/macOS
chmod +x microservices/deploy/deploy-microservices.sh
./microservices/deploy/deploy-microservices.sh
```

### 3. 使用PM2管理 (推荐)
```bash
# 安装PM2
npm install -g pm2

# 启动所有微服务
pm2 start ecosystem.config.js

# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all

# 停止服务
pm2 stop all

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

### 4. Nginx反向代理 (生产环境)
```bash
# 安装Nginx
# Windows: 下载并安装 Nginx
# Linux: sudo apt-get install nginx
# macOS: brew install nginx

# 复制配置文件
sudo cp microservices/deploy/config/nginx/smart-village.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/smart-village.conf /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx  # Linux
# 或
sudo nginx -s reload
```

## 🧪 服务测试

### 1. 自动化测试
```bash
# 运行测试套件
tests\run-tests.bat  # Windows
./tests/run-tests.sh # Linux/macOS
```

### 2. 集成测试
```bash
# 单独运行集成测试
node tests/integration/microservices-integration-test.js
```

### 3. 性能测试
```bash
# 运行性能测试
node tests/performance/performance-test.js
```

### 4. 手动测试
```bash
# 测试API网关
curl http://localhost:8080/health

# 测试监控服务
curl http://localhost:3001/health

# 测试AIOps服务
curl http://localhost:7000/health

# 测试异常检测
curl -X POST http://localhost:7000/api/anomaly/detect \
  -H "Content-Type: application/json" \
  -d '{"metricName":"response_time","value":1500,"serviceName":"test-service"}'
```

### 5. 测试报告
测试报告会生成在以下位置：
- 集成测试: `logs/tests/integration-test.log`
- 性能测试: `logs/tests/performance-test.log`
- JSON报告: `tests/test-report.json`

## 📊 数据迁移

### 1. 准备迁移
```bash
# 安装迁移依赖
npm install mongodb

# 设置环境变量
export SOURCE_MONGO_URI="mongodb://localhost:27017/smart_village"
export TARGET_MONGO_URI="mongodb://localhost:27017"
```

### 2. 模拟迁移 (推荐先执行)
```bash
export DRY_RUN=true
node scripts/data-migration.js
```

### 3. 执行实际迁移
```bash
export DRY_RUN=false
node scripts/data-migration.js
```

### 4. 验证迁移结果
```bash
# 连接到目标数据库
mongo smart_village_users
mongo smart_village_residents
mongo smart_village_affairs
mongo smart_village_finance

# 检查数据完整性
db.users.countDocuments()
db.residents.countDocuments()
db.announcements.countDocuments()
db.transactions.countDocuments()
```

### 5. 迁移报告
迁移完成后会生成详细报告，包含：
- 迁移统计
- 错误记录
- 数据验证结果

## 🌈 灰度上线

### 1. 流量分割配置
```nginx
# Nginx配置示例
upstream legacy_backend {
    server localhost:3000;  # 原单体应用
    server localhost:3000;
}

upstream microservices_backend {
    server localhost:8080;  # 微服务网关
    server localhost:8080;
}

# 基于用户ID的灰度
server {
    location /api/v1/users {
        if ($http_x_user_id ~ "^1[0-9]{3}") {
            proxy_pass http://microservices_backend;
        }
        proxy_pass http://legacy_backend;
    }
}

# 基于百分比的灰度
server {
    location /api/v1/ {
        set_random $percent 0 99;
        if ($percent < 10) {  # 10% 流量到微服务
            proxy_pass http://microservices_backend;
        }
        proxy_pass http://legacy_backend;
    }
}
```

### 2. 监控和切换
```bash
# 监控微服务健康状态
watch -n 5 'curl -s http://localhost:8080/health | jq .'

# 监控关键指标
curl http://localhost:8080/gateway/services

# 逐步增加流量比例
# 修改Nginx配置中的百分比参数
```

### 3. 回滚策略
```bash
# 快速回滚到单体应用
# 1. 修改Nginx配置，将所有流量指向原应用
# 2. 重新加载Nginx配置
# 3. 监控应用状态

# 完全切换到微服务
# 1. 停止单体应用
# 2. 修改Nginx配置，将所有流量指向微服务
# 3. 验证所有功能正常
```

## 🔧 故障排查

### 常见问题

#### 1. 服务启动失败
```bash
# 检查端口占用
netstat -an | grep :8080  # Linux/macOS
netstat -an | findstr :8080  # Windows

# 检查日志
tail -f logs/gateway/error.log
tail -f logs/monitoring/error.log
tail -f logs/aiops/error.log

# 检查PM2状态
pm2 status
pm2 logs smart-village-gateway
```

#### 2. 数据库连接失败
```bash
# 检查MongoDB状态
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# 测试连接
mongo mongodb://localhost:27017
```

#### 3. Redis连接失败
```bash
# 检查Redis状态
redis-cli ping

# 检查Redis服务
sudo systemctl status redis  # Linux
brew services list | grep redis  # macOS
```

#### 4. 内存不足
```bash
# 检查内存使用
free -h  # Linux
top -o mem  # macOS
tasklist /fi "memusage gt 100000"  # Windows

# 优化PM2配置
pm2 delete all
# 编辑 ecosystem.config.js 减少实例数或内存限制
pm2 start ecosystem.config.js
```

#### 5. 性能问题
```bash
# 检查系统负载
top  # Linux/macOS
tasklist /fo table  # Windows

# 检查网络连接
ss -tuln  # Linux
netstat -an  # Windows

# 运行性能测试
node tests/performance/performance-test.js
```

### 日志分析
```bash
# 实时查看日志
tail -f logs/gateway/combined.log
tail -f logs/monitoring/combined.log
tail -f logs/aiops/combined.log

# 搜索错误日志
grep -i error logs/*/error.log
grep -i exception logs/*/error.log

# 分析访问日志
awk '{print $1}' logs/gateway/access.log | sort | uniq -c | sort -nr
```

## ⚡ 性能优化

### 1. 应用层优化
```javascript
// 启用集群模式
module.exports = {
  apps: [{
    name: 'smart-village-gateway',
    script: './microservices/gateway/SmartVillageAPIGateway.js',
    instances: 'max',  // 使用所有CPU核心
    exec_mode: 'cluster',
    max_memory_restart: '1G'
  }]
};

// 连接池配置
const mongoose = require('mongoose');
mongoose.connect(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 2. 数据库优化
```javascript
// 创建索引
db.users.createIndex({ username: 1 }, { unique: true });
db.residents.createIndex({ idCard: 1 }, { unique: true });

// 查询优化
const users = await User.find({ status: 'active' })
  .select('username email')
  .limit(20)
  .lean();  // 返回普通对象而非Mongoose文档
```

### 3. 缓存策略
```javascript
// Redis缓存
const cacheKey = `user:${userId}`;
const cachedUser = await redis.get(cacheKey);

if (!cachedUser) {
  const user = await User.findById(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(user));
  return user;
}

return JSON.parse(cachedUser);
```

### 4. 负载均衡
```nginx
upstream smart_village_backend {
    server localhost:8080 weight=3 max_fails=3 fail_timeout=30s;
    server localhost:8081 weight=2 max_fails=3 fail_timeout=30s;
    server localhost:8082 weight=1 max_fails=3 fail_timeout=30s;
}
```

## 📈 监控指标

### 关键指标
- **可用性**: 服务在线率 > 99.9%
- **响应时间**: 平均响应时间 < 500ms
- **吞吐量**: 每秒请求数 > 100 RPS
- **错误率**: 错误率 < 0.1%
- **CPU使用率**: < 80%
- **内存使用率**: < 85%
- **磁盘使用率**: < 90%

### 监控工具
- **应用监控**: 内置监控服务
- **系统监控**: AIOps服务
- **日志监控**: ELK Stack (可选)
- **网络监控**: Prometheus + Grafana (可选)

## 🔒 安全配置

### 1. 环境变量安全
```bash
# 使用强密钥
openssl rand -base64 32  # JWT密钥
openssl rand -hex 64    # 加密密钥

# 设置文件权限
chmod 600 .env
chmod 700 logs/
```

### 2. 网络安全
```nginx
# 安全头部
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;

# 限流配置
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;
```

### 3. 数据库安全
```javascript
// 启用认证
mongo --username admin --password

// 使用SSL连接
mongoose.connect('mongodb://username:password@host:port/database?ssl=true');
```

## 📚 扩展阅读

- [微服务架构文档](./microservices/MICROSERVICES_ARCHITECTURE.md)
- [AIOps智能运维文档](./aiops/README.md)
- [监控系统文档](./monitoring/README.md)

## 🆘 技术支持

如遇到问题，请按以下步骤排查：

1. 查看本文档的故障排查部分
2. 检查相关日志文件
3. 运行健康检查脚本
4. 联系技术支持团队

---

**最后更新**: 2025-12-21
**版本**: 1.0.0
**维护团队**: Smart Village Development Team