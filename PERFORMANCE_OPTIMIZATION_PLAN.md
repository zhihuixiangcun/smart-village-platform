# 智慧乡村平台 - Week 25-26 后端性能提升计划

## 📅 周期规划
- **Week 25**: 后端性能重构与优化
- **Week 26**: 性能监控与调优

## 🎯 性能目标
- API响应时间：从 500ms → 200ms
- 并发处理能力：从 1000 → 5000
- 内存使用率：优化 30%
- CPU利用率：优化 25%

## Week 25: 后端性能重构与优化

### Day 1-2: 代码重构与优化

#### 1.1 控制器优化
```javascript
// src/controllers/optimized/residentController.js
const { performance } = require('perf_hooks');
const { CacheUtil } = require('../../utils/cache');
const { Resident } = require('../../models/Resident');

class OptimizedResidentController {
  // 批量查询优化
  async getResidents(req, res) {
    const start = performance.now();

    try {
      // 使用缓存
      const cacheKey = `residents:${JSON.stringify(req.query)}`;
      let residents = await CacheUtil.get(cacheKey);

      if (!residents) {
        // 聚合查询优化
        residents = await Resident.aggregate([
          {
            $match: this.buildQuery(req.query)
          },
          {
            $lookup: {
              from: 'villages',
              localField: 'villageId',
              foreignField: '_id',
              as: 'village'
            }
          },
          {
            $project: {
              name: 1,
              phone: 1,
              idCard: { $concat: ['$', '****', { $substr: ['$idCard', -4, 4]}] },
              age: { $subtract: [new Date(), '$birthday'] },
              village: '$village.name'
            }
          }
        ]);

        // 缓存5分钟
        await CacheUtil.set(cacheKey, residents, 300);
      }

      const duration = performance.now() - start;

      // 性能监控
      this.logPerformance('getResidents', duration);

      res.json({
        success: true,
        data: residents,
        performance: {
          duration,
          cached: await CacheUtil.exists(cacheKey)
        }
      });

    } catch (error) {
      this.handleError(res, error);
    }
  }

  // 流式处理大数据
  async exportResidents(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="residents.csv"'
    });

    // 使用流式处理避免内存溢出
    const cursor = Resident.find().cursor();
    const transform = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const csv = this.convertToCSV(chunk);
        callback(null, csv);
      }
    });

    cursor.pipe(transform).pipe(res);
  }
}
```

#### 1.2 服务层优化
```javascript
// src/services/optimized/dataService.js
const DataLoader = require('dataloader');
const { EventEmitter } = require('events');

class OptimizedDataService extends EventEmitter {
  constructor() {
    super();
    this.batchLoader = new DataLoader(this.batchFetch.bind(this), {
      batchScheduleFn: setTimeout,
      maxBatchSize: 100
    });
  }

  // 批量加载优化
  async batchFetch(keys) {
    const results = await Model.find({ _id: { $in: keys } });
    const resultMap = new Map();

    results.forEach(item => {
      resultMap.set(item._id.toString(), item);
    });

    return keys.map(key => resultMap.get(key));
  }

  // 预加载热门数据
  async preloadHotData() {
    const hotQueries = [
      this.getVillageStats(),
      this.getRecentAnnouncements(),
      this.getEmergencyContacts()
    ];

    await Promise.all(hotQueries);
    this.emit('preloadComplete');
  }

  // 智能缓存策略
  async getWithCache(key, fetchFn, ttl = 300) {
    let data = await CacheUtil.get(key);

    if (!data) {
      data = await fetchFn();
      await CacheUtil.set(key, data, ttl);
    }

    return data;
  }
}
```

### Day 3-4: 数据库优化

