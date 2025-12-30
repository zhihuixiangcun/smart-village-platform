# 性能优化指南

## 概述

基于智能体分析，项目存在以下性能问题：
- N+1 查询问题 (影响 60-80%)
- 缺失数据库索引 (可提升 80-90%)
- 未优化的路由加载 (可提升 40-50%)

## P0 优化项

### 1. 数据库索引优化

#### 问题诊断

```bash
# 启用 MongoDB 查询分析
db.setProfilingLevel(2, { slowms: 100 })

# 查看慢查询
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

#### 必须添加的索引

```javascript
// src/models/User.js
userSchema.index({ villageId: 1, status: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });

// src/models/Resident.js
residentSchema.index({ villageId: 1, householdId: 1 });
residentSchema.index({ idCard: 1 });
residentSchema.index({ 'address.province': 1, 'address.city': 1 });

// src/models/Announcement.js
announcementSchema.index({ villageId: 1, publishedAt: -1, status: 1 });
announcementSchema.index({ targetAudience: 1, publishedAt: -1 });

// src/models/WorkPlan.js
workPlanSchema.index({ userId: 1, planDate: -1 });
workPlanSchema.index({ villageId: 1, planStatus: 1 });

// 文本搜索索引
announcementSchema.index({ title: 'text', content: 'text' });
residentSchema.index({ name: 'text', idCard: 'text' });
```

#### 索引创建脚本

```javascript
// scripts/create-indexes.js
const mongoose = require('mongoose');
const { User, Resident, Announcement, WorkPlan } = require('../src/models');

async function createIndexes() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log('创建索引...');

  await User.createIndexes();
  await Resident.createIndexes();
  await Announcement.createIndexes();
  await WorkPlan.createIndexes();

  console.log('索引创建完成');
  await mongoose.disconnect();
}

createIndexes().catch(console.error);
```

### 2. N+1 查询优化

#### 问题示例

```javascript
// ❌ N+1 查询问题
async function getAllResidentsWithVillages(villageId) {
  const residents = await Resident.find({ villageId }); // 1 次查询

  // 每个居民触发 1 次额外查询
  for (const resident of residents) {
    resident.household = await Household.findById(resident.householdId);
  }
  // 总查询次数: 1 + N 次
}
```

#### 解决方案：使用 populate

```javascript
// ✅ 使用 populate 优化
async function getAllResidentsWithVillages(villageId) {
  const residents = await Resident.find({ villageId })
    .populate('householdId', 'householdNumber address')
    .populate('userId', 'name phone')
    .lean(); // 只返回普通对象，更快

  // 总查询次数: 2 次 (residents + households)
  return residents;
}
```

#### 解决方案：批量查询

```javascript
// ✅ 批量查询优化
async function getAllResidentsWithHouseholds(villageId) {
  const residents = await Resident.find({ villageId }).lean();

  // 一次性获取所有 household
  const householdIds = residents.map(r => r.householdId);
  const households = await Household.find({
    _id: { $in: householdIds }
  }).lean();

  // 创建映射
  const householdMap = new Map(
    households.map(h => [h._id.toString(), h])
  );

  // 组装数据
  return residents.map(r => ({
    ...r,
    household: householdMap.get(r.householdId?.toString())
  }));
}
```

#### 解决方案：使用聚合管道

```javascript
// ✅ 使用 $lookup 聚合
async function getResidentsWithHouseholdsAggregation(villageId) {
  const results = await Resident.aggregate([
    { $match: { villageId: mongoose.Types.ObjectId(villageId) } },
    {
      $lookup: {
        from: 'households',
        localField: 'householdId',
        foreignField: '_id',
        as: 'household'
      }
    },
    { $unwind: '$household' },
    {
      $project: {
        name: 1,
        idCard: 1,
        'household.householdNumber': 1,
        'household.address': 1
      }
    }
  ]);

  return results;
}
```

### 3. 分页优化

#### 添加游标分页

```javascript
// 传统偏移分页
async function getResidentsOffset(page, limit) {
  const skip = (page - 1) * limit;
  return await Resident.find()
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
}

// 游标分页（更适合大数据集）
async function getResidentsCursor(lastId, limit) {
  const query = {};
  if (lastId) {
    query._id = { $gt: lastId };
  }

  return await Resident.find(query)
    .sort({ _id: 1 })
    .limit(limit + 1); // 多取一个用于判断是否有下一页
}
```

## P1 优化项

### 4. 响应数据优化

#### 使用 lean()

```javascript
// ❌ 返回完整 Mongoose 文档
const users = await User.find({ villageId });
// 每个用户包含完整的 Mongoose 内部方法

