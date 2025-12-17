# ⚡ 实时计算引擎文档

## 🎯 概述

智慧村庄平台的实时计算引擎是一个高性能、可扩展的流数据处理系统，能够处理海量实时数据流，提供实时指标计算、动态阈值调整和智能预警功能。系统采用事件驱动架构，支持微秒级延迟处理，为村庄治理提供实时决策支持。

## 🏗️ 系统架构

### 核心组件架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    实时计算引擎系统架构                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   数据采集层     │    │   流处理层      │    │   分析计算层     │ │
│  │                │    │                │    │                │ │
│  │ • API请求跟踪   │───▶│ • 流式数据处理   │───▶│ • 实时指标计算   │ │
│  │ • 行为数据采集   │    │ • 数据过滤转换   │    │ • 聚合统计分析   │ │
│  │ • 系统事件监控   │    │ • 批量数据处理   │    │ • 趋势预测分析   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   存储缓存层     │    │   预警决策层     │    │   可视化展示层   │ │
│  │                │    │                │    │                │ │
│  │ • Redis缓存     │    │ • 动态阈值监测   │    │ • 实时仪表板     │ │
│  │ • 内存存储      │    │ • 智能预警规则   │    │ • 指标图表展示   │ │
│  │ • 时序数据存储   │    │ • 告警通知推送   │    │ • 趋势分析报告   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 技术栈

- **核心引擎**: Node.js + EventEmitter
- **流处理**: 自研流处理框架
- **缓存存储**: Redis + 内存存储
- **实时通信**: Server-Sent Events (SSE)
- **数据序列化**: JSON + MessagePack
- **性能监控**: 自定义性能指标收集

## 🚀 核心功能

### 1. 实时数据流处理

#### 流数据处理特性
```javascript
// 流式数据处理示例
const realtimeEngine = require('./services/realtimeEngine');

// 添加实时数据流
await realtimeEngine.addStreamData('behavior', {
  userId: 'user123',
  action: 'announcement_read',
  timestamp: Date.now(),
  metadata: { page: '/announcements', duration: 5000 }
});

// 批量处理数据
const batchData = [
  { type: 'behavior', data: {...} },
  { type: 'finance', data: {...} },
  { type: 'emergency', data: {...} }
];
await realtimeEngine.processBatch(batchData);
```

#### 数据处理管道
- **数据接收** - 多源数据实时接收
- **数据验证** - 自动数据质量检查
- **数据转换** - 标准化数据格式
- **数据过滤** - 智能数据筛选
- **数据聚合** - 多维度聚合计算
- **数据存储** - 分层存储策略

### 2. 实时指标计算

#### 内置指标类型

##### 系统性能指标
```javascript
// 响应时间指标
realtimeEngine.registerMetric('response_time', {
  type: 'histogram',
  unit: 'ms',
  description: 'API响应时间分布',
  windows: ['1m', '5m', '15m', '1h'],
  thresholds: {
    warning: 1000,    // 1秒
    critical: 5000    // 5秒
  }
});

// 错误率指标
realtimeEngine.registerMetric('error_rate', {
  type: 'gauge',
  unit: 'percentage',
  description: '系统错误率',
  windows: ['1m', '5m', '15m'],
  calculation: 'errors / total_requests'
});
```

##### 业务指标
```javascript
// 活跃用户数
realtimeEngine.registerMetric('active_users', {
  type: 'gauge',
  unit: 'count',
  description: '当前活跃用户数',
  windows: ['1m', '5m', '15m'],
  aggregation: 'unique_user_count'
});

// 用户参与度
realtimeEngine.registerMetric('engagement_score', {
  type: 'counter',
  unit: 'points',
  description: '用户参与度总分',
  windows: ['1h', '6h', '1d'],
  calculation: 'sum(action_weights)'
});
```

#### 聚合窗口策略

##### 滑动窗口
```javascript
// 5分钟滑动窗口，每10秒更新一次
const slidingWindow = {
  size: 5 * 60 * 1000,      // 5分钟窗口大小
  step: 10 * 1000,          // 10秒滑动步长
  aggregation: 'avg',       // 平均值聚合
  outputInterval: 10 * 1000 // 输出间隔
};
```

##### 翻滚窗口
```javascript
// 1小时翻滚窗口
const tumblingWindow = {
  size: 60 * 60 * 1000,     // 1小时窗口
  aggregation: 'sum',       // 求和聚合
  trigger: 'time_based'     // 时间触发
};
```

### 3. 动态阈值调整

#### 自适应阈值算法

