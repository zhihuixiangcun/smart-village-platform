# 智慧乡村跨区域部署技术架构设计文档

## 文档信息
- **版本**: 1.0
- **作者**: 智慧乡村技术团队
- **最后更新**: 2025年12月

---

## 1. 架构概述

### 1.1 设计目标

本架构旨在实现智慧乡村平台跨区域部署，支持：
- **多租户隔离**: 省、市、区县、村四级数据隔离
- **高可用性**: 区域级容灾，RTO < 15分钟
- **数据主权**: 支持数据本地化要求
- **生态开放**: 标准化接口支持第三方集成
- **成本可控**: 弹性伸缩，按需付费

### 1.2 架构原则

1. **分层解耦**: 业务逻辑与数据存储分离
2. **异步优先**: 跨区域调用采用异步模式
3. **本地优先**: 数据访问优先就近
4. **最终一致**: 跨区域数据保证最终一致性
5. **故障隔离**: 区域故障不影响其他区域

---

## 2. 分层架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户接入层                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  移动端APP   │  │   Web端     │  │  智能大屏    │  │  第三方系统  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            全局负载均衡层                                     │
│                    ┌─────────────────────────────┐                          │
│                    │  CDN + GSLB (全球负载均衡)   │                          │
│                    └─────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
        │    华东区域        │ │    华北区域        │ │    华南区域        │
        │   (主数据中心)     │ │   (灾备中心)       │ │   (扩展中心)       │
        └───────────────────┘ └───────────────────┘ └───────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              区域服务层                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  API网关    │ │  服务网格   │ │  消息队列   │ │  缓存集群   │           │
│  │  (Kong)     │ │ (Istio)     │ │ (RabbitMQ)  │ │ (Redis)     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              微服务层                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │认证服务  │ │村民服务  │ │村务服务  │ │数据服务  │ │消息服务  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │支付服务  │ │文件服务  │ │搜索服务  │ │报表服务  │ │AI服务    │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据层                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ MongoDB     │ │ MySQL       │ │ Redis       │ │ S3/MinIO    │           │
│  │ (文档数据)  │ │ (关系数据)  │ │ (缓存)      │ │ (文件存储)  │           │
│  │ 分片集群    │ │ 主从集群    │ │ 哨兵模式    │ │ 分布式      │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              基础设施层                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Kubernetes  │ │ 监控告警    │ │ 日志聚合    │ │ 配置中心    │           │
│  │ 集群        │ │ (Prometheus)│ │ (ELK)       │ │ (Consul)    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 API网关配置

```yaml
# Kong API网关配置示例
api_version: "v1"

services:
  - name: villager-service
    url: http://villager-service.internal:8080
    routes:
      - name: villager-api
        paths:
          - /api/v1/villagers
        methods: [GET, POST, PUT, DELETE]
    plugins:
      - name: jwt
        config:
          key_claim_name: kid
      - name: rate-limiting
        config:
          minute: 100
          policy: local
      - name: acl
        config:
          allow:
            - village-admin
            - village-user

  - name: governance-service
    url: http://governance-service.internal:8080
    routes:
      - name: governance-api
        paths:
          - /api/v1/governance
    plugins:
      - name: request-transformer
        config:
          add:
            headers:
              - X-Tenant-ID:$(headers.X-Tenant-ID)
```

---

## 3. 多租户数据隔离方案

### 3.1 租户模型设计

