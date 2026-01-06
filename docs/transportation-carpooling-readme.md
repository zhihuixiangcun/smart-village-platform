# 智慧乡村项目 - 交通和拼车服务模块

## 概述

本模块为智慧乡村平台新增的交通和拼车服务功能，为采购商和村民提供便捷的出行服务。

---

## 功能特性

### 交通服务
- **附近站点查询**: 基于地理位置查找附近的机场、火车站、汽车站
- **班次搜索**: 根据出发地、目的地、日期搜索班次
- **站点详情**: 查看站点详细信息和实时班次
- **站点统计**: 获取站点的统计信息（今日班次、平均价格等）
- **代码搜索**: 支持通过机场代码、火车站代码快速查找

### 拼车服务
- **发布拼车**: 车主和乘客都可以发布拼车信息
- **智能搜索**: 基于地理位置、时间、价格等多维度搜索
- **在线加入**: 乘客在线申请加入拼车
- **状态管理**: 支持待定、激活、完成、取消等状态
- **评价系统**: 完成后可对拼车进行评价
- **消息通知**: 拼车状态变更时自动发送通知

---

## 技术实现

### 数据模型

#### Transportation (交通服务)
- 支持三种类型：flight（机场）、train（火车）、bus（汽车）
- 使用 MongoDB 地理空间索引进行附近查询
- 包含班次、设施、服务等详细信息
- 支持实时状态更新

#### Carpooling (拼车服务)
- 支持车主和乘客两种类型
- 包含起点、终点的详细地址和坐标
- 车辆信息管理（品牌、型号、颜色、车牌）
- 乘客列表管理（状态追踪）
- 评价和评分系统

### 核心功能

#### 地理空间查询
使用 MongoDB 的 `$near` 和 `$geoWithin` 操作符实现高效的位置查询：

```javascript
// 查找附近的交通站点
const stations = await Transportation.find({
  location: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      $maxDistance: maxDistance
    }
  }
});
```

#### 数据验证
所有输入数据都经过严格的验证，确保数据完整性和安全性：

```javascript
// 验证拼车数据
_validateCarpoolData(data) {
  if (!data.origin?.location) {
    throw new Error('请提供起点信息');
  }
  // ... 更多验证
}
```

#### 错误处理
完善的错误处理机制，提供清晰的错误信息：

```javascript
try {
  const result = await service.publishCarpool(userId, data);
  return res.json({ success: true, data: result });
} catch (error) {
  logger.error('操作失败:', error);
  return res.status(400).json({
    success: false,
    message: error.message
  });
}
```

---

## API 端点

### 交通服务路由

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/transportation/nearby` | 获取附近交通站点 |
| GET | `/api/v1/transportation/:id` | 获取站点详情 |
| GET | `/api/v1/transportation/:id/stats` | 获取站点统计 |
| GET | `/api/v1/transportation/:id/schedules` | 获取站点班次 |
| GET | `/api/v1/transportation/schedules/search` | 搜索班次 |
| GET | `/api/v1/transportation/code/:code` | 根据代码搜索 |

### 拼车服务路由

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/v1/carpooling/publish` | 发布拼车 | 是 |
| GET | `/api/v1/carpooling/search` | 搜索拼车 | 否 |
| GET | `/api/v1/carpooling/:id` | 获取详情 | 否 |
| GET | `/api/v1/carpooling/history` | 拼车历史 | 是 |
| POST | `/api/v1/carpooling/:id/join` | 加入拼车 | 是 |
| PUT | `/api/v1/carpooling/:id/confirm` | 确认乘客 | 是 |
| PUT | `/api/v1/carpooling/:id/status` | 更新状态 | 是 |
| DELETE | `/api/v1/carpooling/:id/cancel` | 取消拼车 | 是 |
| POST | `/api/v1/carpooling/:id/rate` | 评价拼车 | 是 |

---

## 文件结构

```
src/
├── models/
│   ├── Transportation.js      # 交通服务数据模型
│   └── Carpooling.js          # 拼车服务数据模型
├── services/
│   ├── transportationService.js  # 交通服务业务逻辑
│   └── carpoolingService.js      # 拼车服务业务逻辑
├── controllers/
│   ├── transportationController.js  # 交通服务控制器
│   └── carpoolingController.js      # 拼车服务控制器
├── routes/
│   ├── transportationRoutes.js  # 交通服务路由
│   └── carpoolingRoutes.js      # 拼车服务路由
└── app.js                       # 主应用文件（已注册路由）

tests/
└── integration/
    ├── transportation.test.js   # 交通服务测试
    └── carpooling.test.js       # 拼车服务测试

docs/
└── transportation-carpooling-api.md  # API 文档
```

