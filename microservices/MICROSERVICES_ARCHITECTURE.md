# 智慧乡村微服务架构文档

## 架构概述

智慧乡村平台采用微服务架构，将原本的单体应用拆分为多个独立的服务，每个服务负责特定的业务功能。这种架构提供了更好的可扩展性、可维护性和部署灵活性。

## 服务架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              智慧乡村微服务架构                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              API 网关 (Gateway)                                      │    │
│  │  • 统一入口 • 路由转发 • 负载均衡 • 限流熔断 • 安全认证                              │    │
│  │                                 端口: 8080                                            │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                            │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                          服务通信层 (Communication)                                  │    │
│  │  • 消息队列 • 事件驱动 • RPC调用 • 服务发现                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                            │                                               │
│  ┌────────────────────┬────────────────────┬────────────────────┬─────────────────────┐   │
│  │   用户服务          │    村民服务         │    村务服务         │    财务服务          │   │
│  │  User Service      │ Resident Service   │ Affairs Service   │ Finance Service    │   │
│  │  端口: 3001         │  端口: 3002        │  端口: 3003        │  端口: 3004         │   │
│  │  • 认证授权        │ • 村民档案         │ • 村务治理         │ • 财务管理          │   │
│  │  • 权限管理        │ • 家庭管理         │ • 公告会议         │ • 支付处理          │   │
│  │  • 用户管理        │ • 统计分析         │ • 任务调度         │ • 报表生成          │   │
│  └────────────────────┼────────────────────┼────────────────────┼─────────────────────┤   │
│  │   通知服务          │    文件服务         │   监控服务          │   AIOps服务         │   │
│  │ Notification Svc   │  File Service      │ Monitoring Svc     │   AIOps Service     │   │
│  │  端口: 3005         │  端口: 3006        │  端口: 3001        │  端口: 7000         │   │
│  │  • 消息推送        │ • 文件上传         │ • 实时监控         │ • 异常检测          │   │
│  │  • 邮件短信        │ • 文件存储         │ • 性能分析         │ • 预测扩容          │   │
│  │  • 通知管理        │ • 图片处理         │ • 告警通知         │ • 自动恢复          │   │
│  └────────────────────┴────────────────────┴────────────────────┴─────────────────────┘   │
│                                            │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                            基础设施层 (Infrastructure)                               │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │   Redis     │ │  MongoDB    │ │  RabbitMQ   │ │   Redis     │ │   监控存储   │    │    │
│  │  │   缓存      │ │   主数据库  │ │   消息队列  │ │   配置管理  │ │ InfluxDB    │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. API网关 (SmartVillageAPIGateway)

**位置**: `microservices/gateway/SmartVillageAPIGateway.js`

**功能**:
- 统一入口点，处理所有外部请求
- 智能路由转发到对应微服务
- 负载均衡和故障转移
- 限流、熔断器保护
- 安全认证和授权
- 请求日志和监控
- 聚合API减少前端请求次数

**主要特性**:
```javascript
// 路由配置
services: {
  'user-service': { host: 'localhost', port: 3001 },
  'resident-service': { host: 'localhost', port: 3002 },
  'affairs-service': { host: 'localhost', port: 3003 },
  'finance-service': { host: 'localhost', port: 3004 },
  'notification-service': { host: 'localhost', port: 3005 },
  'file-service': { host: 'localhost', port: 3006 }
}

// 聚合API示例
GET /api/v1/dashboard -> 聚合用户信息、通知、村务统计
GET /api/v1/residents/profile/:id -> 聚合村民档案、家庭、健康、财务信息
```

**启动**:
```bash
cd microservices/gateway
npm install
npm start
# 或
npm run dev  # 开发模式
```

### 2. 服务通信 (ServiceCommunication)

**位置**: `microservices/communication/ServiceCommunication.js`

**功能**:
- 服务间异步消息传递
- 事件驱动架构
- RPC调用支持
- 分布式锁机制
- 消息持久化和重试

**通信模式**:
```javascript
// 发布事件
await communication.publishEvent('user.created', userData);

// 发送命令
const response = await communication.sendCommand('user-service', 'createUser', userData);

// 注册事件监听
communication.onEvent('user.created', async (data) => {
  console.log('用户创建事件:', data);
});

// 注册命令处理器
communication.onCommand('createUser', async (data) => {
  // 处理用户创建逻辑
  return { success: true, userId: newUserId };
});
```

**消息队列结构**:
- 交换机: `service.events`, `service.commands`, `service.responses`
- 队列: `{service}.commands`, `{service}.events`
- 路由键: `{service}.{event/command}`

### 3. 服务发现 (ServiceDiscovery)

**位置**: `microservices/discovery/ServiceDiscovery.js`

**功能**:
- 服务注册和注销
- 健康检查
- 负载均衡
- 服务拓扑管理
- 实例状态监控

**负载均衡策略**:
- `round-robin`: 轮询
- `least-connections`: 最少连接
- `random`: 随机
- `weighted`: 加权