```javascript
// 租户层级模型
const TenantSchema = new mongoose.Schema({
  // 租户ID: {ProvinceCode}{CityCode}{DistrictCode}{VillageCode}
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 租户类型: PROVINCE | CITY | DISTRICT | TOWN | VILLAGE | HOUSEHOLD
  tenantType: {
    type: String,
    enum: ['PROVINCE', 'CITY', 'DISTRICT', 'TOWN', 'VILLAGE', 'HOUSEHOLD'],
    required: true
  },

  // 层级路径 (便于查询上下级)
  path: {
    type: [String],
    required: true
    // 示例: ["33", "3301", "330110", "330110001", "330110001001"]
  },

  // 父租户ID
  parentId: {
    type: String,
    index: true
  },

  // 租户配置
  config: {
    // 数据存储区域
    dataRegion: String,

    // 是否独立部署
    standalone: {
      type: Boolean,
      default: false
    },

    // 功能开关
    features: {
      finance: { type: Boolean, default: true },
      voting: { type: Boolean, default: true },
      ecommerce: { type: Boolean, default: false },
      ai: { type: Boolean, default: false }
    },

    // 配额限制
    quotas: {
      maxUsers: { type: Number, default: 10000 },
      maxStorage: { type: Number, default: 1000 }, // GB
      maxApiCalls: { type: Number, default: 1000000 } // per day
    }
  },

  // 状态
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
    default: 'ACTIVE'
  },

  // 时间戳
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 复合索引优化查询
TenantSchema.index({ tenantId: 1, status: 1 });
TenantSchema.index({ path: 1, tenantType: 1 });
```

### 3.2 数据分片策略

```javascript
// MongoDB分片配置
const shardingConfig = {
  // 分片1: 按租户ID分片 (用户数据)
  users: {
    shardKey: { tenantId: 1 },
    strategy: 'hashed',
    collections: ['users', 'userprofiles', 'permissions']
  },

  // 分片2: 按区域+时间分片 (审计日志)
  auditLogs: {
    shardKey: { tenantId: 1, createdAt: 1 },
    strategy: 'ranged',
    collections: ['auditlogs', 'operationlogs']
  },

  // 分片3: 按村ID分片 (村务数据)
  villageData: {
    shardKey: { villageId: 1 },
    strategy: 'hashed',
    collections: ['announcements', 'meetings', 'expenses']
  },

  // 分片4: 按时间分片 (时序数据)
  timeseries: {
    shardKey: { timestamp: 1 },
    strategy: 'ranged',
    collections: ['metrics', 'monitoring']
  }
};

// 数据库路由中间件
async function tenantRoutingMiddleware(req, res, next) {
  // 从请求头/JWT中提取租户信息
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenant identifier' });
  }

  // 获取租户配置
  const tenant = await Tenant.findOne({ tenantId, status: 'ACTIVE' });
  if (!tenant) {
    return res.status(403).json({ error: 'Invalid or inactive tenant' });
  }

  // 附加到请求上下文
  req.tenant = tenant;

  // 设置数据库连接 (多租户数据库)
  const dbConnection = getTenantDbConnection(tenantId);
  req.db = dbConnection;

  next();
}
```

### 3.3 跨租户数据访问控制

```javascript
// 基于角色的访问控制 (RBAC) + 数据层级
class DataAccessControl {
  // 检查数据访问权限
  static async checkAccess(user, resource, action, resourceId) {
    const tenant = await Tenant.findById(user.tenantId);

    // 获取用户在当前租户的角色
    const userRole = await UserRole.findOne({
      userId: user.id,
      tenantId: tenant.tenantId
    });

    // 基础权限检查
    const hasPermission = await this.checkPermission(userRole.role, resource, action);
    if (!hasPermission) {
      return false;
    }

    // 数据层级检查
    return this.checkDataScope(user, tenant, resourceId);
  }

  // 数据范围检查
  static async checkDataScope(user, tenant, resourceId) {
    const userTenantPath = tenant.path;
    const resourceTenant = await this.getResourceTenant(resourceId);
    const resourceTenantPath = resourceTenant.path;

    // 自己的数据
    if (resourceId === user.id) {
      return true;
    }

    // 家庭成员数据
    if (await this.isFamilyMember(user.id, resourceId)) {
      return true;
    }

    // 管理员可以查看下级数据
    if (user.role === 'ADMIN') {
      return this.isDescendant(userTenantPath, resourceTenantPath);
    }

    // 普通用户只能看本村脱敏数据
    return this.isSameVillage(userTenantPath, resourceTenantPath);
  }

  // 判断是否为下级租户
  static isDescendant(ancestorPath, descendantPath) {
    return descendantPath.startsWith(ancestorPath.join('/'));
  }

  // 判断是否同村
  static isSameVillage(path1, path2) {
    return path1.slice(0, 4).join('/') === path2.slice(0, 4).join('/');
  }
}
```

---

## 4. 微服务拆分与通信

### 4.1 服务边界定义

