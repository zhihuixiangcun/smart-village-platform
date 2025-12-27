# 数据库索引优化方案

## 当前问题

### 严重问题模型
| 模型 | 总索引数 | 字段索引 | 复合索引 | 问题 |
|------|----------|----------|----------|------|
| **Product** | 40 | 18 | 22 | 🔴 索引过多，严重影响写入性能 |
| **EmergencyResponse** | 20 | 10 | 9 | 🔴 索引过多 |
| **Finance** | 23 | 3 | 20 | 🔴 复合索引过多 |
| **Emergency** | 27 | 13 | 13 | 🔴 索引过多 |
| **EmergencyResource** | 15 | 8 | 6 | 🟡 索引较多 |
| **FaceRecognition** | 18 | 5 | 13 | 🟡 复合索引较多 |

### 需要优化的模型（字段索引>5）
- AuditLog (6)
- FamilyProxyAuditLog (12)
- FamilyProxySession (7)
- FarmProductSupply (6)
- MessageLog (10)
- Notification (7)
- Order (6)
- PaymentRecord (10)
- Resident (7)
- Task (7)
- VillageCollaboration (8)

## 优化策略

### 1. Product模型索引优化（优先级：P0）
**问题**：40个索引严重影响写入性能
**方案**：
- 移除不常用的单字段索引
- 合并相似复合索引
- 仅保留查询最频繁的索引

**保留索引**：
```javascript
// 必需索引
productId: { type: String, unique: true, index: true },
name: { type: String, index: true },
category: { type: String, index: true },
shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
ownerId: { type: mongoose.Schema.Types.ObjectId, index: true },
status: { type: String, enum: ['active', 'inactive', 'out_of_stock'], index: true },

// 关键复合索引
ProductSchema.index({ shopId: 1, status: 1, createdAt: -1 });
ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ ownerId: 1, status: 1 });
```

### 2. 移除重复索引定义
**问题**：字段同时定义了 `index: true` 和 `schema.index()`
**方案**：使用 `schema.index()` 方式，保留注释说明

### 3. 复合索引优化原则
- 遵循 ESR (Equality, Sort, Range) 原则
- 等值字段在前，排序字段在中，范围字段在后
- 限制复合索引字段数量 ≤ 5

### 4. 地理空间索引优化
- 确保使用 `2dsphere` 而非 `2d`
- 复合索引中地理字段放在最后

## 实施计划

### Phase 1: 紧急优化（立即执行）
1. **Product模型**：减少到15个索引以内
2. **EmergencyResponse模型**：减少到10个索引以内
3. **Finance模型**：优化复合索引结构

### Phase 2: 常规优化（1周内）
1. 修复所有重复索引定义
2. 优化AuditLog、Notification等高频写入模型
3. 添加索引监控

### Phase 3: 监控和维护（持续）
1. 添加查询性能监控
2. 定期审查慢查询日志
3. 动态调整索引配置

## 监控指标

```javascript
// 索引使用率统计
db.collection.aggregate([
  { $indexStats: {} }
]);

// 慢查询分析
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

## 验证方法

```bash
# 检查索引数量
node -e "require('./src/models'); const mongoose = require('mongoose'); console.log(Object.keys(mongoose.models).length);"

# 分析索引
mongosh "mongodb://localhost:27017/smartvillage" --eval "db.getCollectionNames().forEach(c => { print(c + ': ' + db[c].getIndexes().length); })"
```