#### 2.1 查询优化
```javascript
// src/database/queryOptimizer.js
class QueryOptimizer {
  // 自动索引建议
  async analyzeSlowQueries() {
    const slowQueries = await this.getSlowQueries();
    const suggestions = [];

    for (const query of slowQueries) {
      const analysis = await this.analyzeQuery(query);
      if (analysis.needsIndex) {
        suggestions.push({
          collection: query.collection,
          fields: analysis.fields,
          indexType: analysis.indexType,
          improvement: analysis.improvement
        });
      }
    }

    return suggestions;
  }

  // 查询计划分析
  async explainQuery(collection, filter) {
    return await collection.find(filter).explain('executionStats');
  }

  // 自动创建缺失索引
  async createMissingIndexes() {
    const indexes = [
      { collection: 'residents', fields: { villageId: 1, phone: 1 } },
      { collection: 'announcements', fields: { villageId: 1, createdAt: -1 } },
      { collection: 'service_requests', fields: { status: 1, createdAt: -1 } }
    ];

    for (const index of indexes) {
      await this.ensureIndex(index.collection, index.fields);
    }
  }
}
```

#### 2.2 连接池优化
```javascript
// src/database/connectionPool.js
class OptimizedConnectionPool {
  constructor() {
    this.pools = {
      read: new Map(),
      write: new Map()
    };
    this.config = {
      read: {
        min: 5,
        max: 20,
        idle: 30000,
        acquire: 60000
      },
      write: {
        min: 3,
        max: 10,
        idle: 30000,
        acquire: 30000
      }
    };
  }

  // 智能连接管理
  async getConnection(type = 'read') {
    const pool = this.pools[type];

    if (pool.size < this.config[type].min) {
      return this.createConnection(type);
    }

    return pool.values().next().value;
  }

  // 连接健康检查
  async healthCheck() {
    const results = {};

    for (const [type, pool] of Object.entries(this.pools)) {
      let healthy = 0;
      let unhealthy = 0;

      for (const connection of pool.values()) {
        try {
          await connection.db.admin().ping();
          healthy++;
        } catch (error) {
          unhealthy++;
          this.removeConnection(type, connection);
        }
      }

      results[type] = { healthy, unhealthy, total: pool.size };
    }

    return results;
  }
}
```

### Day 5: 缓存系统升级

#### 3.1 多级缓存架构
```javascript
// src/cache/multiLevelCache.js
class MultiLevelCache {
  constructor() {
    // L1: 内存缓存 (最热数据)
    this.l1Cache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 5 // 5分钟
    });

    // L2: Redis缓存 (热数据)
    this.l2Cache = require('ioredis');

    // L3: 文件缓存 (温数据)
    this.l3Cache = new FileCache({
      dir: './cache',
      ttl: 1000 * 60 * 60 // 1小时
    });
  }

  async get(key) {
    // L1 查询
    let value = this.l1Cache.get(key);
    if (value !== undefined) return value;

    // L2 查询
    value = await this.l2Cache.get(key);
    if (value !== null) {
      this.l1Cache.set(key, value);
      return value;
    }

    // L3 查询
    value = await this.l3Cache.get(key);
    if (value !== null) {
      await this.l2Cache.set(key, value, 'PX', 300000); // 5分钟
      this.l1Cache.set(key, value);
      return value;
    }

    return null;
  }

  async set(key, value, options = {}) {
    const ttl = options.ttl || 300000; // 默认5分钟

    this.l1Cache.set(key, value);
    await this.l2Cache.setex(key, ttl / 1000, value);
    await this.l3Cache.set(key, value, ttl);
  }

  // 缓存预热
  async warmup() {
    const hotKeys = await this.getHotKeys();

    for (const key of hotKeys) {
      const value = await this.fetchFromSource(key);
      if (value) {
        await this.set(key, value, { ttl: 3600000 }); // 1小时
      }
    }
  }
}
```