##### 百分位数策略
```javascript
// 基于历史百分位数的动态阈值
realtimeEngine.setThreshold('response_time', {
  type: 'adaptive',
  strategy: 'percentile',
  percentile: 0.95,         // 95分位数
  minDataPoints: 20,        // 最少数据点数
  window: '5m',             // 5分钟窗口
  adjustmentFactor: 1.2,    // 调整因子
  operator: '>'
});
```

##### 标准差策略
```javascript
// 基于标准差的动态阈值
realtimeEngine.setThreshold('error_rate', {
  type: 'dynamic',
  strategy: 'std_deviation',
  multiplier: 2,            // 2倍标准差
  minDataPoints: 30,        // 最少数据点数
  window: '15m',            // 15分钟窗口
  baselineWindow: '1h'      // 基准窗口
});
```

##### 趋势基策略
```javascript
// 基于趋势的动态阈值
realtimeEngine.setThreshold('active_users', {
  type: 'adaptive',
  strategy: 'trend_based',
  minDataPoints: 50,        // 最少数据点数
  window: '1h',             // 1小时窗口
  adjustmentFactor: 0.8,    // 调整因子
  trendWindow: '6h'         // 趋势分析窗口
});
```

#### 阈值类型

| 类型 | 描述 | 使用场景 | 配置参数 |
|------|------|----------|----------|
| `static` | 静态阈值 | 固定标准的监控 | `value`, `operator` |
| `adaptive` | 自适应阈值 | 波动性大的指标 | `strategy`, `adjustmentFactor` |
| `dynamic` | 动态阈值 | 需要学习的指标 | `multiplier`, `window` |
| `seasonal` | 季节性阈值 | 有周期性变化的指标 | `seasonality`, `baseline` |

### 4. 实时预警系统

#### 预警规则配置
```javascript
// 注册预警规则
realtimeEngine.registerAlertRule('high_error_rate', {
  name: '错误率过高预警',
  description: '系统错误率超过阈值时触发预警',
  severity: 'critical',
  conditions: [
    {
      metric: 'error_rate',
      operator: '>',
      value: 0.05,
      window: '5m'
    }
  ],
  actions: [
    {
      type: 'notification',
      channel: ['email', 'sms', 'webhook'],
      template: 'high_error_rate_template',
      recipients: ['admin@village.com']
    },
    {
      type: 'auto_recovery',
      actions: ['restart_service', 'scale_up']
    }
  ],
  cooldown: 60000,  // 1分钟冷却时间
  enabled: true
});
```

#### 预警级别
- **Critical** - 严重故障，需要立即处理
- **High** - 高优先级问题，需要快速响应
- **Medium** - 中等问题，需要在工作时间内处理
- **Low** - 低优先级问题，可以延后处理

#### 通知渠道
- **邮件通知** - 详细的问题报告和解决方案
- **短信通知** - 紧急问题的即时通知
- **Webhook** - 与第三方系统集成的通知
- **钉钉/企业微信** - 团队协作平台通知
- **系统日志** - 详细的预警记录

## 📡 API接口

### 实时指标API

#### 获取所有指标
```http
GET /api/v1/realtime/metrics
```

**查询参数**:
- `types` - 指标类型过滤 (counter,gauge,histogram,rate)
- `windows` - 时间窗口过滤 (1m,5m,15m,1h)
- `includeHistory` - 是否包含历史数据 (true/false)
- `limit` - 历史数据条数限制

**响应示例**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "response_time": {
        "type": "histogram",
        "unit": "ms",
        "currentValue": 245,
        "description": "API响应时间"
      },
      "error_rate": {
        "type": "gauge",
        "unit": "percentage",
        "currentValue": 0.02,
        "description": "系统错误率"
      }
    },
    "history": {
      "response_time": [
        {"timestamp": "2024-01-01T10:00:00Z", "value": 230},
        {"timestamp": "2024-01-01T10:01:00Z", "value": 245}
      ]
    }
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

#### 获取特定指标
```http
GET /api/v1/realtime/metrics/{metricName}
```

**查询参数**:
- `window` - 时间窗口 (1h默认)
- `limit` - 历史数据条数
- `includeStatistics` - 是否包含统计信息

### 实时数据API

#### 添加实时数据
```http
POST /api/v1/realtime/data
```

**请求体**:
```json
{
  "dataType": "behavior",
  "data": {
    "userId": "user123",
    "action": "announcement_read",
    "page": "/announcements",
    "timestamp": 1640995200000,
    "metadata": {
      "duration": 5000,
      "device": "mobile"
    }
  }
}
```

