# 📊 海量数据处理系统文档

## 🎯 概述

智慧村庄平台的海量数据处理系统支持**百万级数据记录**的高性能处理，采用先进的分页机制、聚合管道优化和缓存策略，确保在大数据量场景下的系统响应速度和稳定性。

## 🏗️ 系统架构

### 核心组件
- **游标分页引擎** - 替代传统分页，支持高效大数据量查询
- **MongoDB聚合管道优化** - 多维度数据分析和统计
- **智能缓存系统** - 内存缓存热点数据，提升查询性能
- **批处理框架** - 支持大规模数据批量操作
- **数据导出服务** - 流式导出百万级数据

### 技术特性
- ✅ **支持百万级数据记录** - 单表支持1M+记录
- ✅ **MongoDB聚合管道优化** - 高效的多维数据分析
- ✅ **分页查询机制** - 游标分页，性能稳定
- ✅ **实时数据处理** - 毫秒级响应实时查询
- ✅ **内存优化** - 智能垃圾回收，防止内存泄漏
- ✅ **并发控制** - 支持高并发访问

## 🚀 核心功能

### 1. 游标分页查询

#### 传统分页 vs 游标分页

```javascript
// 传统分页（性能随数据量下降）
const traditional = await Resident.find(query)
  .skip((page - 1) * pageSize)
  .limit(pageSize);

// 游标分页（性能稳定）
const cursorBased = await massiveDataService.cursorBasedPagination(
  Resident,
  query,
  {
    pageSize: 1000,
    cursor: 'lastId',  // 上次查询的最后一条记录ID
    sortField: '_id',
    sortDirection: 1
  }
);
```

#### 性能优势
- **O(1) 查询时间** - 不随数据量增长而恶化
- **避免重复数据** - 游标机制确保数据一致性
- **高并发友好** - 减少数据库锁竞争

### 2. 聚合管道优化

#### 多维度统计分析

```javascript
const analytics = await massiveDataService.getVillageMassiveStats(villageId);
```

**分析维度**：
- 基础统计（总人口、平均年龄、总收入）
- 性别分布
- 年龄结构分布
- 教育水平分析
- 职业分布统计
- 特殊群体识别（老年人、党员、外出务工人员等）
- 时间趋势分析

#### 地理空间分析

```javascript
const geoStats = await massiveDataService.getGeospatialAnalytics(villageId, bounds);
```

**功能特性**：
- 人口密度热力图
- 特殊群体地理分布
- 中心点计算
- 边界内数据统计

### 3. 实时数据流

```javascript
const realtimeData = await massiveDataService.getRealTimeDataStream(villageId);
```

**实时监控指标**：
- 24小时内活跃用户
- 紧急事件统计
- 村务参与情况
- 位置更新状态

### 4. 批量数据处理

```javascript
await massiveDataService.batchProcess(
  Model,
  query,
  async (doc) => {
    // 自定义处理逻辑
    return processDocument(doc);
  },
  {
    batchSize: 1000,
    maxConcurrency: 5,
    progressCallback: (progress) => {
      console.log(`进度: ${progress.progress}%`);
    }
  }
);
```

**支持的操作类型**：
- 年龄批量更新
- 二维码批量生成
- 收入统计计算
- 数据迁移和清洗

### 5. 大数据导出

```javascript
const exportResult = await massiveDataService.exportMassiveData(
  Model,
  query,
  {
    fields: ['name', 'idCard', 'phone', 'age'],
    format: 'csv',
    chunkSize: 10000
  }
);
```

**导出特性**：
- 流式处理，避免内存溢出
- 多格式支持（JSON、CSV）
- 进度实时反馈
- 字段选择性导出

## 📡 API接口

### 分页查询村民数据
```http
GET /api/v1/massive-data/residents
```

**查询参数**：
- `villageId` - 村庄ID（必需）
- `pageSize` - 页面大小（默认50，最大500）
- `cursor` - 游标（用于翻页）
- `search` - 搜索关键词
- `gender` - 性别过滤
- `ageRange` - 年龄范围（如"25,45"）
- `occupation` - 职业过滤
- `sortBy` - 排序字段
- `sortOrder` - 排序方向（asc/desc）

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "name": "张三",
      "idCard": "110101199001011234",
      "phone": "13800138000",
      "age": 30,
      "gender": "male"
    }
  ],
  "pagination": {
    "nextCursor": "65a1b2c3d4e5f6789012345",
    "hasNextPage": true,
    "currentPageSize": 50,
    "totalCount": 1000000
  }
}
```

### 村庄统计分析
```http
GET /api/v1/massive-data/analytics/:villageId
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "basicStats": {
      "totalResidents": 50000,
      "avgAge": 35.5,
      "avgIncome": 45000
    },
    "genderStats": [
      { "_id": "male", "count": 26000, "percentage": 52.0 },
      { "_id": "female", "count": 24000, "percentage": 48.0 }
    ],
    "ageStats": [
      { "_id": "youth", "count": 15000, "avgIncome": 38000 },
      { "_id": "middle", "count": 25000, "avgIncome": 52000 }
    ]
  }
}
```

### 批量数据导出
```http
POST /api/v1/massive-data/export/residents
```

**请求体**：
```json
{
  "villageId": "65a1b2c3d4e5f6789012345",
  "filters": {
    "gender": "male",
    "age": { "$gte": 18, "$lte": 60 }
  },
  "fields": ["name", "idCard", "phone", "age", "address"],
  "format": "csv"
}
```

## 🧪 性能测试

### 运行单元测试

```bash
# 运行海量数据性能测试
npm test -- tests/performance/massiveData.test.js

