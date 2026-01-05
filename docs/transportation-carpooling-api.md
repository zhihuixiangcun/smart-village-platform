# 交通和拼车服务 API 文档

## 概述

本文档描述了智慧乡村平台的交通服务和拼车服务 API。这些 API 为采购商和村民提供便捷的交通查询和拼车服务。

---

## 交通服务 API

### 1. 获取附近交通站点

**端点:** `GET /api/v1/transportation/nearby`

**描述:** 根据经纬度获取附近的机场、火车站、汽车站等交通站点。

**查询参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| longitude | Number | 是 | 经度 |
| latitude | Number | 是 | 纬度 |
| radius | Number | 否 | 搜索半径（公里），默认20 |
| type | String | 否 | 类型筛选（flight/train/bus） |

**请求示例:**
```bash
GET /api/v1/transportation/nearby?longitude=116.4074&latitude=39.9042&radius=50&type=train
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "67890abcdef12345",
      "type": "train",
      "stationName": "北京南站",
      "code": "BXP",
      "location": {
        "type": "Point",
        "coordinates": [116.3782, 39.8654]
      },
      "address": "北京市永外大街车站路",
      "phone": "010-51849272",
      "distance": 5.2,
      "facilities": ["候车室", "餐厅", "便利店"],
      "rating": {
        "average": 4.5,
        "count": 120
      }
    }
  ],
  "total": 1
}
```

---

### 2. 获取交通站点详情

**端点:** `GET /api/v1/transportation/:id`

**描述:** 获取指定交通站点的详细信息和有效班次。

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 站点ID |

**请求示例:**
```bash
GET /api/v1/transportation/67890abcdef12345
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "_id": "67890abcdef12345",
    "type": "train",
    "stationName": "北京南站",
    "code": "BXP",
    "address": "北京市永外大街车站路",
    "phone": "010-51849272",
    "facilities": ["候车室", "餐厅", "便利店"],
    "schedules": [
      {
        "id": "G101",
        "departureTime": "2025-01-10T09:00:00Z",
        "arrivalTime": "2025-01-10T13:30:00Z",
        "price": 553,
        "availableSeats": 1000,
        "origin": "北京南",
        "destination": "上海虹桥",
        "status": "on_time"
      }
    ]
  }
}
```

---

### 3. 搜索班次

**端点:** `GET /api/v1/transportation/schedules/search`

**描述:** 根据出发地、目的地、日期等条件搜索班次。

**查询参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| origin | String | 否* | 起点 |
| destination | String | 否* | 终点 |
| date | String | 是 | 出发日期（YYYY-MM-DD） |
| type | String | 否 | 类型（flight/train/bus） |
| minPrice | Number | 否 | 最低价格 |
| maxPrice | Number | 否 | 最高价格 |

*注：origin 和 destination 至少提供一个

**请求示例:**
```bash
GET /api/v1/transportation/schedules/search?origin=北京南&destination=上海虹桥&date=2025-01-10&type=train&minPrice=400&maxPrice=600
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "station": {
        "_id": "67890abcdef12345",
        "type": "train",
        "stationName": "北京南站",
        "code": "BXP"
      },
      "schedules": [
        {
          "id": "G101",
          "departureTime": "2025-01-10T09:00:00Z",
          "arrivalTime": "2025-01-10T13:30:00Z",
          "price": 553,
          "availableSeats": 1000,
          "origin": "北京南",
          "destination": "上海虹桥"
        }
      ]
    }
  ],
  "total": 1
}
```

---

### 4. 根据站点代码搜索

**端点:** `GET /api/v1/transportation/code/:code`

**描述:** 根据站点代码（如机场IATA代码、火车站代码）搜索站点。

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| code | String | 是 | 站点代码 |

**查询参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| type | String | 否 | 类型（flight/train/bus） |

