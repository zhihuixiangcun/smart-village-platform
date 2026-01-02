# 智慧乡村综合服务平台 API 文档

## 📖 概述

智慧乡村综合服务平台提供完整的乡村数字化管理API，包括村民管理、村务治理、财务管理、应急管理、电子商务、社交功能、拼车服务等。

### 基础信息

| 项目 | 说明 |
|------|------|
| **Base URL** | `http://localhost:3001/api/v1` (主服务) |
| **认证方式** | JWT Bearer Token |
| **响应格式** | JSON |
| **字符编码** | UTF-8 |

### 统一响应格式

#### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

---

## 🔐 认证相关

### 用户登录
```http
POST /auth/login
```

**请求体**
```json
{
  "username": "user001",
  "password": "password123"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "user001",
      "role": "villager"
    }
  }
}
```

---

## 🏠 村民管理

### 获取村民列表
```http
GET /residents
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| villageId | string | 否 | 村庄ID |
| search | string | 否 | 搜索关键词 |

**响应**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "张三",
      "phone": "138****1234",
      "address": "xx村1组",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

## 💬 朋友圈服务

### 发布动态
```http
POST /social/posts
```

**请求头**
```
Authorization: Bearer {token}
```

**请求体**
```json
{
  "villageId": "507f1f77bcf86cd799439011",
  "postType": "image",
  "content": {
    "text": "今天村里真热闹！",
    "images": [
      {
        "url": "/uploads/images/img001.jpg",
        "thumbnail": "/uploads/thumbnails/thumb001.jpg",
        "width": 1920,
        "height": 1080
      }
    ]
  },
  "tags": ["乡村生活", "农业"],
  "category": "daily",
  "visibility": "public"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "username": "user001",
      "name": "张三"
    },
    "content": {
      "text": "今天村里真热闹！"
    },
    "interactions": {
      "likes": 0,
      "comments": 0,
      "shares": 0,
      "views": 0
    },
    "createdAt": "2025-12-30T10:00:00.000Z"
  },
  "message": "动态发布成功"
}
```

### 获取动态列表
```http
GET /social/posts
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| villageId | string | 否 | 村庄ID |
| category | string | 否 | 分类：daily, agriculture, news等 |
| tags | string | 否 | 标签，逗号分隔 |
| page | number | 否 | 页码 |
| limit | number | 否 | 每页数量 |

### 点赞动态
```http
POST /social/posts/:id/like
```

### 添加评论
```http
POST /social/posts/:id/comments
```

**请求体**
```json
{
  "content": "真不错！",
  "parentCommentId": null,
  "replyToUserId": null
}
```

---

## 🚗 拼车服务

### 发布拼车
```http
POST /carpool/trips
```

**请求体**
```json
{
  "villageId": "507f1f77bcf86cd799439011",
  "route": {
    "origin": {
      "address": "杭州市余杭区",
      "coordinates": [120.1, 30.2],
      "time": "2025-12-31T08:00:00.000Z"
    },
    "destination": {
      "address": "杭州市西湖区",
      "coordinates": [120.15, 30.25]
    }
  },
  "seats": {
    "total": 4,
    "pricePerSeat": 30
  },
  "vehicle": {
    "brand": "大众",
    "model": "朗逸",
    "color": "白色",
    "plateNumber": "浙A12345"
  },
  "rules": {
    "allowPets": false,
    "childFriendly": true
  }
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "driver": {
      "id": "507f1f77bcf86cd799439011",
      "username": "driver001"
    },
    "route": {
      "origin": { ... },
      "destination": { ... },
      "distance": 25.5
    },
    "seats": {
      "total": 4,
      "available": 4,
      "pricePerSeat": 30
    },
    "status": "open"
  }
}
```

### 智能匹配拼车
```http
POST /carpool/match
```

**请求体**
```json
{
  "origin": { "lng": 120.1, "lat": 30.2 },
  "destination": { "lng": 120.15, "lat": 30.25 },
  "departureTime": "2025-12-31T08:00:00.000Z",
  "seats": 1
}
```

### 查找附近拼车
```http
GET /carpool/nearby
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| longitude | number | 是 | 经度 |
| latitude | number | 是 | 纬度 |
| maxDistance | number | 否 | 最大距离(km) |
| seats | number | 否 | 需要座位数 |

---

## 🌾 农技AI服务 (Python)

> Base URL: `http://localhost:8000/api/v2/agriculture`

### 作物智能推荐
```http
POST /recommend-crops
```

**请求体**
```json
{
  "region": "浙江省杭州市",
  "soil_type": "水稻土",
  "season": "春季",
  "area_size": 10.5,
  "water_availability": "高",
  "budget_range": [5000, 10000]
}
```