#### 3.2 智能缓存策略
```javascript
// src/cache/smartCache.js
class SmartCache {
  constructor() {
    this.hitRates = new Map();
    this.accessPatterns = new Map();
  }

  // 动态调整TTL
  async adjustTTL(key) {
    const stats = this.getAccessStats(key);
    const hitRate = stats.hits / (stats.hits + stats.misses);

    let ttl;
    if (hitRate > 0.8) {
      ttl = 3600000; // 1小时
    } else if (hitRate > 0.5) {
      ttl = 600000;  // 10分钟
    } else {
      ttl = 60000;   // 1分钟
    }

    await this.updateTTL(key, ttl);
  }

  // 预测性缓存
  async predictiveCache() {
    const patterns = await this.analyzePatterns();

    for (const pattern of patterns) {
      if (pattern.probability > 0.7) {
        const key = pattern.nextKey;
        const value = await this.prefetch(key);
        if (value) {
          await this.set(key, value);
        }
      }
    }
  }
}
```

## Week 26: 性能监控与调优

### Day 1-2: 监控系统建设

#### 4.1 实时性能监控
```javascript
// src/monitoring/performanceMonitor.js
class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.thresholds = {
      responseTime: 500,
      errorRate: 0.05,
      memoryUsage: 0.8,
      cpuUsage: 0.8
    };
  }

  // 请求性能追踪
  trackRequest(req, res, next) {
    const start = process.hrtime.bigint();
    const requestId = req.id;

    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1000000;
      const route = req.route?.path || req.path;

      this.recordMetric({
        requestId,
        route,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        timestamp: new Date()
      });

      // 检查性能阈值
      this.checkThresholds(route, duration, res.statusCode);
    });

    next();
  }

  // 实时指标收集
  recordMetric(metric) {
    const key = `${metric.route}:${metric.method}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        minDuration: Infinity,
        maxDuration: 0,
        recent: []
      });
    }

    const stats = this.metrics.get(key);
    stats.count++;
    stats.totalDuration += metric.duration;
    stats.minDuration = Math.min(stats.minDuration, metric.duration);
    stats.maxDuration = Math.max(stats.maxDuration, metric.duration);

    if (metric.statusCode >= 400) {
      stats.errors++;
    }

    // 保存最近100个请求
    stats.recent.push({
      duration: metric.duration,
      timestamp: metric.timestamp,
      statusCode: metric.statusCode
    });

    if (stats.recent.length > 100) {
      stats.recent.shift();
    }

    // 发送实时数据
    this.emit('metric', { key, stats });
  }

  // 生成性能报告
  generateReport() {
    const report = {
      timestamp: new Date(),
      routes: {},
      summary: {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        slowestRoutes: [],
        fastestRoutes: []
      }
    };

    let totalRequests = 0;
    let totalDuration = 0;
    let totalErrors = 0;
    const routeStats = [];

    for (const [key, stats] of this.metrics.entries()) {
      totalRequests += stats.count;
      totalDuration += stats.totalDuration;
      totalErrors += stats.errors;

      const avgDuration = stats.totalDuration / stats.count;
      const errorRate = stats.errors / stats.count;

      report.routes[key] = {
        count: stats.count,
        avgDuration,
        errorRate,
        minDuration: stats.minDuration,
        maxDuration: stats.maxDuration,
        p95Duration: this.calculatePercentile(stats.recent, 0.95),
        p99Duration: this.calculatePercentile(stats.recent, 0.99)
      };

      routeStats.push({
        key,
        avgDuration,
        errorRate
      });
    }

    // 最慢和最快的路由
    routeStats.sort((a, b) => b.avgDuration - a.avgDuration);
    report.summary.slowestRoutes = routeStats.slice(0, 5);
    report.summary.fastestRoutes = routeStats.slice(-5);

    report.summary.totalRequests = totalRequests;
    report.summary.avgResponseTime = totalDuration / totalRequests;
    report.summary.errorRate = totalErrors / totalRequests;

    return report;
  }
}
```

#### 4.2 告警系统
```javascript
// src/monitoring/alertSystem.js
class AlertSystem extends EventEmitter {
  constructor() {
    super();
    this.rules = new Map();
    this.notifiers = new Map();
    this.setupDefaultRules();
  }