```yaml
# 微服务拆分定义
services:
  # 认证与授权服务
  auth-service:
    responsibilities:
      - 用户认证 (JWT/OAuth2)
      - 权限管理 (RBAC)
      - 人脸识别
      - SSO单点登录
    apis:
      - POST /auth/login
      - POST /auth/refresh
      - POST /auth/logout
      - GET /auth/permissions
    database: auth_db
    ports: [3001]

  # 村民管理服务
  villager-service:
    responsibilities:
      - 村民档案管理
      - 一户一码
      - 亲属关系管理
      - 数据脱敏
    apis:
      - GET /villagers
      - POST /villagers
      - GET /villagers/:id
      - PUT /villagers/:id
      - GET /villagers/:id/family
    database: villager_db
    ports: [3002]

  # 村务治理服务
  governance-service:
    responsibilities:
      - 公告发布
      - 会议管理
      - 投票表决
      - 财务管理
      - 项目管理
    apis:
      - GET /announcements
      - POST /announcements
      - GET /meetings
      - POST /votings
    database: governance_db
    ports: [3003]

  # 数据同步服务
  sync-service:
    responsibilities:
      - 跨区域数据同步
      - 事件分发
      - 数据一致性保证
      - 冲突解决
    apis:
      - POST /sync/push
      - GET /sync/pull
      - GET /sync/status
    database: sync_db
    ports: [3004]

  # 政务对接服务
  gov-integration-service:
    responsibilities:
      - 政务系统对接
      - 数据格式转换
      - 接口适配
      - 签名验证
    apis:
      - POST /gov/population/sync
      - GET /gov/certificate/verify
    database: gov_db
    ports: [3005]

  # AI智能服务
  ai-service:
    responsibilities:
      - 语音识别 (方言)
      - 文字转语音
      - OCR识别
      - 智能问答
      - 数据分析
    apis:
      - POST /ai/speech-to-text
      - POST /ai/text-to-speech
      - POST /ai/ocr
      - POST /ai/chat
    database: ai_db
    ports: [3006]
```

### 4.2 服务间通信

```javascript
// 同步通信示例: gRPC定义 (用于服务间高频调用)
syntax = "proto3";

package villager;

service VillagerService {
  rpc GetVillager(GetVillagerRequest) returns (VillagerResponse);
  rpc SearchVillagers(SearchRequest) returns (SearchResponse);
  rpc GetFamilyTree(FamilyRequest) returns (FamilyResponse);
}

message GetVillagerRequest {
  string villager_id = 1;
  string tenant_id = 2;
  repeated string fields = 3; // 需要返回的字段
}

message VillagerResponse {
  string id = 1;
  string name = 2;
  string phone = 3; // 脱敏
  string address = 4;
  string household_id = 5;
}

// 异步通信示例: 事件驱动
const eventBus = require('./eventBus');

// 发布事件
async function publishAnnouncement(tenantId, announcement) {
  await eventBus.publish('announcement.published', {
    eventId: uuidv4(),
    timestamp: Date.now(),
    tenantId,
    data: {
      announcementId: announcement.id,
      title: announcement.title,
      target: announcement.target // ALL | VILLAGE | GROUP
    }
  });
}

// 订阅事件
eventBus.subscribe('announcement.published', async (event) => {
  // 发送推送通知
  await notificationService.sendPush(event);

  // 记录审计日志
  await auditService.log('ANNOUNCEMENT_PUBLISHED', event);

  // 更新缓存
  await cacheService.invalidate(`announcements:${event.tenantId}`);
});

// 事件总线配置 (RabbitMQ)
const eventBusConfig = {
  connection: {
    url: process.env.RABBITMQ_URL
  },
  exchanges: {
    events: { type: 'topic', durable: true }
  },
  queues: {
    notifications: { durable: true },
    audit: { durable: true },
    sync: { durable: true }
  },
  routingKeys: {
    announcement: 'announcement.*',
    villager: 'villager.*',
    governance: 'governance.*'
  }
};
```

### 4.3 服务网格配置 (Istio)