// ✅ 使用 lean() 返回普通对象
const users = await User.find({ villageId }).lean();
// 性能提升 30-50%
```

#### 选择性字段

```javascript
// ❌ 查询所有字段
const users = await User.find({ villageId });

// ✅ 只选择需要的字段
const users = await User.find({ villageId })
  .select('name phone villageId status')
  .lean();
```

### 5. 缓存策略

#### Redis 缓存示例

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10分钟

async function getCachedResidents(villageId) {
  const cacheKey = `residents:${villageId}`;

  // 检查缓存
  let residents = cache.get(cacheKey);
  if (residents) {
    console.log('缓存命中');
    return residents;
  }

  // 查询数据库
  residents = await Resident.find({ villageId })
    .populate('householdId')
    .lean();

  // 写入缓存
  cache.set(cacheKey, residents);

  return residents;
}

// 更新时清除缓存
async function updateResident(id, updates) {
  const resident = await Resident.findByIdAndUpdate(id, updates);
  cache.del(`residents:${resident.villageId}`);
  return resident;
}
```

### 6. 查询结果计数优化

```javascript
// ❌ 使用 countDocuments() 慢
const total = await User.countDocuments({ villageId });

// ✅ 使用 estimatedDocumentCount() 快
const total = await User.estimatedDocumentCount();

// ⚠️ 精确计数但优化
const [results, count] = await Promise.all([
  User.find({ villageId }).skip(20).limit(10),
  User.countDocuments({ villageId })
]);
```

## P2 优化项

### 7. 前端代码分割

```javascript
// 路由懒加载
const DashboardView = () => import('@/views/DashboardView.vue');
const WorkPlanView = () => import('@/views/workPlan/WorkPlanView.vue');

// 组件懒加载
const HeavyComponent = defineAsyncComponent(() =>
  import('@/components/HeavyComponent.vue')
);
```

### 8. 图片优化

```javascript
// 响应式图片
<img
  :src="imageUrl"
  :srcset="`${imageUrl}@2x 2x, ${imageUrl}@3x 3x`"
  loading="lazy"
/>

// 使用 WebP 格式
const getOptimizedImageUrl = (url) => {
  return url.replace(/\.(jpg|png)$/, '.webp');
};
```

### 9. WebSocket 连接池

```javascript
// 连接复用
class WebSocketManager {
  constructor() {
    this.connections = new Map();
  }

  getConnection(userId) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new WebSocketConnection(userId));
    }
    return this.connections.get(userId);
  }
}
```

## 监控和诊断

### 性能监控

```javascript
const perf = require('performance-n');

// 记录函数执行时间
async function monitoredFunction() {
  const end = perf.timer('myFunction');

  try {
    // 业务逻辑
  } finally {
    end();
  }
}

// MongoDB 查询监控
mongoose.set('debug', (collectionName, method, query, doc) => {
  const start = Date.now();
  return () => {
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn(`慢查询: ${collectionName}.${method} (${duration}ms)`, query);
    }
  };
});
```

### APM 集成

推荐工具：
- **New Relic** - 全栈监控
- **DataDog** - 基础设施监控
- **Sentry** - 错误追踪
- **MongoDB Atlas** - 内置性能分析

## 性能基准

### 目标指标

| 指标 | 当前值 | 目标值 | 提升 |
|-----|--------|--------|------|
| API 响应时间 (P95) | ~800ms | <200ms | 75% ⬇️ |
| 数据库查询时间 | ~300ms | <50ms | 83% ⬇️ |
| 页面首次加载 | ~5s | <2s | 60% ⬇️ |
| 并发用户数 | ~100 | >500 | 5x ⬆️ |

### 测试脚本

```javascript
// benchmarks/api-benchmark.js
const autocannon = require('autocannon');

async function benchmarkAPI() {
  const result = await autocannon({
    url: 'http://localhost:3001/api/v1/residents',
    connections: 100,
    duration: 30,
    pipelining: 1
  });

  console.log('请求/秒:', result.requests.mean);
  console.log('延迟 (P95):', result.latency.p95);
  console.log('错误率:', result.errors);
}
```

## 实施计划

### Week 1: 数据库优化
- [ ] 添加所有必要索引
- [ ] 修复 N+1 查询
- [ ] 实施查询结果缓存

### Week 2: API 优化
- [ ] 优化响应数据结构
- [ ] 实施游标分页
- [ ] 添加速率限制

### Week 3: 前端优化
- [ ] 代码分割
- [ ] 图片懒加载
- [ ] 虚拟滚动

### Week 4: 监控和调优
- [ ] 部署 APM 工具
- [ ] 建立性能基准
- [ ] 持续优化

## 参考资源

- [MongoDB Performance Best Practices](https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/)
- [Node.js Performance Optimization](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Vite Performance](https://vitejs.dev/guide/build.html#load-splitting)