  setupDefaultRules() {
    // 响应时间告警
    this.addRule('slow-response', {
      condition: (metric) => metric.avgDuration > 1000,
      severity: 'warning',
      message: (metric) => `响应时间过长: ${metric.avgDuration}ms`
    });

    // 错误率告警
    this.addRule('high-error-rate', {
      condition: (metric) => metric.errorRate > 0.1,
      severity: 'critical',
      message: (metric) => `错误率过高: ${(metric.errorRate * 100).toFixed(2)}%`
    });

    // 内存使用告警
    this.addRule('high-memory', {
      condition: () => {
        const usage = process.memoryUsage();
        return usage.heapUsed / usage.heapTotal > 0.9;
      },
      severity: 'critical',
      message: () => '内存使用率超过90%'
    });
  }

  // 检查告警规则
  checkAlerts(metric) {
    const alerts = [];

    for (const [name, rule] of this.rules.entries()) {
      if (rule.condition(metric)) {
        const alert = {
          id: this.generateAlertId(),
          name,
          severity: rule.severity,
          message: rule.message(metric),
          timestamp: new Date(),
          metric
        };

        alerts.push(alert);
        this.emit('alert', alert);

        // 发送通知
        this.sendNotification(alert);
      }
    }

    return alerts;
  }

  // 发送通知
  async sendNotification(alert) {
    // 钉钉通知
    if (alert.severity === 'critical') {
      await this.sendDingTalk(alert);
    }

    // 邮件通知
    if (alert.severity === 'warning') {
      await this.sendEmail(alert);
    }

    // Slack通知
    await this.sendSlack(alert);
  }
}
```

### Day 3-4: 性能调优

#### 5.1 自动调优系统
```javascript
// src/optimization/autoTuner.js
class AutoTuner {
  constructor() {
    this.tuningStrategies = new Map();
    this.setupStrategies();
  }

  setupStrategies() {
    // 数据库连接池调优
    this.tuningStrategies.set('connection-pool', async (metrics) => {
      const pool = await this.getConnectionPoolMetrics();

      if (pool.utilization > 0.8) {
        return {
          action: 'increase-pool-size',
          value: Math.min(pool.current + 2, 20),
          reason: '连接池利用率过高'
        };
      } else if (pool.utilization < 0.3 && pool.current > 5) {
        return {
          action: 'decrease-pool-size',
          value: Math.max(pool.current - 1, 5),
          reason: '连接池利用率过低'
        };
      }

      return null;
    });

    // 缓存调优
    this.tuningStrategies.set('cache-tuning', async (metrics) => {
      const cacheHitRate = this.getCacheHitRate();

      if (cacheHitRate < 0.6) {
        return {
          action: 'increase-cache-size',
          value: '20%',
          reason: '缓存命中率过低'
        };
      }

      return null;
    });
  }

  // 执行自动调优
  async autoTune() {
    const metrics = await this.collectMetrics();
    const suggestions = [];

    for (const [name, strategy] of this.tuningStrategies.entries()) {
      const suggestion = await strategy(metrics);
      if (suggestion) {
        suggestions.push(suggestion);
        await this.applyTuning(suggestion);
      }
    }

    return suggestions;
  }

  // 应用调优建议
  async applyTuning(suggestion) {
    switch (suggestion.action) {
      case 'increase-pool-size':
        await this.adjustConnectionPool(suggestion.value);
        break;
      case 'increase-cache-size':
        await this.adjustCacheSize(suggestion.value);
        break;
      default:
        console.log('Unknown tuning action:', suggestion.action);
    }
  }
}
```

#### 5.2 压力测试优化
```javascript
// src/testing/performanceTest.js
class PerformanceTest {
  constructor() {
    this.results = [];
    this.scenarios = new Map();
  }