```yaml
# Istio VirtualService 配置示例
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: villager-service
spec:
  hosts:
  - villager-service
  http:
  - match:
    - uri:
        prefix: "/api/v1/villagers"
    route:
    - destination:
        host: villager-service
        subset: v1
      weight: 90
    - destination:
        host: villager-service
        subset: v2
      weight: 10
    retries:
      attempts: 3
      perTryTimeout: 2s
    timeout: 5s
---
# DestinationRule for subset
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: villager-service
spec:
  host: villager-service
  subsets:
  - name: v1
    labels:
      version: "1.0"
  - name: v2
    labels:
      version: "2.0"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    loadBalancer:
      simple: ROUND_ROBIN
    circuitBreaker:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

---

## 5. 跨区域数据同步

### 5.1 同步策略

```javascript
// 数据同步策略配置
const syncStrategies = {
  // 实时同步: 关键业务数据
  realtime: {
    trigger: 'immediate',
    consistency: 'strong',
    retries: 3,
    timeout: 5000,
    applyTo: ['users', 'permissions', 'emergency-alerts']
  },

  // 定时同步: 一般业务数据
  scheduled: {
    trigger: 'cron',
    cron: '0 */15 * * * *', // 每15分钟
    consistency: 'eventual',
    retries: 5,
    timeout: 30000,
    applyTo: ['announcements', 'meetings', 'expenses']
  },

  // 批量同步: 历史数据、统计报表
  batch: {
    trigger: 'manual',
    schedule: 'daily 02:00',
    consistency: 'eventual',
    retries: 10,
    timeout: 300000, // 5分钟
    applyTo: ['audit-logs', 'statistics', 'reports']
  },

  // 双向同步: 需要中央汇聚的数据
  bidirectional: {
    trigger: 'event',
    direction: 'both',
    conflictResolution: 'last-write-wins',
    applyTo: ['population-data', 'social-security']
  }
};

// 数据同步服务
class DataSyncService {
  // 推送数据到上级区域
  async pushToParentRegion(tenantId, data, syncType = 'realtime') {
    const tenant = await Tenant.findOne({ tenantId });
    const parentTenantId = tenant.parentId;

    if (!parentTenantId) {
      console.log('No parent tenant, skipping sync');
      return;
    }

    const strategy = syncStrategies[syncType];
    const syncEvent = {
      id: uuidv4(),
      sourceTenantId: tenantId,
      targetTenantId: parentTenantId,
      syncType,
      timestamp: Date.now(),
      status: 'pending',
      data
    };

    // 保存同步记录
    await SyncQueue.create(syncEvent);

    // 根据策略执行同步
    if (strategy.trigger === 'immediate') {
      await this.executeSync(syncEvent);
    }
  }