**使用示例**:
```javascript
// 注册服务
await discovery.registerService({
  name: 'user-service',
  host: 'localhost',
  port: 3001,
  version: '1.0.0',
  capabilities: ['user-management', 'authentication']
});

// 发现服务
const instances = await discovery.discoverServices('user-service', true);

// 获取实例（负载均衡）
const instance = await discovery.getServiceInstance('user-service');
```

### 4. 分布式配置管理 (DistributedConfigManager)

**位置**: `microservices/config/DistributedConfigManager.js`

**功能**:
- 集中配置管理
- 动态配置更新
- 配置版本控制
- 敏感信息加密
- 配置变更监听
- 配置导入导出

**配置操作**:
```javascript
// 设置配置
await configManager.setConfig('database', 'host', 'localhost', {
  encrypted: false,
  metadata: { description: '数据库主机' }
});

// 获取配置
const config = await configManager.getConfig('database', 'host');

// 监听配置变化
await configManager.watchConfig('database', 'host', (change) => {
  console.log('数据库主机配置变化:', change.value);
});

// 批量导出配置
const exportData = await configManager.exportConfigs('database');
```

## 服务详细说明

### 用户服务 (User Service)
- **端口**: 3001
- **职责**: 用户认证、授权、权限管理
- **数据库**: MongoDB (user数据库)
- **关键功能**:
  - JWT令牌管理
  - 角色权限控制
  - 用户注册登录
  - 密码安全策略

### 村民服务 (Resident Service)
- **端口**: 3002
- **职责**: 村民档案、家庭管理、统计分析
- **数据库**: MongoDB (resident数据库)
- **关键功能**:
  - 村民信息管理
  - 家庭关系维护
  - 人口统计分析
  - 健康档案管理

### 村务服务 (Affairs Service)
- **端口**: 3003
- **职责**: 村务治理、公告会议、任务调度
- **数据库**: MongoDB (affairs数据库)
- **关键功能**:
  - 村务公告发布
  - 会议管理
  - 任务分配调度
  - 投票决策系统

### 财务服务 (Finance Service)
- **端口**: 3004
- **职责**: 财务管理、支付处理、报表生成
- **数据库**: MongoDB (finance数据库)
- **关键功能**:
  - 财务收支管理
  - 支付处理接口
  - 财务报表生成
  - 预算管理控制

### 通知服务 (Notification Service)
- **端口**: 3005
- **职责**: 消息推送、邮件短信、通知管理
- **数据库**: MongoDB (notification数据库)
- **关键功能**:
  - 多渠道消息推送
  - 模板管理
  - 发送记录追踪
  - 消息统计分析

### 文件服务 (File Service)
- **端口**: 3006
- **职责**: 文件上传、文件存储、图片处理
- **存储**: 本地文件系统/云存储
- **关键功能**:
  - 文件上传下载
  - 图片压缩处理
  - 文件安全检查
  - 存储空间管理

### 监控服务 (Monitoring Service)
- **端口**: 3001
- **职责**: 实时监控、性能分析、告警通知
- **数据库**: InfluxDB + Redis
- **关键功能**:
  - 系统性能监控
  - 业务指标收集
  - 实时告警
  - 监控大屏

### AIOps服务
- **端口**: 7000
- **职责**: 异常检测、预测扩容、自动恢复
- **数据库**: MongoDB + Redis
- **关键功能**:
  - 异常检测算法
  - 预测性扩容
  - 自动故障恢复
  - 容量规划建议

## 数据库策略

### 数据分离策略
```
用户服务     -> user_db     (用户、角色、权限)
村民服务     -> resident_db (村民、家庭、健康)
村务服务     -> affairs_db  (公告、会议、任务)
财务服务     -> finance_db  (收支、支付、报表)
通知服务     -> notification_db (消息、模板、记录)
```

### 共享组件
- **Redis**: 缓存、会话、分布式锁
- **RabbitMQ**: 消息队列、事件总线
- **InfluxDB**: 时序数据存储（监控）
- **Elasticsearch**: 日志聚合和搜索

## 部署架构

### 开发环境
```
┌─────────────────────────────────────────┐
│              Docker Compose             │
│  ┌─────────────┐ ┌─────────────────────┐│
│  │   Services  │ │    Infrastructure   ││
│  │  (Node.js)  │ │ (Redis, MongoDB,   ││
│  │             │ │ RabbitMQ, InfluxDB) ││
│  └─────────────┘ └─────────────────────┘│
└─────────────────────────────────────────┘
```

### 生产环境
```
┌─────────────────────────────────────────────────────────────────┐
│                         Kubernetes Cluster                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Ingress Controller                       ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐ ││
│  │   Service   │   Service   │   Service   │  Service Pods   │ ││
│  │  Namespace  │  Namespace  │  Namespace  │   (Auto-scaling)│ ││
│  └─────────────┴─────────────┴─────────────┴─────────────────┘ ││
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Persistent Volumes                        ││
│  │           (MongoDB, Redis, File Storage)                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 配置管理

### 环境配置
```bash
# .env
NODE_ENV=production