#### 批量添加数据
```http
POST /api/v1/realtime/data/batch
```

**请求体**:
```json
{
  "dataList": [
    {
      "type": "behavior",
      "data": {...}
    },
    {
      "type": "finance",
      "data": {...}
    }
  ]
}
```

### 预警管理API

#### 注册预警规则
```http
POST /api/v1/realtime/alerts
```

**请求体**:
```json
{
  "ruleId": "high_cpu_usage",
  "rule": {
    "name": "CPU使用率过高",
    "description": "CPU使用率超过80%时触发",
    "severity": "warning",
    "conditions": [{
      "metric": "cpu_usage",
      "operator": ">",
      "value": 0.8,
      "window": "5m"
    }],
    "actions": [{
      "type": "notification",
      "channel": ["email"],
      "recipients": ["admin@village.com"]
    }]
  }
}
```

### 实时订阅API

#### 事件流订阅
```http
GET /api/v1/realtime/subscribe/{eventType}
```

**支持的事件类型**:
- `metrics_update` - 指标更新事件
- `alert_triggered` - 预警触发事件
- `system_status` - 系统状态变化
- `user_activity` - 用户活动事件
- `data_processed` - 数据处理完成

**响应格式 (Server-Sent Events)**:
```
data: {"type":"metrics_update","metric":"response_time","value":245,"timestamp":1640995200000}

data: {"type":"alert_triggered","rule":"high_error_rate","severity":"critical","message":"错误率过高"}
```

## 🧊 使用示例

### 基础使用

#### 1. 初始化实时引擎
```javascript
const realtimeEngine = require('./services/realtimeEngine');
const streamProcessor = require('./services/streamProcessor');

// 启动实时引擎
await realtimeEngine.start();

// 注册自定义指标
realtimeEngine.registerMetric('custom_metric', {
  type: 'counter',
  unit: 'count',
  description: '自定义计数器',
  windows: ['1m', '5m', '15m']
});

// 添加实时数据
await realtimeEngine.addStreamData('custom', {
  userId: 'user123',
  action: 'custom_action',
  value: 10,
  timestamp: Date.now()
});
```

#### 2. 流数据处理
```javascript
// 注册数据处理器
streamProcessor.registerProcessor('custom_data', async (data) => {
  // 数据处理逻辑
  const processed = {
    ...data,
    processedAt: Date.now(),
    calculatedField: data.value * 2
  };

  return processed;
});

// 处理数据
const result = await streamProcessor.processData('custom_data', {
  userId: 'user123',
  value: 100
});
```

#### 3. 设置预警规则
```javascript
// 设置简单阈值
realtimeEngine.setThreshold('response_time', {
  type: 'static',
  operator: '>',
  value: 2000,
  alertLevel: 'warning',
  cooldown: 30000
});

// 设置动态阈值
realtimeEngine.setThreshold('error_rate', {
  type: 'adaptive',
  strategy: 'percentile',
  percentile: 0.95,
  adjustmentFactor: 1.5,
  alertLevel: 'critical',
  cooldown: 60000
});
```

### 高级使用

#### 1. 复杂数据聚合
```javascript
// 注册自定义聚合器
realtimeEngine.registerAggregator('user_engagement', async (dataPoints) => {
  const engagement = dataPoints.reduce((total, point) => {
    return total + calculateEngagementScore(point);
  }, 0);

  return {
    totalEngagement: engagement,
    averageEngagement: engagement / dataPoints.length,
    userCount: new Set(dataPoints.map(p => p.userId)).size
  };
});

// 应用聚合器
realtimeEngine.applyAggregation('user_engagement', {
  window: '1h',
  groupBy: ['userId', 'action'],
  outputInterval: 60000
});
```

#### 2. 实时仪表板
```javascript
// 获取仪表板数据
const dashboardData = {
  overview: {
    totalUsers: await realtimeEngine.getMetricValue('total_users', '1h'),
    activeUsers: await realtimeEngine.getMetricValue('active_users', '1m'),
    systemHealth: await realtimeEngine.getSystemHealth()
  },

  performance: {
    responseTime: await realtimeEngine.getMetricHistory('response_time', '1h', 60),
    errorRate: await realtimeEngine.getMetricHistory('error_rate', '1h', 60),
    throughput: await realtimeEngine.getMetricValue('throughput', '5m')
  },

  alerts: {
    active: await realtimeEngine.getActiveAlerts(),
    recent: await realtimeEngine.getRecentAlerts(24)
  }
};
```