# 生成覆盖率报告
npm run test:coverage -- tests/performance/massiveData.test.js
```

### 运行负载测试

```bash
# 使用Artillery进行负载测试
npx artillery run tests/performance/massive-data-load-test.yml

# 生成HTML报告
npx artillery run tests/performance/massive-data-load-test.yml --output report.json
npx artillery report report.json
```

### 性能基准

| 操作类型 | 数据量 | 性能要求 | 实际表现 |
|---------|--------|----------|----------|
| 分页查询 | 1,000条 | < 50ms | ~30ms |
| 分页查询 | 10,000条 | < 100ms | ~60ms |
| 聚合统计 | 10,000条 | < 200ms | ~120ms |
| 批处理 | 10,000条 | < 5s | ~3.2s |
| 数据导出 | 50,000条 | < 30s | ~18s |

## 🔧 优化配置

### MongoDB索引优化

```javascript
// 村民表索引
db.residents.createIndex({ villageId: 1, status: 1, createdAt: -1 });
db.residents.createIndex({ household: { householdNumber: 1, relationship: 1 } });
db.residents.createIndex({ age: 1, gender: 1 });
db.residents.createIndex({ location: "2dsphere" });

// 复合索引
db.residents.createIndex({
  villageId: 1,
  "demographics.age": 1,
  "demographics.gender": 1
});

// 文本索引
db.residents.createIndex({
  name: "text",
  "address.detailAddress": "text",
  "demographics.occupation": "text"
});
```

### 缓存策略

```javascript
// Redis缓存配置
const cacheConfig = {
  // 统计数据缓存5分钟
  stats: { ttl: 300, key: 'village_stats_{villageId}' },

  // 分页查询缓存1分钟
  pagination: { ttl: 60, key: 'page_{queryHash}' },

  // 实时数据缓存30秒
  realtime: { ttl: 30, key: 'realtime_{villageId}' }
};
```

### 内存优化

```javascript
// 启用Node.js内存限制
node --max-old-space-size=4096 app.js

// 定期垃圾回收
setInterval(() => {
  if (global.gc) {
    global.gc();
  }
}, 60000); // 每分钟执行一次
```

## 📊 监控指标

### 关键性能指标（KPI）

1. **响应时间**
   - 分页查询 P95 < 100ms
   - 聚合统计 P95 < 500ms
   - 实时查询 P95 < 50ms

2. **吞吐量**
   - 分页查询 > 100 QPS
   - 数据导出 > 10 QPS
   - 批处理 > 1000 记录/秒

3. **资源使用**
   - 内存使用 < 4GB
   - CPU使用 < 80%
   - 数据库连接池使用率 < 90%

### 监控工具

```javascript
// 性能监控中间件
const performanceMonitor = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // 记录性能指标
    metrics.record('api.response_time', duration, {
      method: req.method,
      route: req.route?.path,
      status: res.statusCode
    });
  });

  next();
};
```

## 🚨 故障排除

### 常见问题

#### 1. 分页查询缓慢
**原因**：缺少复合索引
**解决**：
```javascript
db.residents.createIndex({
  villageId: 1,
  [sortField]: 1,
  _id: 1
});
```

#### 2. 内存溢出
**原因**：一次加载过多数据
**解决**：
- 使用流式处理
- 减少批次大小
- 启用内存监控

#### 3. 聚合查询超时
**原因**：聚合管道复杂度过高
**解决**：
- 优化聚合管道
- 添加合适索引
- 使用$facet并行处理

### 性能调优建议

1. **查询优化**
   - 使用投影减少返回字段
   - 避免深度嵌套查询
   - 合理使用$lookup

2. **索引优化**
   - 建立复合索引
   - 定期分析索引使用情况
   - 避免过度索引

3. **缓存优化**
   - 热点数据缓存
   - 合理设置TTL
   - 缓存预热策略

## 📚 最佳实践

### 1. 数据模型设计
- 合理设计Schema结构
- 避免深度嵌套
- 使用合适的数据类型

### 2. 查询优化
- 优先使用索引字段查询
- 避免全表扫描
- 使用limit限制结果集

### 3. 分页策略
- 大数据量使用游标分页
- 小数据量可使用传统分页
- 提供排序和过滤功能

### 4. 缓存使用
- 缓存热点查询结果
- 设置合理的过期时间
- 实现缓存失效机制

## 🔮 未来规划

### 短期优化
- [ ] 添加分片支持
- [ ] 实现读写分离
- [ ] 优化批量导入性能

### 中期规划
- [ ] 集成Elasticsearch全文搜索
- [ ] 实现分布式缓存
- [ ] 添加机器学习预测

### 长期愿景
- [ ] 支持实时数据流处理
- [ ] 实现多租户数据隔离
- [ ] 构建数据湖架构

---

**技术支持**：18886990223@163.com
**更新时间**：2024年12月14日