# API Gateway
GATEWAY_PORT=8080
SERVICE_AUTH_TOKEN=your-secret-token

# Database
MONGO_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379

# Message Queue
RABBITMQ_URL=amqp://localhost:5672

# Monitoring
INFLUXDB_URL=http://localhost:8086
```

### 服务发现配置
```javascript
const discovery = new ServiceDiscovery({
  serviceName: 'user-service',
  redisHost: 'localhost',
  redisPort: 6379,
  healthCheckInterval: 30000,
  loadBalancingStrategy: 'round-robin'
});
```

## 监控和运维

### 监控指标
- **系统指标**: CPU、内存、磁盘、网络
- **应用指标**: 响应时间、吞吐量、错误率
- **业务指标**: 活跃用户、交易量、功能使用率

### 日志管理
- **结构化日志**: JSON格式
- **日志聚合**: ELK Stack
- **日志级别**: ERROR, WARN, INFO, DEBUG
- **追踪**: 分布式链路追踪

### 告警规则
```javascript
// 响应时间告警
if (avgResponseTime > 2000) {
  triggerAlert('HIGH_RESPONSE_TIME');
}

// 错误率告警
if (errorRate > 5) {
  triggerAlert('HIGH_ERROR_RATE');
}

// 服务可用性告警
if (serviceAvailability < 99.9) {
  triggerAlert('SERVICE_DOWN');
}
```

## 安全策略

### 网络安全
- API网关统一入口
- HTTPS/TLS加密传输
- 防火墙规则配置
- DDoS防护

### 认证授权
- JWT令牌认证
- OAuth2.0授权
- RBAC权限控制
- API密钥管理

### 数据安全
- 敏感数据加密
- 数据脱敏处理
- 访问日志审计
- 备份加密

## 性能优化

### 缓存策略
```javascript
// Redis缓存
const cacheKey = `user:${userId}`;
const cachedUser = await redis.get(cacheKey);

if (!cachedUser) {
  const user = await db.getUser(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(user));
}
```

### 数据库优化
- 索引优化
- 查询优化
- 连接池管理
- 读写分离

### 负载均衡
- 多实例部署
- 负载均衡器
- 健康检查
- 故障转移

## 故障处理

### 熔断器模式
```javascript
const circuitBreaker = new CircuitBreaker(callService, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000
});

circuitBreaker.fallback(() => {
  return { error: 'Service unavailable' };
});
```

### 重试机制
```javascript
async function retryRequest(service, data, maxRetries = 3) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await callService(service, data);
    } catch (error) {
      if (i === maxRetries) throw error;
      await delay(Math.pow(2, i) * 1000);
    }
  }
}
```

## 扩展指南

### 添加新服务
1. 创建服务目录结构
2. 实现核心业务逻辑
3. 配置服务注册发现
4. 添加API网关路由
5. 配置数据库连接
6. 实现健康检查
7. 添加监控和日志
8. 编写测试用例

### 服务间通信
1. 选择通信模式（事件/RPC）
2. 定义消息格式
3. 实现消息处理
4. 添加错误处理
5. 配置重试机制
6. 监控消息流

## 最佳实践

### 代码组织
```
service-name/
├── src/
│   ├── controllers/     # 控制器
│   ├── services/        # 业务逻辑
│   ├── models/          # 数据模型
│   ├── middleware/      # 中间件
│   ├── utils/           # 工具函数
│   └── config/          # 配置文件
├── tests/               # 测试文件
├── docs/                # 文档
├── package.json
└── README.md
```

### 错误处理
```javascript
try {
  const result = await businessOperation();
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Operation failed', error);
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId
  });
}
```

### 测试策略
- 单元测试: Jest
- 集成测试: Supertest
- E2E测试: Cypress
- 性能测试: Artillery

## 迁移指南

### 从单体到微服务
1. **识别服务边界**: 基于业务功能
2. **数据库拆分**: 按服务分离
3. **API设计**: RESTful规范
4. **渐进迁移**: Strangler模式
5. **数据一致性**: 事件驱动
6. **监控部署**: 分阶段上线

### 迁移步骤
1. 搭建基础设施（网关、注册中心等）
2. 提取第一个微服务
3. 实现双写模式
4. 逐步切换流量
5. 验证功能完整性
6. 重复以上步骤

## 总结

智慧乡村微服务架构提供了：

1. **高可用性**: 服务冗余、故障隔离
2. **可扩展性**: 独立扩展、弹性伸缩
3. **可维护性**: 模块化、职责清晰
4. **部署灵活性**: 独立部署、持续交付
5. **技术异构性**: 多技术栈支持

这种架构能够很好地支持智慧乡村平台的长期发展需求，为未来的功能扩展和性能优化提供了坚实的基础。