**响应**
```json
{
  "success": true,
  "recommendations": [
    {
      "crop": "水稻",
      "variety": "超级稻",
      "variety_code": "ZHEYOU8",
      "expected_yield": "600kg/亩",
      "confidence": 0.92,
      "reasoning": {
        "soil_match": true,
        "season_match": true,
        "water_match": true,
        "region_match": true,
        "growth_period_days": 120
      }
    }
  ],
  "market_outlook": {
    "trend": "稳定",
    "price_forecast": "预计与去年持平"
  }
}
```

### 病虫害识别
```http
POST /identify-pest
```

**请求体**
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "crop_type": "水稻",
  "region": "浙江省",
  "growth_stage": "抽穗期"
}
```

**响应**
```json
{
  "success": true,
  "identification": {
    "name": "二化螟",
    "type": "pest",
    "scientific_name": "Chilo suppressalis",
    "confidence": 0.95,
    "severity": "moderate"
  },
  "treatment": {
    "chemical": [
      {
        "name": "氯虫苯甲酰胺",
        "dosage": "10-20ml/亩",
        "effectiveness": 95
      }
    ],
    "biological": [
      {
        "name": "赤眼蜂",
        "method": "放蜂",
        "effectiveness": 75
      }
    ]
  },
  "prevention": [
    "适时田水管理",
    "清除田边杂草"
  ]
}
```

### 政策补贴计算
```http
POST /calculate-subsidy
```

**请求体**
```json
{
  "household_size": 4,
  "land_area": 15,
  "crop_types": ["水稻", "小麦"],
  "region": "浙江省",
  "income_level": "middle"
}
```

**响应**
```json
{
  "success": true,
  "subsidies": [
    {
      "policy_name": "耕地地力保护补贴",
      "amount": 1800.00,
      "requirements": [
        "拥有耕地承包权",
        "耕地不撂荒"
      ]
    },
    {
      "policy_name": "实际种粮补贴",
      "amount": 1500.00
    }
  ],
  "total_amount": 3300.00,
  "application_guide": {
    "documents_needed": [
      "身份证复印件",
      "土地承包合同"
    ],
    "deadline": "每年6月30日前申请"
  }
}
```

---

## 🔗 区块链存证服务 (Go)

> Base URL: `http://localhost:9000/api/v1/blockchain`

### 创建存证记录
```http
POST /records
```

**请求体**
```json
{
  "record_type": "financial",
  "related_id": "txn_12345",
  "village_id": "village_001",
  "data": {
    "amount": 50000,
    "category": "基础设施",
    "description": "村路修建",
    "date": "2025-12-30"
  },
  "created_by": "user_001",
  "tags": ["财务", "基础设施"],
  "is_encrypted": false
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "record_type": "financial",
    "data_hash": "0xabc123...",
    "ipfs_hash": "QmXxx...",
    "transaction_hash": "0xdef456...",
    "block_number": 12345678,
    "is_verified": true
  },
  "message": "数据已上链存证"
}
```

### 验证存证
```http
GET /records/:id/verify
```

**响应**
```json
{
  "success": true,
  "valid": true,
  "record": { ... },
  "verified": true,
  "verify_time": 1703950800
}
```

---

## 📊 数据模型

### SocialPost 朋友圈动态
| 字段 | 类型 | 说明 |
|------|------|------|
| villageId | ObjectId | 村庄ID |
| author | ObjectId | 作者ID |
| postType | String | 内容类型：text/image/video/article/live/share |
| content | Object | 内容数据 |
| interactions | Object | 互动数据 |
| tags | Array | 标签 |
| category | String | 分类 |
| status | String | 状态 |
| visibility | String | 可见性 |
| createdAt | Date | 创建时间 |

### CarpoolTrip 拼车行程
| 字段 | 类型 | 说明 |
|------|------|------|
| villageId | ObjectId | 村庄ID |
| driver | ObjectId | 司机ID |
| route | Object | 路线信息 |
| seats | Object | 座位信息 |
| vehicle | Object | 车辆信息 |
| costSplit | Object | 费用分摊 |
| status | String | 状态 |
| passengers | Array | 乘客列表 |

---

## 🔒 错误码

| 错误码 | 说明 |
|--------|------|
| `UNAUTHORIZED` | 未授权 |
| `FORBIDDEN` | 禁止访问 |
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | 参数验证失败 |
| `INTERNAL_ERROR` | 服务器内部错误 |

---

## 📝 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0.0 | 2025-12-30 | 初始版本，包含朋友圈、拼车、农技AI、区块链服务 |