#### 3. 事件监听
```javascript
// 监听指标更新
realtimeEngine.on('metricUpdated', (event) => {
  console.log(`指标 ${event.metricName} 更新为: ${event.value}`);
});

// 监听预警触发
realtimeEngine.on('alertTriggered', (alert) => {
  console.log(`预警触发: ${alert.ruleName} - ${alert.message}`);

  // 发送通知
  notificationService.send({
    type: alert.severity,
    message: alert.message,
    recipients: alert.recipients
  });
});

// 监听数据处理完成
realtimeEngine.on('dataProcessed', (result) => {
  console.log(`处理完成: ${result.dataCount} 条数据`);
});
```

## 🔧 配置说明

### 系统配置

#### Redis配置
```javascript
// config/realtimeConfig.js
module.exports = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'realtime:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  }
};
```

#### 性能配置
```javascript
performance: {
  // 数据保留时间
  dataRetention: {
    '1m': 60 * 1000,           // 1分钟
    '5m': 5 * 60 * 1000,       // 5分钟
    '1h': 60 * 60 * 1000,      // 1小时
    '1d': 24 * 60 * 60 * 1000  // 1天
  },

  // 批处理配置
  batchProcessing: {
    enabled: true,
    batchSize: 100,
    flushInterval: 1000,
    maxWaitTime: 5000
  },

  // 内存限制
  memory: {
    maxDataPoints: 10000,
    gcInterval: 60000,
    memoryThreshold: 0.8
  }
}
```

### 监控配置

#### 系统监控
```javascript
monitoring: {
  system: {
    enabled: true,
    interval: 5000,
    metrics: ['cpu', 'memory', 'disk', 'network']
  },

  application: {
    enabled: true,
    interval: 10000,
    metrics: ['requests', 'errors', 'response_time', 'active_connections']
  },

  business: {
    enabled: true,
    interval: 30000,
    metrics: ['user_activity', 'feature_usage', 'conversion_rates']
  }
}
```

## 📊 性能优化

### 内存优化

#### 1. 数据分片
```javascript
// 按时间分片存储
const timeShards = {
  current: [],      // 当前时间窗口数据
  recent: [],       // 最近时间窗口数据
  archive: []       // 归档数据
};

// 定期数据清理
setInterval(() => {
  archiveOldData();
  compactMemory();
}, 5 * 60 * 1000); // 每5分钟执行一次
```

#### 2. 对象池
```javascript
// 复用对象减少GC压力
class DataPointPool {
  constructor(size = 1000) {
    this.pool = [];
    this.size = size;

    // 预分配对象
    for (let i = 0; i < size; i++) {
      this.pool.push(new DataPoint());
    }
  }

  acquire() {
    return this.pool.pop() || new DataPoint();
  }

  release(dataPoint) {
    if (this.pool.length < this.size) {
      dataPoint.reset();
      this.pool.push(dataPoint);
    }
  }
}
```

### 计算优化

#### 1. 增量计算
```javascript
// 增量更新聚合值
class IncrementalAggregator {
  constructor() {
    this.sum = 0;
    this.count = 0;
    this.min = Infinity;
    this.max = -Infinity;
  }

  add(value) {
    this.sum += value;
    this.count++;
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
  }

  getStats() {
    return {
      sum: this.sum,
      count: this.count,
      avg: this.sum / this.count,
      min: this.min,
      max: this.max
    };
  }
}
```

#### 2. 并行处理
```javascript
// Worker线程并行处理
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  // 主线程：分发任务
  const workers = [];
  const workerCount = 4;

  for (let i = 0; i < workerCount; i++) {
    workers.push(new Worker(__filename, {
      workerData: { workerId: i }
    }));
  }

  // 分发数据到worker
  workers.forEach(worker => {
    worker.on('message', (result) => {
      handleWorkerResult(result);
    });
  });

} else {
  // Worker线程：处理数据
  const { workerId } = workerData;

  parentPort.on('message', (data) => {
    const result = processData(data);
    parentPort.postMessage({ workerId, result });
  });
}
```

### 存储优化

#### 1. 数据压缩
```javascript
// 使用MessagePack压缩数据
const msgpack = require('msgpack5')();

function compressData(data) {
  return msgpack.encode(data);
}

function decompressData(buffer) {
  return msgpack.decode(buffer);
}

// 在存储前压缩
await redis.setex(
  `metric:${metricName}:${window}`,
  ttl,
  compressData(data)
);
```