**请求示例:**
```bash
GET /api/v1/transportation/code/PEK?type=flight
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "_id": "12345abcdef67890",
    "type": "flight",
    "stationName": "北京首都国际机场",
    "code": "PEK",
    "address": "北京市朝阳区首都机场路",
    "phone": "010-96158"
  }
}
```

---

### 5. 获取站点统计信息

**端点:** `GET /api/v1/transportation/:id/stats`

**描述:** 获取指定站点的统计信息，包括今日班次数、平均价格等。

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 站点ID |

**请求示例:**
```bash
GET /api/v1/transportation/67890abcdef12345/stats
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "totalSchedules": 150,
    "todaySchedules": 45,
    "activeSchedules": 42,
    "averagePrice": 485.5,
    "rating": {
      "average": 4.5,
      "count": 120
    },
    "facilities": ["候车室", "餐厅", "便利店"],
    "services": ["WiFi", "充电桩", "行李寄存"]
  }
}
```

---

### 6. 获取站点班次列表

**端点:** `GET /api/v1/transportation/:id/schedules`

**描述:** 获取指定站点的班次列表，支持按目的地和日期筛选。

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 站点ID |

**查询参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| destination | String | 否 | 目的地筛选 |
| date | String | 否 | 日期筛选（YYYY-MM-DD） |

**请求示例:**
```bash
GET /api/v1/transportation/67890abcdef12345/schedules?destination=上海虹桥&date=2025-01-10
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "station": {
      "_id": "67890abcdef12345",
      "type": "train",
      "stationName": "北京南站",
      "code": "BXP",
      "address": "北京市永外大街车站路"
    },
    "schedules": [
      {
        "id": "G101",
        "departureTime": "2025-01-10T09:00:00Z",
        "arrivalTime": "2025-01-10T13:30:00Z",
        "price": 553,
        "availableSeats": 1000,
        "origin": "北京南",
        "destination": "上海虹桥",
        "status": "on_time"
      }
    ],
    "total": 1
  }
}
```

---

## 拼车服务 API

### 1. 发布拼车信息

**端点:** `POST /api/v1/carpooling/publish`

**描述:** 发布拼车信息（车主或乘客）。

**认证:** 需要登录