---

## 使用示例

### 1. 查询附近交通站点

```javascript
// 前端代码示例
const longitude = 116.4074;
const latitude = 39.9042;
const radius = 50; // 50公里

const response = await fetch(
  `/api/v1/transportation/nearby?longitude=${longitude}&latitude=${latitude}&radius=${radius}&type=train`
);

const result = await response.json();
console.log('附近的火车站:', result.data);
```

### 2. 发布拼车信息

```javascript
// 前端代码示例
const carpoolData = {
  type: 'driver',
  origin: {
    address: '北京市朝阳区国贸',
    location: {
      type: 'Point',
      coordinates: [116.4582, 39.9124]
    }
  },
  destination: {
    address: '天津市和平区',
    location: {
      type: 'Point',
      coordinates: [117.2009, 39.0841]
    }
  },
  departureTime: '2025-01-10T08:00:00Z',
  seats: 4,
  availableSeats: 3,
  price: 100,
  vehicleInfo: {
    brand: '大众',
    model: '帕萨特',
    color: '黑色',
    plateNumber: '京A12345'
  }
};

const response = await fetch('/api/v1/carpooling/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(carpoolData)
});

const result = await response.json();
console.log('发布结果:', result);
```

### 3. 搜索拼车

```javascript
// 前端代码示例
const params = new URLSearchParams({
  origin: JSON.stringify([116.4582, 39.9124]),
  destination: JSON.stringify([117.2009, 39.0841]),
  departureDate: '2025-01-10',
  type: 'driver',
  minSeats: 1,
  page: 1,
  limit: 20
});

const response = await fetch(`/api/v1/carpooling/search?${params}`);
const result = await response.json();
console.log('搜索结果:', result.data);
```

---

## 测试

运行测试以验证功能：

```bash
# 运行所有测试
npm test

# 运行交通服务测试
npm test -- tests/integration/transportation.test.js

# 运行拼车服务测试
npm test -- tests/integration/carpooling.test.js
```

---

## 数据库索引

为确保查询性能，已创建以下索引：

### Transportation 索引
```javascript
// 地理空间索引
{ location: '2dsphere' }

// 复合索引
{ type: 1, isActive: 1 }

// 文本索引
{ stationName: 'text', code: 'text', address: 'text' }
```

### Carpooling 索引
```javascript
// 地理空间索引
{ 'origin.location': '2dsphere' }
{ 'destination.location': '2dsphere' }

// 复合索引
{ status: 1, departureTime: 1 }
{ userId: 1, status: 1 }
{ type: 1, status: 1, departureTime: 1 }
```

---

## 安全考虑

1. **认证授权**: 拼车服务的敏感操作需要登录认证
2. **数据验证**: 所有输入数据都经过严格的验证
3. **隐私保护**: 用户敏感信息（如手机号）会部分隐藏
4. **错误处理**: 完善的错误处理，避免暴露敏感信息
5. **日志记录**: 所有操作都记录日志，便于审计和调试

---

## 性能优化

1. **地理空间索引**: 使用 MongoDB 的 2dsphere 索引加速位置查询
2. **分页**: 所有列表接口都支持分页，避免一次性返回大量数据
3. **缓存**: 可以考虑对热点数据进行缓存
4. **查询优化**: 使用投影只返回需要的字段

---

## 扩展性

本模块设计时考虑了良好的扩展性：

1. **支持更多交通类型**: 可以轻松扩展支持地铁、公交等
2. **多语言支持**: 框架支持 i18n 国际化
3. **支付集成**: 可以集成支付系统实现在线支付
4. **实时通信**: 可以集成 WebSocket 实现实时消息推送
5. **AI 匹配**: 可以引入 AI 算法进行智能拼车匹配

---

## 维护和更新

### 定期维护任务
1. 清理过期的拼车记录
2. 更新交通站点数据
3. 分析用户反馈，优化功能
4. 监控系统性能

### 版本更新
遵循语义化版本控制（Semantic Versioning）：
- 主版本号：不兼容的 API 修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

---

## 联系方式

如有问题或建议，请联系开发团队。

---

**最后更新**: 2025-01-05
**版本**: 1.0.0