#### 2. 智能缓存
```javascript
// LRU缓存策略
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      // 移到最后（最近使用）
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 删除最久未使用的项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

## 🔒 安全特性

### 数据安全

#### 1. 敏感数据脱敏
```javascript
// 自动脱敏敏感字段
function sanitizeData(data) {
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  }

  return sanitized;
}
```

#### 2. 访问控制
```javascript
// 基于角色的访问控制
const rbac = {
  roles: {
    admin: ['read', 'write', 'delete', 'manage'],
    operator: ['read', 'write'],
    viewer: ['read']
  },

  checkPermission(userRole, action) {
    return this.roles[userRole]?.includes(action) || false;
  }
};
```

### 系统安全

#### 1. 速率限制
```javascript
// 实时计算API速率限制
const rateLimiter = new Map();

function checkRateLimit(clientId, maxRequests = 1000, windowSize = 60000) {
  const now = Date.now();
  const requests = rateLimiter.get(clientId) || [];

  // 清理过期请求
  const validRequests = requests.filter(time => now - time < windowSize);

  if (validRequests.length >= maxRequests) {
    return false; // 超过限制
  }

  validRequests.push(now);
  rateLimiter.set(clientId, validRequests);
  return true;
}
```

#### 2. 输入验证
```javascript
// 数据输入验证
const validateInput = {
  metricName: (name) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name),
  value: (value) => typeof value === 'number' && !isNaN(value),
  timestamp: (ts) => typeof ts === 'number' && ts > 0,

  validate(data) {
    const errors = [];

    if (!this.metricName(data.metricName)) {
      errors.push('Invalid metric name');
    }

    if (!this.value(data.value)) {
      errors.push('Invalid value');
    }

    if (!this.timestamp(data.timestamp)) {
      errors.push('Invalid timestamp');
    }

    return errors;
  }
};
```

## 🚨 故障排除

### 常见问题

#### 1. 内存泄漏
**症状**: 内存使用持续增长，系统变慢
**排查步骤**:
```javascript
// 检查内存使用
const used = process.memoryUsage();
console.log('Memory Usage:', {
  rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
  heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
  heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
  external: Math.round(used.external / 1024 / 1024 * 100) / 100
});

// 检查缓存大小
console.log('Cache sizes:', {
  metricCache: realtimeEngine.metricCache.size,
  dataCache: realtimeEngine.dataCache.size,
  alertCache: realtimeEngine.alertCache.size
});
```

**解决方案**:
- 增加垃圾回收频率
- 限制缓存大小
- 定期清理过期数据

#### 2. Redis连接问题
**症状**: 数据写入失败，超时错误
**排查步骤**:
```javascript
// 检查Redis连接状态
redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

// 测试连接
await redis.ping();
```

**解决方案**:
- 检查网络连接
- 调整连接池配置
- 增加重试机制

#### 3. 性能问题
**症状**: 处理延迟增加，吞吐量下降
**排查步骤**:
```javascript
// 性能监控
const startTime = Date.now();
await processLargeData();
const duration = Date.now() - startTime;

console.log(`Processing time: ${duration}ms`);

// 检查队列积压
console.log('Queue size:', streamProcessor.getQueueSize());
```

**解决方案**:
- 启用批处理
- 增加工作线程
- 优化算法复杂度

### 监控指标

#### 系统健康指标
- **CPU使用率** < 80%
- **内存使用率** < 85%
- **磁盘使用率** < 90%
- **网络延迟** < 100ms

#### 应用性能指标
- **API响应时间** < 500ms (P95)
- **错误率** < 1%
- **吞吐量** > 1000 req/s
- **可用性** > 99.9%

#### 业务指标
- **数据处理延迟** < 1s
- **预警响应时间** < 30s
- **指标计算准确率** > 99.9%
- **用户满意度** > 4.5/5

## 🔮 未来规划

### 短期优化 (1-3个月)
- [ ] 机器学习集成 - 异常检测和预测
- [ ] 图形化配置界面 - 可视化规则配置
- [ ] 性能基准测试 - 自动化性能测试
- [ ] 多租户支持 - 隔离不同村庄数据

### 中期发展 (3-6个月)
- [ ] 分布式部署 - 支持集群部署
- [ ] 容器化支持 - Docker和Kubernetes部署
- [ ] 边缘计算 - 本地数据处理能力
- [ ] AI驱动的优化 - 自动调整参数

### 长期愿景 (6-12个月)
- [ ] 实时数字孪生 - 村庄实时数字镜像
- [ ] 预测性分析 - 基于历史数据的趋势预测
- [ ] 自治运维 - 自动故障检测和修复
- [ ] 跨域数据整合 - 与其他系统数据融合

---

**技术支持**: 18886990223@163.com
**更新时间**: 2024年12月14日
**版本**: v1.0.0