# 智慧乡村平台微服务架构优化报告

## 项目概述

本报告详细记录了智慧乡村综合服务平台从单体架构向微服务架构转型的设计与实现。通过微服务拆分，系统获得了更好的可扩展性、可维护性和部署灵活性。

## 架构优化目标

### 1. 服务拆分策略
- ✅ **用户服务 (User Service)**: 负责认证、授权、权限管理
- ✅ **村民服务 (Resident Service)**: 负责村民档案、家庭管理、统计分析
- 🔄 **村务服务 (Governance Service)**: 负责村务治理、公告会议、任务调度
- 🔄 **财务服务 (Finance Service)**: 负责财务管理、支付处理、报表生成
- 📋 **API网关**: 统一入口、路由、认证、限流

### 2. 数据库分离策略
- ✅ **用户数据库**: user_db - 用户、角色、权限数据
- ✅ **村民数据库**: resident_db - 村民档案、家庭数据
- 📋 **村务数据库**: governance_db - 公告、会议、任务数据
- 📋 **财务数据库**: finance_db - 财务记录、支付数据

## 已完成的微服务

### 1. 用户服务 (User Service)
**端口**: 3002
**职责**: 认证、授权、权限管理

**核心功能**:
- ✅ JWT Token认证与刷新
- ✅ 双因子认证 (2FA)
- ✅ 角色权限管理 (RBAC)
- ✅ 密码安全策略
- ✅ 用户会话管理
- ✅ 审计日志
- ✅ 服务注册与发现

**技术特性**:
```javascript
// 核心模型
- User: 用户基本信息、登录记录、会话管理
- Role: 角色定义、权限配置、层级管理

// 安全特性
- 密码加密存储 (bcrypt)
- JWT Token管理
- Redis会话缓存
- 登录失败锁定
- 双因子认证

// API端点
POST /api/v1/auth/login          // 用户登录
POST /api/v1/auth/logout         // 用户登出
POST /api/v1/auth/refresh        // 刷新Token
GET  /api/v1/users              // 用户列表
POST /api/v1/users              // 创建用户
PUT  /api/v1/users/:id          // 更新用户
GET  /api/v1/roles              // 角色列表
POST /api/v1/roles              // 创建角色
```

**服务特性**:
- 健康检查: `/health`
- 服务信息: `/info`
- 内部通信: `/internal/*`
- 自动服务注册到Consul

### 2. 村民服务 (Resident Service)
**端口**: 3003
**职责**: 村民档案、家庭管理、统计分析

**核心功能**:
- ✅ 村民档案管理
- ✅ 家庭关系管理
- ✅ 人口统计分析
- ✅ 批量导入导出
- ✅ 数据可视化
- ✅ 智能搜索

**技术特性**:
```javascript
// 核心模型
- Resident: 个人档案、身份信息、联系方式、教育背景
- Family: 家庭信息、成员关系、经济状况、住房信息

// 数据字段
- 基本信息: 姓名、身份证、性别、出生日期
- 个人信息: 民族、籍贯、教育、职业
- 联系方式: 电话、邮箱、地址
- 家庭信息: 家庭关系、婚姻状况、子女数量
- 健康状况: 健康状态、残疾信息、医疗保险
- 经济信息: 收入来源、资产状况、贫困等级

// API端点
GET    /api/v1/residents           // 村民列表
POST   /api/v1/residents           // 创建村民
GET    /api/v1/residents/:id       // 获取村民详情
PUT    /api/v1/residents/:id       // 更新村民信息
GET    /api/v1/families            // 家庭列表
POST   /api/v1/families            // 创建家庭
GET    /api/v1/statistics          // 统计数据
POST   /api/v1/statistics/export   // 数据导出
```

## 微服务架构设计

### 1. 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway (端口 3000)                          │
│                     ┌─────────────────────────────┐                       │
│                     │      统一入口、路由、认证      │                       │
│                     │      限流、监控、日志        │                       │
│                     └─────────────────────────────┘                       │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  User Service   │ │Resident Service │ │Governance Service│
│     (3002)      │ │     (3003)      │ │     (3004)      │
│                 │ │                 │ │                 │
│ • 认证授权       │ │ • 村民档案       │ │ • 村务治理       │
│ • 权限管理       │ │ • 家庭管理       │ │ • 公告发布       │
│ • 用户管理       │ │ • 统计分析       │ │ • 会议管理       │
│ • 角色管理       │ │ • 数据导出       │ │ • 任务调度       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   User DB       │ │ Resident DB     │ │ Governance DB   │
│   MongoDB       │ │   MongoDB       │ │   MongoDB       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 2. 服务间通信机制

**同步通信**:
- HTTP/REST API: 服务间直接调用
- 内部API: `/internal/*` 端点用于服务间通信

**异步通信**:
- 消息队列: Redis/RabbitMQ用于事件驱动
- 事件总线: 服务状态变更通知

**服务发现**:
- Consul: 服务注册与发现
- 健康检查: 自动故障检测
- 负载均衡: 多实例部署支持

### 3. 数据库分离策略

```javascript
// 数据库连接配置
const services = {
  userService: {
    database: 'mongodb://localhost:27017/smart_village_users',
    collections: ['users', 'roles']
  },
  residentService: {
    database: 'mongodb://localhost:27017/smart_village_residents',
    collections: ['residents', 'families']
  },
  governanceService: {
    database: 'mongodb://localhost:27017/smart_village_governance',
    collections: ['announcements', 'meetings', 'tasks']
  },
  financeService: {
    database: 'mongodb://localhost:27017/smart_village_finance',
    collections: ['transactions', 'accounts', 'invoices']
  }
};
```

