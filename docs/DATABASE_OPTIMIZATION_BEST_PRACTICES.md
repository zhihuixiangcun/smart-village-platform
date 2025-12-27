# 智慧乡村项目数据库优化最佳实践指南

## 目录
1. [概述](#概述)
2. [性能瓶颈分析](#性能瓶颈分析)
3. [索引优化策略](#索引优化策略)
4. [查询优化技术](#查询优化技术)
5. [数据库分片方案](#数据库分片方案)
6. [多级缓存架构](#多级缓存架构)
7. [监控与维护](#监控与维护)
8. [性能基准测试](#性能基准测试)
9. [常见问题与解决方案](#常见问题与解决方案)

## 概述

智慧乡村项目采用MongoDB作为主数据库，存储村庄管理、村民信息、财务数据等关键业务数据。随着数据量增长和用户访问量增加，数据库性能优化变得至关重要。

### 核心优化目标
- **响应时间**: 将平均查询响应时间控制在100ms以内
- **吞吐量**: 支持1000+ QPS的并发访问
- **可用性**: 保证99.9%的服务可用性
- **扩展性**: 支持数据量线性扩展

## 性能瓶颈分析

### 1. 识别慢查询

使用以下方法识别性能瓶颈：

```javascript
// 启用慢查询日志
db.setProfilingLevel(1, { slowms: 100 });

// 查看慢查询
db.system.profile.find().sort({ ts: -1 }).limit(5);

// 使用explain分析查询计划
db.residents.find({ villageId: ObjectId("...") }).explain("executionStats");
```

### 2. 关键性能指标

监控以下指标：
- **查询执行时间**: 平均响应时间、P95、P99
- **索引使用率**: 索引命中率、覆盖查询比例
- **磁盘I/O**: 读写IOPS、磁盘使用率
- **内存使用**: 工作集大小、页面错误率
- **连接数**: 活跃连接数、连接池使用率

### 3. 性能分析工具

项目提供的工具：
- `DatabasePerformanceAnalyzer`: 实时性能监控
- `QueryOptimizer`: 查询优化建议
- `DatabaseBenchmark`: 性能基准测试

## 索引优化策略

### 1. 复合索引设计原则

```javascript
// 最佳实践：将选择性高的字段放在前面
db.residents.createIndex({ villageId: 1, status: 1, createdAt: -1 });

// 覆盖索引：包含查询所需的所有字段
db.residents.createIndex(
  { villageId: 1, status: 1 },
  {
    name: "village_status_covering",
    background: true
  }
);
```

### 2. 地理空间索引

```javascript
// 2dsphere索引用于地理位置查询
db.residents.createIndex({ location: "2dsphere" });

// 地理查询示例
db.residents.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [120.5, 30.5] },
      $maxDistance: 10000
    }
  }
});
```

### 3. 文本搜索索引

```javascript
// 全文搜索索引
db.residents.createIndex(
  { name: "text", "address.detailAddress": "text" },
  {
    weights: { name: 10, "address.detailAddress": 5 },
    name: "resident_text_search"
  }
);
```

### 4. TTL索引（自动过期）

```javascript
// 自动删除过期数据
db.messagelogs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 } // 90天
);
```

### 5. 索引维护

```javascript
// 查看索引使用情况
db.residents.aggregate([{ $indexStats: {} }]);

// 删除未使用的索引
db.residents.dropIndex("unused_index_name");

// 重建索引
db.residents.reIndex();
```

## 查询优化技术

### 1. 查询优化技巧

```javascript
// 使用投影减少数据传输
db.residents.find(
  { villageId: ObjectId("...") },
  { name: 1, phone: 1, status: 1 }
);

// 使用limit()限制返回结果
db.residents.find({ villageId: ObjectId("...") }).limit(20);

// 批量操作替代单个操作
// 差的做法
for (const id of ids) {
  db.residents.updateOne({ _id: id }, { $set: { status: "active" } });
}

// 好的做法
db.residents.updateMany(
  { _id: { $in: ids } },
  { $set: { status: "active" } }
);
```

### 2. 聚合管道优化

```javascript
// 优化前：多次$match
db.residents.aggregate([
  { $match: { villageId: ObjectId("...") } },
  { $group: { _id: "$occupation", count: { $sum: 1 } } },
  { $match: { count: { $gt: 10 } } }
]);

// 优化后：合并$match条件
db.residents.aggregate([
  { $match: { villageId: ObjectId("...") } },
  { $group: { _id: "$occupation", count: { $sum: 1 } } },
  { $match: { count: { $gt: 10 } } }
]);
```

### 3. 使用聚合管道提示

```javascript
// 强制使用特定索引
db.residents.aggregate([
  { $hint: { villageId: 1, status: 1 } },
  { $match: { villageId: ObjectId("...") } }
]);
```

## 数据库分片方案

### 1. 分片键选择

```javascript
// 基于村庄ID分片（推荐）
sh.shardCollection("smartvillage.residents", { villageId: 1 });

// 复合分片键（适用于特定场景）
sh.shardCollection("smartvillage.finances", { villageId: 1, transactionDate: 1 });
```

### 2. 分片策略

#### 哈希分片
```javascript
// 适合随机分布的访问模式
sh.shardCollection("smartvillage.users", { _id: "hashed" });
```

#### 范围分片
```javascript
// 适合范围查询较多的场景
sh.shardCollection("smartvillage.residents", { villageId: 1 });
```

### 3. 分片最佳实践

1. **选择高基数字段作为分片键**
2. **避免单调递增的分片键**
3. **确保查询包含分片键**
4. **定期监控数据分布**

```javascript
// 查看分片状态
sh.status();

// 查看数据分布
db.runCommand({ dataCollection: "smartvillage.residents", keyPattern: { villageId: 1 } });
```

## 多级缓存架构

### 1. 缓存层次结构

```
L1缓存（内存） → L2缓存（Redis） → L3缓存（数据库）
     ↓              ↓                ↓
  毫秒级         十毫秒级         百毫秒级
```

### 2. 缓存策略

#### Cache-Aside模式
```javascript
const cache = new MultiLevelCacheSystem();

// 读操作
async function getResident(id) {
  let resident = await cache.get(`resident:${id}`);

  if (!resident) {
    resident = await Resident.findById(id);
    if (resident) {
      await cache.set(`resident:${id}`, resident, { ttl: 3600 });
    }
  }

  return resident;
}

// 写操作
async function updateResident(id, data) {
  const resident = await Resident.findByIdAndUpdate(id, data, { new: true });

  // 同时更新缓存
  await cache.set(`resident:${id}`, resident);

  return resident;
}
```

#### Write-Through模式
```javascript
await cache.set(key, value, {
  writeThrough: true,
  writeToDB: async (k, v) => {
    await Resident.create(v);
  }
});
```

### 3. 缓存预热

```javascript
// 系统启动时预热热点数据
async function warmupCache() {
  const villages = await Village.find({ isActive: true });

  await cache.warmUp({
    keys: villages.map(v => `village:${v._id}`),
    fetchFunc: async (key) => {
      const villageId = key.split(':')[1];
      return await Village.findById(villageId);
    }
  });
}
```

### 4. 缓存失效策略

```javascript
// 基于模式的批量失效
await cache.invalidate("village:*");

// 基于事件的精确失效
resident.on('updated', async (resident) => {
  await Promise.all([
    cache.delete(`resident:${resident._id}`),
    cache.delete(`village:${resident.villageId}:residents`)
  ]);
});
```

## 监控与维护

### 1. 实时监控指标

```javascript
// 使用性能分析器
const analyzer = new DatabasePerformanceAnalyzer({
  slowQueryThreshold: 100,
  enableProfiling: true
});

await analyzer.initialize();

// 生成性能报告
const report = await analyzer.generatePerformanceReport();
```

### 2. 定期维护任务

```javascript
// 每日维护任务
async function dailyMaintenance() {
  // 1. 分析慢查询
  await analyzer.analyzeSlowQueries();

  // 2. 优化索引
  await optimizer.optimizeIndexes();

  // 3. 清理过期数据
  await cleanupExpiredData();

  // 4. 更新统计信息
  await db.runCommand({ collStats: "residents" });
}
```

### 3. 告警配置

```javascript
// 性能告警阈值
const thresholds = {
  avgResponseTime: 100,      // ms
  p95ResponseTime: 500,      // ms
  errorRate: 1,              // %
  cacheHitRate: 80,          // %
  diskUsage: 85,             // %
  memoryUsage: 90            // %
};
```

## 性能基准测试

### 1. 运行基准测试

```javascript
const DatabaseBenchmark = require('./tests/performance/databaseBenchmark');

const benchmark = new DatabaseBenchmark({
  testIterations: 1000,
  dataSize: 10000,
  concurrentUsers: 50
});

const results = await benchmark.runFullBenchmark();
console.log('测试结果:', results);
```

### 2. 关键测试场景

1. **简单查询**: 单条件查询
2. **复杂查询**: 多条件组合查询
3. **聚合查询**: 统计分析查询
4. **批量操作**: 批量插入/更新
5. **地理查询**: 位置相关查询
6. **并发测试**: 多用户并发访问

### 3. 性能目标

| 场景 | 平均响应时间 | P95响应时间 | 吞吐量 |
|------|-------------|------------|-------|
| 简单查询 | < 50ms | < 100ms | > 2000 RPS |
| 复杂查询 | < 100ms | < 300ms | > 500 RPS |
| 聚合查询 | < 200ms | < 500ms | > 100 RPS |
| 批量操作 | < 500ms | < 1000ms | > 50 RPS |

## 常见问题与解决方案

### 1. 查询性能问题

**问题**: 查询响应慢
**解决方案**:
```javascript
// 1. 检查执行计划
db.residents.find(query).explain("executionStats");

// 2. 添加合适的索引
db.residents.createIndex({ field: 1 });

// 3. 使用投影
db.residents.find(query, { name: 1, status: 1 });
```

### 2. 内存不足

**问题**: 工作集超出可用内存
**解决方案**:
```javascript
// 1. 增加索引选择性
db.residents.createIndex({ villageId: 1, createdAt: -1 });

// 2. 优化查询，减少扫描文档数
db.residents.find({ villageId: id, status: "active" });

// 3. 使用TTL索引自动清理旧数据
db.logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
```

### 3. 连接池耗尽

**问题**: 连接数过多导致连接超时
**解决方案**:
```javascript
// 优化连接池配置
mongoose.connect(uri, {
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false
});
```

### 4. 热点数据问题

**问题**: 某些数据访问过于频繁
**解决方案**:
```javascript
// 1. 使用多级缓存
const cache = new MultiLevelCacheSystem({
  l1: { maxSize: 1000, ttl: 300 },
  l2: { ttl: 3600 }
});

// 2. 预加载热点数据
await cache.preload({
  pattern: "village:popular:*",
  fetchFunc: loadPopularVillages,
  priority: "high"
});
```

### 5. 数据分布不均

**问题**: 分片数据倾斜
**解决方案**:
```javascript
// 1. 选择合适的分片键
sh.shardCollection("db.collection", { villageId: 1, timestamp: -1 });

// 2. 手动拆分chunk
sh.splitAt("db.collection", { villageId: ObjectId("...") });

// 3. 迁移chunk
sh.moveChunk("db.collection", { villageId: ObjectId("...") }, "shard2");
```

## 总结

数据库优化是一个持续的过程，需要：

1. **监控**: 持续监控性能指标
2. **分析**: 定期分析性能瓶颈
3. **优化**: 根据分析结果进行优化
4. **测试**: 验证优化效果
5. **迭代**: 重复以上过程

通过实施本文档中的最佳实践，智慧乡村项目的数据库性能将得到显著提升，能够支持更大规模的数据和更高的并发访问。

## 相关文档

- [MongoDB官方文档](https://docs.mongodb.com/)
- [项目架构文档](../ARCHITECTURE.md)
- [API文档](../docs/API.md)
- [部署指南](../docs/DEPLOYMENT.md)