  // 执行同步
  async executeSync(syncEvent) {
    try {
      const targetRegion = await this.getRegionEndpoint(syncEvent.targetTenantId);

      const response = await axios.post(
        `${targetRegion}/api/v1/sync/receive`,
        {
          eventId: syncEvent.id,
          sourceTenantId: syncEvent.sourceTenantId,
          data: syncEvent.data
        },
        {
          timeout: syncStrategies[syncEvent.syncType].timeout,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getSyncToken()}`
          }
        }
      );

      // 更新同步状态
      await SyncQueue.updateOne(
        { id: syncEvent.id },
        { status: 'completed', response: response.data }
      );

    } catch (error) {
      // 重试逻辑
      await this.handleSyncError(syncEvent, error);
    }
  }

  // 处理同步错误
  async handleSyncError(syncEvent, error) {
    const retryCount = syncEvent.retryCount || 0;
    const strategy = syncStrategies[syncEvent.syncType];

    if (retryCount < strategy.retries) {
      // 指数退避重试
      const backoffTime = Math.pow(2, retryCount) * 1000;
      setTimeout(async () => {
        await this.executeSync({
          ...syncEvent,
          retryCount: retryCount + 1
        });
      }, backoffTime);
    } else {
      // 标记失败，记录日志
      await SyncQueue.updateOne(
        { id: syncEvent.id },
        {
          status: 'failed',
          error: error.message,
          failedAt: new Date()
        }
      );

      // 告警
      await alertService.sendAlert('SYNC_FAILED', syncEvent);
    }
  }
}
```

### 5.2 数据冲突解决

```javascript
// 冲突解决策略
const conflictResolution = {
  // 最后写入获胜 (最简单)
  lastWriteWins: (local, remote) => {
    return local.updatedAt > remote.updatedAt ? local : remote;
  },

  // 源优先 (主从模式)
  sourceWins: (local, remote) => {
    return remote; // 远程(源)数据优先
  },

  // 目标优先 (从主模式)
  destinationWins: (local, remote) => {
    return local; // 本地(目标)数据优先
  },

  // 版本向量 (高级)
  versionVector: (local, remote) => {
    // 比较版本向量，自动合并或标记冲突
    const localVV = parseVersionVector(local.versionVector);
    const remoteVV = parseVersionVector(remote.versionVector);

    if (isConcurrent(localVV, remoteVV)) {
      // 并发修改，需要手动解决
      return {
        conflict: true,
        local,
        remote,
        suggestions: generateMergeSuggestions(local, remote)
      };
    }

    return isDescendant(localVV, remoteVV) ? remote : local;
  }
};
```

---

## 6. 高可用与容灾

### 6.1 多区域部署配置

```yaml
# Kubernetes多集群部署
apiVersion: v1
kind: ConfigMap
metadata:
  name: region-config
data:
  PRIMARY_REGION: "east-china"
  DR_REGION: "north-china"
  REPLICATION_ENABLED: "true"
---
# StatefulSet for MongoDB (主节点)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb-primary
spec:
  serviceName: mongodb-primary
  replicas: 3
  selector:
    matchLabels:
      app: mongodb-primary
  template:
    metadata:
      labels:
        app: mongodb-primary
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - mongodb-primary
            topologyKey: "kubernetes.io/hostname"
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_REPLICA_SET_NAME
          value: "rs0"
        volumeMounts:
        - name: data
          mountPath: /data/db
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 500Gi
---
# StatefulSet for MongoDB (灾备节点 - 只读副本)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb-dr
spec:
  serviceName: mongodb-dr
  replicas: 2
  selector:
    matchLabels:
      app: mongodb-dr
  template:
    metadata:
      labels:
        app: mongodb-dr
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        command:
        - mongod
        - --replSet
        - rs0
        - --secondaryDelaySecs
        - "3600" # 1小时延迟(防止错误传播)
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_REPLICA_SET_NAME
          value: "rs0"
```

### 6.2 故障转移流程

```javascript
// 故障检测与自动转移
class FailoverService {
  constructor() {
    this.healthCheckInterval = 10000; // 10秒
    this.failureThreshold = 3; // 连续失败3次触发转移
  }

  // 健康检查
  async healthCheck() {
    const services = await Service.find({ status: 'ACTIVE' });

    for (const service of services) {
      try {
        const response = await axios.get(
          `${service.endpoint}/health`,
          { timeout: 5000 }
        );

        await this.updateServiceHealth(service.id, 'healthy');

      } catch (error) {
        await this.handleUnhealthyService(service, error);
      }
    }
  }

  // 处理不健康的服务
  async handleUnhealthyService(service, error) {
    const failureCount = await this.incrementFailureCount(service.id);

    // 达到失败阈值
    if (failureCount >= this.failureThreshold) {
      console.error(`Service ${service.name} is down, initiating failover`);

      // 1. 标记服务为down
      await Service.updateOne(
        { id: service.id },
        { status: 'DOWN', downAt: new Date() }
      );

      // 2. 激活备用服务
      const standbyService = await Service.findOne({
        name: service.name,
        region: service.drRegion,
        status: 'STANDBY'
      });

      if (standbyService) {
        await this.activateStandby(standbyService);
      }

      // 3. 更新DNS/负载均衡
      await this.updateLoadBalancer(service, standbyService);

      // 4. 发送告警
      await this.sendFailoverAlert(service, standbyService);
    }
  }

  // 激活备用服务
  async activateStandby(standbyService) {
    // 1. 启动服务
    await axios.post(`${standbyService.endpoint}/admin/activate`, {
      activationToken: process.env.ACTIVATION_TOKEN
    });

    // 2. 等待就绪
    await this.waitForReady(standbyService);

    // 3. 更新状态
    await Service.updateOne(
      { id: standbyService.id },
      { status: 'ACTIVE', activatedAt: new Date() }
    );
  }

  // 等待服务就绪
  async waitForReady(service, maxWait = 60000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const response = await axios.get(`${service.endpoint}/health`);
        if (response.data.status === 'ready') {
          return true;
        }
      } catch (error) {
        // 继续等待
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Service ${service.name} failed to become ready`);
  }
}
```

---

## 7. 监控与运维

### 7.1 监控指标

```yaml
# Prometheus监控配置
monitoring:
  # 业务指标
  business:
    - name: api_requests_total
      type: counter
      help: Total API requests
      labels: [method, endpoint, status, tenant]