**请求体:**
```json
{
  "type": "driver",
  "origin": {
    "address": "北京市朝阳区国贸",
    "location": {
      "type": "Point",
      "coordinates": [116.4582, 39.9124]
    },
    "landmark": "国贸大厦"
  },
  "destination": {
    "address": "天津市和平区天津站",
    "location": {
      "type": "Point",
      "coordinates": [117.2103, 39.1350]
    },
    "landmark": "天津站"
  },
  "departureTime": "2025-01-10T08:00:00Z",
  "seats": 4,
  "availableSeats": 3,
  "price": 100,
  "pricingType": "fixed",
  "vehicleInfo": {
    "brand": "大众",
    "model": "帕萨特",
    "color": "黑色",
    "plateNumber": "京A12345",
    "year": 2020
  },
  "requirements": "禁止吸烟，禁止携带宠物",
  "notes": "明天早上8点准时出发，过时不候",
  "allowPets": false,
  "allowSmoking": false,
  "genderPreference": "any",
  "route": "highway"
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| type | String | 是 | 拼车类型（driver=车主，passenger=乘客） |
| origin | Object | 是 | 起点（包含地址和坐标） |
| destination | Object | 是 | 终点（包含地址和坐标） |
| departureTime | Date | 是 | 出发时间 |
| seats | Number | 是 | 总座位数 |
| availableSeats | Number | 是 | 可用座位数 |
| price | Number | 是 | 价格（元） |
| pricingType | String | 否 | 定价类型（fixed=固定，negotiable=可协商，shared=分摊） |
| vehicleInfo | Object | 条件 | 车辆信息（车主必填） |
| requirements | String | 否 | 乘车要求 |
| notes | String | 否 | 备注 |
| allowPets | Boolean | 否 | 是否允许宠物 |
| allowSmoking | Boolean | 否 | 是否允许吸烟 |
| genderPreference | String | 否 | 性别偏好（any/male_only/female_only） |
| route | String | 否 | 路线类型（highway=高速，normal=普通，scenic=景观路） |

**响应示例:**
```json
{
  "success": true,
  "message": "发布成功",
  "data": {
    "_id": "abcdef1234567890",
    "type": "driver",
    "status": "pending",
    "departureTime": "2025-01-10T08:00:00Z",
    "availableSeats": 3,
    "price": 100
  }
}
```

---

### 2. 搜索拼车信息

**端点:** `GET /api/v1/carpooling/search`

**描述:** 根据条件搜索附近的拼车信息。

**查询参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| origin | String | 否 | 起点坐标JSON [lng, lat] |
| destination | String | 否 | 终点坐标JSON [lng, lat] |
| departureDate | String | 否 | 出发日期（YYYY-MM-DD） |
| type | String | 否 | 类型（driver/passenger） |
| minPrice | Number | 否 | 最低价格 |
| maxPrice | Number | 否 | 最高价格 |
| minSeats | Number | 否 | 最小座位数 |
| gender | String | 否 | 性别偏好 |
| page | Number | 否 | 页码，默认1 |
| limit | Number | 否 | 每页数量，默认20 |

**请求示例:**
```bash
GET /api/v1/carpooling/search?origin=[116.4582,39.9124]&destination=[117.2103,39.1350]&departureDate=2025-01-10&type=driver&minSeats=1
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "abcdef1234567890",
      "type": "driver",
      "origin": {
        "address": "北京市朝阳区国贸",
        "landmark": "国贸大厦"
      },
      "destination": {
        "address": "天津市和平区天津站",
        "landmark": "天津站"
      },
      "departureTime": "2025-01-10T08:00:00Z",
      "seats": 4,
      "availableSeats": 3,
      "price": 100,
      "vehicleInfo": {
        "brand": "大众",
        "model": "帕萨特",
        "color": "黑色",
        "plateNumber": "京A12345"
      },
      "status": "active",
      "userId": {
        "name": "张三",
        "avatar": "https://example.com/avatar.jpg",
        "phone": "138****1234",
        "rating": 4.8
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### 3. 加入拼车

**端点:** `POST /api/v1/carpooling/:id/join`

**描述:** 乘客申请加入拼车。

**认证:** 需要登录

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 拼车ID |

**请求体:**
```json
{
  "name": "李四",
  "phone": "13900139000",
  "seats": 1,
  "pickupLocation": {
    "address": "北京市朝阳区大望路",
    "location": {
      "type": "Point",
      "coordinates": [116.4752, 39.9088]
    }
  }
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "申请已提交，等待车主确认"
}
```

---

### 4. 确认乘客

**端点:** `PUT /api/v1/carpooling/:id/confirm`

**描述:** 车主确认乘客的加入申请。

**认证:** 需要登录（仅车主）

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 拼车ID |

**请求体:**
```json
{
  "passengerId": "passenger123456"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "已确认乘客"
}
```

---

### 5. 取消拼车

**端点:** `DELETE /api/v1/carpooling/:id/cancel`

**描述:** 取消拼车（车主取消整个拼车，乘客退出拼车）。

**认证:** 需要登录

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 拼车ID |

**请求体:**
```json
{
  "reason": "临时有事，无法出发"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "拼车已取消"
}
```

---

### 6. 评价拼车

**端点:** `POST /api/v1/carpooling/:id/rate`

**描述:** 对已完成的拼车进行评价。

**认证:** 需要登录

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 拼车ID |

**请求体:**
```json
{
  "rating": 5,
  "comment": "非常好的车主，准时出发，驾驶平稳，态度友好！"
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| rating | Number | 是 | 评分（1-5） |
| comment | String | 否 | 评价内容 |

**响应示例:**
```json
{
  "success": true,
  "message": "评价成功"
}
```

---

### 7. 获取拼车详情

**端点:** `GET /api/v1/carpooling/:id`

**描述:** 获取拼车详细信息。

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 拼车ID |

**响应示例:**
```json
{
  "success": true,
  "data": {
    "_id": "abcdef1234567890",
    "type": "driver",
    "origin": {
      "address": "北京市朝阳区国贸",
      "landmark": "国贸大厦"
    },
    "destination": {
      "address": "天津市和平区天津站",
      "landmark": "天津站"
    },
    "departureTime": "2025-01-10T08:00:00Z",
    "seats": 4,
    "availableSeats": 2,
    "price": 100,
    "vehicleInfo": {
      "brand": "大众",
      "model": "帕萨特",
      "color": "黑色",
      "plateNumber": "京A12345"
    },
    "status": "active",
    "requirements": "禁止吸烟，禁止携带宠物",
    "userId": {
      "name": "张三",
      "avatar": "https://example.com/avatar.jpg",
      "phone": "138****1234",
      "rating": 4.8
    },
    "passengers": [
      {
        "userId": {
          "name": "李四",
          "avatar": "https://example.com/avatar2.jpg",
          "phone": "139****5678"
        },
        "seats": 1,
        "status": "confirmed",
        "joinedAt": "2025-01-09T10:30:00Z"
      }
    ],
    "rating": {
      "average": 4.8,
      "count": 25
    },
    "viewCount": 156
  }
}
```

---

### 8. 获取用户拼车历史

**端点:** `GET /api/v1/carpooling/history`

**描述:** 获取当前用户的拼车历史记录。

**认证:** 需要登录

**查询参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| status | String | 否 | 状态筛选 |
| type | String | 否 | 类型筛选（driver/passenger） |
| page | Number | 否 | 页码，默认1 |
| limit | Number | 否 | 每页数量，默认20 |

**请求示例:**
```bash
GET /api/v1/carpooling/history?status=completed&type=driver&page=1&limit=10
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "abcdef1234567890",
      "type": "driver",
      "origin": {
        "address": "北京市朝阳区国贸"
      },
      "destination": {
        "address": "天津市和平区天津站"
      },
      "departureTime": "2025-01-05T08:00:00Z",
      "seats": 4,
      "price": 100,
      "status": "completed",
      "completedAt": "2025-01-05T12:00:00Z"
    }
  ],
  "total": 1
}
```

---

### 9. 更新拼车状态

**端点:** `PUT /api/v1/carpooling/:id/status`

**描述:** 车主更新拼车状态（激活或完成）。

**认证:** 需要登录（仅车主）

**路径参数:**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | String | 是 | 拼车ID |

**请求体:**
```json
{
  "status": "active"
}
```

**字段说明:**
| 值 | 描述 |
|------|------|
| active | 激活拼车（开始接受乘客申请） |
| completed | 完成拼车（行程结束） |

**响应示例:**
```json
{
  "success": true,
  "message": "状态更新成功",
  "data": {
    "_id": "abcdef1234567890",
    "status": "active"
  }
}
```

---

## 错误码说明

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权（需要登录） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**错误响应示例:**
```json
{
  "success": false,
  "message": "请提供经纬度坐标"
}
```

---

## 注意事项

1. **地理坐标格式:** 所有地理位置使用 GeoJSON 格式 `[longitude, latitude]`（经度在前，纬度在后）
2. **日期格式:** 所有日期使用 ISO 8601 格式 `YYYY-MM-DDTHH:mm:ssZ`
3. **认证:** 拼车服务的部分端点需要登录认证，请在请求头中携带认证令牌
4. **分页:** 所有列表接口支持分页，默认每页20条记录
5. **隐私保护:** 用户手机号等敏感信息会部分隐藏（如 `138****1234`）