  // 负载测试
  async runLoadTest(options = {}) {
    const {
      concurrent = 100,
      duration = 60000,
      rampUp = 10000,
      endpoint = '/api/v1/residents'
    } = options;

    const results = {
      scenario: 'load-test',
      config: options,
      results: []
    };

    // 逐步增加并发
    for (let i = 1; i <= concurrent; i *= 2) {
      const batchResults = await this.runBatch(i, endpoint, duration / concurrent);
      results.results.push({
        concurrent: i,
        avgResponseTime: batchResults.avgTime,
        p95ResponseTime: batchResults.p95,
        p99ResponseTime: batchResults.p99,
        throughput: batchResults.throughput,
        errors: batchResults.errors
      });
    }

    return results;
  }

  // Spike测试
  async runSpikeTest(options = {}) {
    const {
      normalLoad = 100,
      peakLoad = 1000,
      peakDuration = 30000,
      totalDuration = 60000
    } = options;

    // 正常负载
    await this.runBatch(normalLoad, '/api/v1/residents', totalDuration - peakDuration);

    // 峰值负载
    await this.runBatch(peakLoad, '/api/v1/residents', peakDuration);

    // 恢复到正常
    await this.runBatch(normalLoad, '/api/v1/residents', 30000);
  }

  // 生成性能报告
  generateReport(testResults) {
    const report = {
      summary: this.generateSummary(testResults),
      recommendations: this.generateRecommendations(testResults),
      benchmarks: this.getBenchmarks(testResults)
    };

    return report;
  }
}
```

### Day 5: 部署优化

#### 6.1 容器化优化
```dockerfile
# Dockerfile.optimized
FROM node:18-alpine AS builder

# 多阶段构建
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产镜像
FROM node:18-alpine AS production

# 安装性能监控工具
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# 只复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# 性能优化配置
ENV NODE_ENV=production
ENV UV_THREADPOOL_SIZE=32
ENV NODE_OPTIONS="--max-old-space-size=2048"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# 使用非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

CMD ["node", "src/app.js"]
```

#### 6.2 Kubernetes优化
```yaml
# k8s/deployment-optimized.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smart-village-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: smart-village-api
  template:
    metadata:
      labels:
        app: smart-village-api
    spec:
      containers:
      - name: api
        image: smart-village:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: UV_THREADPOOL_SIZE
          value: "32"
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
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: smart-village-service
spec:
  selector:
    app: smart-village-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

## 📊 性能优化预期成果

| 优化项目 | 优化前 | 优化后 | 提升幅度 |
|----------|--------|--------|----------|
| API响应时间 | 500ms | 200ms | 60% ⬇️ |
| 并发处理能力 | 1000 | 5000 | 400% ⬆️ |
| 内存使用率 | 80% | 60% | 25% ⬇️ |
| CPU利用率 | 75% | 60% | 20% ⬇️ |
| 缓存命中率 | 60% | 90% | 50% ⬆️ |
| 数据库查询优化 | 100ms | 30ms | 70% ⬇️ |

## 🚀 部署清单

### Week 25 部署任务
- [ ] 代码重构完成
- [ ] 数据库索引创建
- [ ] 缓存系统部署
- [ ] 性能监控集成

### Week 26 部署任务
- [ ] 监控面板部署
- [ ] 告警系统配置
- [ ] 压力测试执行
- [ ] 生产环境部署

## 📝 监控指标

### 关键性能指标（KPI）
1. **响应时间**: P95 < 200ms
2. **吞吐量**: > 1000 RPS
3. **错误率**: < 1%
4. **可用性**: > 99.9%
5. **资源利用率**: CPU < 80%, Memory < 85%

### 监控工具集成
- Prometheus + Grafana
- ELK Stack
- APM (Application Performance Monitoring)
- Real User Monitoring (RUM)

## ✅ 完成标准

1. **性能达标**
   - 所有API响应时间 < 200ms
   - 系统支持5000并发用户
   - 资源利用率在合理范围

2. **监控完备**
   - 实时性能监控
   - 自动告警机制
   - 性能报告生成

3. **稳定性验证**
   - 24小时压力测试
   - 故障恢复测试
   - 数据一致性验证

**Week 25-26 后端性能提升计划将显著提升系统性能，为用户提供更流畅的体验！**