    - name: api_response_time_seconds
      type: histogram
      help: API response time
      buckets: [0.1, 0.5, 1, 2, 5, 10]

    - name: active_users_total
      type: gauge
      help: Active users by tenant
      labels: [tenant]

    - name: sync_events_total
      type: counter
      help: Data sync events
      labels: [source, target, status]

  # 系统指标
  system:
    - name: cpu_usage_percent
      type: gauge
      help: CPU usage percentage

    - name: memory_usage_bytes
      type: gauge
      help: Memory usage

    - name: disk_usage_percent
      type: gauge
      help: Disk usage percentage

    - name: db_connections_active
      type: gauge
      help: Active database connections

  # 自定义指标
  custom:
    - name: tenant_quota_usage
      type: gauge
      help: Tenant quota usage
      labels: [tenant, resource]

    - name: data_sync_lag_seconds
      type: gauge
      help: Data sync lag time
      labels: [source, target]

    - name: failed_login_attempts
      type: counter
      help: Failed login attempts
      labels: [tenant, user]
```

### 7.2 告警规则

```yaml
# AlertManager告警规则
groups:
  - name: api_alerts
    interval: 30s
    rules:
      # API错误率过高
      - alert: HighErrorRate
        expr: rate(api_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High API error rate"
          description: "Error rate is {{ $value }} errors/sec"

      # API响应慢
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, api_response_time_seconds) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response time"
          description: "P95 response time is {{ $value }}s"

  - name: database_alerts
    interval: 30s
    rules:
      # 数据库连接数过高
      - alert: HighDBConnections
        expr: db_connections_active > db_connections_max * 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"

      # 数据库复制延迟
      - alert: HighReplicationLag
        expr: db_replication_lag_seconds > 60
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High replication lag"

  - name: sync_alerts
    interval: 1m
    rules:
      # 数据同步延迟
      - alert: SyncLag
        expr: data_sync_lag_seconds > 300
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Data sync lag detected"

      # 同步失败率过高
      - alert: HighSyncFailureRate
        expr: rate(sync_events_total{status="failed"}[5m]) / rate(sync_events_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High sync failure rate"
```

---

## 8. 安全与合规

### 8.1 数据加密

```javascript
// 数据加密服务
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // 主密钥 (从KMS获取)
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY;
  }

  // 字段级加密 (敏感数据)
  encryptField(plaintext, tenantId) {
    // 生成租户特定密钥
    const tenantKey = this.deriveTenantKey(this.masterKey, tenantId);

    // AES-256-GCM加密
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', tenantKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: 'aes-256-gcm'
    };
  }

  // 字段解密
  decryptField(encryptedData, tenantId) {
    const tenantKey = this.deriveTenantKey(this.masterKey, tenantId);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      tenantKey,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // 派生租户密钥
  deriveTenantKey(masterKey, tenantId) {
    return crypto.pbkdf2Sync(
      masterKey,
      tenantId,
      100000,
      32,
      'sha256'
    );
  }
}

// 使用示例: 在模型中自动加密敏感字段
const VillagerSchema = new mongoose.Schema({
  name: String,
  idCard: {
    type: String,
    encrypt: true, // 标记需要加密
    searchable: false // 加密后不可搜索
  },
  phone: {
    type: String,
    encrypt: true,
    searchable: true // 支持脱敏搜索
  }
});