## 技术实现细节

### 1. 服务注册与发现

```javascript
// 服务注册
const serviceRegistry = new ServiceRegistry();
await serviceRegistry.register({
  name: 'user-service',
  port: 3002,
  health: '/health',
  endpoints: {
    auth: '/api/v1/auth',
    users: '/api/v1/users'
  }
});

// 服务发现
const userInstance = await serviceRegistry.getServiceInstance('user-service');
const response = await axios.get(`http://${userInstance.address}/api/v1/users`);
```

### 2. 统一认证中间件

```javascript
// JWT验证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const validation = await authService.validateToken(token);

    if (!validation.valid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = validation.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
```

### 3. 服务间通信示例

```javascript
// 内部API调用
app.post('/internal/get-resident', async (req, res) => {
  const { residentId } = req.body;
  const resident = await residentService.getResidentById(residentId);
  res.json({ success: true, data: resident });
});

// 跨服务调用
const userServiceClient = axios.create({
  baseURL: 'http://user-service:3002'
});

const user = await userServiceClient.post('/internal/get-user', {
  userId: resident.userId
});
```

### 4. 错误处理与监控

```javascript
// 统一错误处理
class ErrorHandler {
  static handle(error, req, res, next) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    Logger.error('API Error', {
      error: message,
      stack: error.stack,
      requestId: req.id
    });

    res.status(statusCode).json({
      success: false,
      error: message,
      requestId: req.id
    });
  }
}
```

## 性能优化策略

### 1. 数据库优化
- **索引策略**: 为查询字段建立复合索引
- **数据分片**: 按村庄ID进行数据分片
- **连接池**: 数据库连接池管理
- **读写分离**: 主从数据库分离

### 2. 缓存策略
- **Redis缓存**: 热点数据缓存
- **应用级缓存**: 内存缓存常用数据
- **CDN**: 静态资源缓存
- **查询优化**: MongoDB聚合管道优化

### 3. 负载均衡
- **水平扩展**: 多实例部署
- **负载均衡器**: Nginx/HAProxy
- **熔断器**: 服务降级保护
- **限流策略**: API调用频率限制

## 安全设计

### 1. 认证与授权
- **JWT Token**: 无状态认证
- **双因子认证**: TOTP/SMS验证
- **权限控制**: RBAC模型
- **API密钥**: 服务间认证

### 2. 数据安全
- **数据加密**: 敏感数据加密存储
- **访问控制**: 细粒度权限控制
- **审计日志**: 操作记录追踪
- **数据脱敏**: 敏感信息脱敏显示

### 3. 网络安全
- **HTTPS**: 强制加密传输
- **CORS**: 跨域请求控制
- **防火墙**: 网络访问控制
- **DDoS防护**: 流量清洗

## 部署方案

### 1. 容器化部署

```dockerfile
# 用户服务Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

### 2. Docker Compose

```yaml
version: '3.8'
services:
  api-gateway:
    image: smart-village/api-gateway
    ports:
      - "3000:3000"
    depends_on:
      - user-service
      - resident-service

  user-service:
    image: smart-village/user-service
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - USER_DB_URI=mongodb://mongo:27017/smart_village_users

  resident-service:
    image: smart-village/resident-service
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - RESIDENT_DB_URI=mongodb://mongo:27017/smart_village_residents

  consul:
    image: consul:latest
    ports:
      - "8500:8500"
    command: agent -server -ui -node=server-1 -bootstrap-expect=1

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
```

### 3. Kubernetes部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: smart-village/user-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: "production"
        - name: USER_DB_URI
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: user-db-uri
```

## 运维监控

### 1. 健康检查
```javascript
// 服务健康检查
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      consul: await checkConsulHealth()
    }
  };

  const isHealthy = Object.values(health.services).every(s => s === 'connected');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 2. 日志管理
```javascript
// 结构化日志
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 3. 指标监控
- **Prometheus**: 指标收集
- **Grafana**: 可视化监控
- **AlertManager**: 告警管理
- **Jaeger**: 链路追踪

## 迁移指南

### 1. 迁移策略
- **渐进式迁移**: 逐步拆分服务
- **蓝绿部署**: 无停机迁移
- **数据同步**: 数据库同步方案
- **回滚计划**: 快速回滚机制

### 2. 迁移步骤
1. **准备阶段**: 环境搭建、工具准备
2. **拆分阶段**: 识别边界、设计接口
3. **开发阶段**: 服务开发、测试验证
4. **部署阶段**: 灰度发布、监控观察
5. **切换阶段**: 流量切换、数据同步
6. **清理阶段**: 旧服务下线、资源回收

## 总结

### 1. 架构优势
- **可扩展性**: 独立扩展各服务
- **可维护性**: 代码职责清晰
- **部署灵活性**: 独立部署更新
- **技术多样性**: 服务可选择不同技术栈
- **容错性**: 服务故障隔离

### 2. 实现成果
- ✅ 完成用户服务实现 (认证授权)
- ✅ 完成村民服务实现 (档案管理)
- 📋 服务发现与注册中心
- 📋 API网关设计与实现
- 📋 监控与日志系统

### 3. 后续规划
- 完成村务服务开发
- 完成财务服务开发
- 实现API网关
- 完善监控体系
- 性能优化
- 安全加固

通过微服务架构改造，智慧乡村平台将具备更好的扩展性、可维护性和可靠性，为后续的功能扩展和性能优化奠定坚实基础。

---

**文档版本**: 1.0
**创建时间**: 2024-12-21
**技术负责人**: Claude Code Team