// 保存前加密
VillagerSchema.pre('save', async function(next) {
  const encryption = new EncryptionService();

  for (const field in this.schema.paths) {
    if (this.schema.paths[field].options.encrypt) {
      const encrypted = encryption.encryptField(this[field], this.tenantId);
      this[field] = JSON.stringify(encrypted);
    }
  }
  next();
});

// 查询后解密
VillagerSchema.post('find', async function(docs) {
  const encryption = new EncryptionService();

  docs.forEach(doc => {
    for (const field in doc.schema.paths) {
      if (doc.schema.paths[field].options.encrypt) {
        const encrypted = JSON.parse(doc[field]);
        doc[field] = encryption.decryptField(encrypted, doc.tenantId);
      }
    }
  });
});
```

### 8.2 审计日志

```javascript
// 审计日志模型
const AuditLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    unique: true,
    required: true
  },

  // 操作者信息
  actor: {
    userId: String,
    userName: String,
    tenantId: String,
    role: String,
    ip: String,
    userAgent: String
  },

  // 操作信息
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT',
      'APPROVE', 'REJECT', 'PUBLISH', 'ARCHIVE'
    ]
  },

  // 操作对象
  resource: {
    type: String,
    required: true
  },
  resourceId: String,

  // 变更详情
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },

  // 结果
  result: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'PARTIAL']
  },
  errorMessage: String,

  // 时间戳
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 保留10年 (合规要求)
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    }
  }
});

// 索引优化查询
AuditLogSchema.index({ tenantId: 1, timestamp: -1 });
AuditLogSchema.index({ actor: { userId: 1, timestamp: -1 } });
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });

// 审计中间件
function auditLog(action) {
  return async (req, res, next) => {
    // 记录原始响应方法
    const originalJson = res.json.bind(res);

    // 拦截响应
    res.json = function(data) {
      // 异步记录审计日志 (不阻塞响应)
      setImmediate(async () => {
        try {
          await AuditLog.create({
            eventId: uuidv4(),
            actor: {
              userId: req.user?.id,
              userName: req.user?.name,
              tenantId: req.tenant?.tenantId,
              role: req.user?.role,
              ip: req.ip,
              userAgent: req.headers['user-agent']
            },
            action,
            resource: req.path,
            resourceId: req.params.id,
            changes: req.changes,
            result: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE'
          });
        } catch (error) {
          console.error('Audit log error:', error);
        }
      });

      // 调用原始方法
      return originalJson(data);
    };

    next();
  };
}

// 使用审计中间件
router.post('/api/v1/villagers',
  authenticate,
  authorize('villager:create'),
  auditLog('CREATE'),
  villagerController.create
);
```

---

## 9. 部署清单

### 9.1 生产环境部署检查清单

```markdown
## 部署前检查

### 基础设施
- [ ] Kubernetes集群配置完成
- [ ] 数据库集群部署完成
- [ ] Redis集群部署完成
- [ ] 消息队列部署完成
- [ ] 对象存储配置完成
- [ ] CDN配置完成

### 安全配置
- [ ] SSL证书安装
- [ ] 密钥轮换机制
- [ ] 防火墙规则配置
- [ ] WAF规则配置
- [ ] DDoS防护启用

### 监控告警
- [ ] Prometheus配置
- [ ] Grafana仪表板
- [ ] 告警规则配置
- [ ] 告警通道配置 (邮件/短信/钉钉)
- [ ] 日志聚合配置

### 数据备份
- [ ] 数据库备份计划
- [ ] 备份测试验证
- [ ] 灾难恢复演练
- [ ] 备份监控告警

### 性能优化
- [ ] 数据库索引优化
- [ ] 缓存策略配置
- [ ] CDN预热
- [ ] 连接池配置
- [ ] 限流规则配置

## 部署步骤

1. 创建命名空间和配置
2. 部署数据库集群
3. 部署中间件 (Redis/RabbitMQ)
4. 部署微服务
5. 配置API网关
6. 配置负载均衡
7. DNS切换
8. 健康检查验证
9. 监控确认
10. 备份验证

## 回滚计划

1. 数据库回滚
2. 代码回滚
3. 配置回滚
4. DNS回滚
5. 流量切换
```

---

**文档结束**

*最后更新: 2025年12月*
*维护团队: 智慧乡村架构组*
