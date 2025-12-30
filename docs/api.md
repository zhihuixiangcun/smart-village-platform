# 智慧乡村综合服务平台 - API文档

## 目录

- [API概述](#api概述)
- [认证方式](#认证方式)
- [通用规范](#通用规范)
- [核心API端点](#核心api端点)
- [响应格式](#响应格式)
- [错误码](#错误码)
- [接口示例](#接口示例)

---

## API概述

### 基础信息

| 项目 | 说明 |
|-----|------|
| API基础地址 | `http://localhost:3001/api/v1` (主服务)<br>`http://localhost:5000/api` (村务服务) |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 认证方式 | JWT Bearer Token |

### 双服务器API分配

```
主API服务器 (Port 3001)
├── /health                     - 健康检查
├── /api/v1/info               - 服务信息
├── /api/v1/realtime/*         - 实时计算
├── /api/v1/residents/*        - 村民管理
├── /api/v1/governance/*       - 村务治理
├── /api/v1/finance/*          - 财务管理
├── /api/v1/emergency/*        - 应急管理
├── /api/v1/ecommerce/*        - 电子商务
├── /api/v1/ai/*               - AI智能
├── /api/v1/government/*       - 政务服务
├── /api/monitoring/*          - 监控系统
└── /monitoring                - 监控仪表板

村务服务器 (Port 5000)
├── /health                     - 健康检查
├── /api/auth/*                - 认证授权
├── /api/announcements/*       - 公告管理
├── /api/suggestions/*         - 建议反馈
├── /api/qrcode/*              - 二维码服务
└── Socket.IO                  - 实时通信
```

---

## 认证方式

### JWT Token认证

大部分API需要在请求头中携带JWT Token：

```http
Authorization: Bearer <token>
```

### 获取Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "admin",
      "role": "admin",
      "villageId": "village_001"
    },
    "expiresIn": 604800
  }
}
```

---

## 通用规范

### 请求头

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
X-Request-ID: <uuid>
X-Village-ID: <village_id>
```

### 响应状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |
| 503 | 服务不可用 |

### 分页参数

```
GET /api/v1/residents?page=1&limit=20&sort=createdAt&order=desc
```

| 参数 | 类型 | 说明 |
|-----|------|------|
| page | Integer | 页码，默认1 |
| limit | Integer | 每页数量，默认20 |
| sort | String | 排序字段 |
| order | String | 排序方向：asc/desc |

---

## 核心API端点

### 1. 认证授权 API

#### 用户登录
```http
POST /api/v1/auth/login
```

**请求体**：
```json
{
  "username": "string",
  "password": "string",
  "villageId": "string (可选)"
}
```

#### 刷新Token
```http
POST /api/v1/auth/refresh
```

#### 用户登出
```http
POST /api/v1/auth/logout
```

#### 获取用户信息
```http
GET /api/v1/auth/me
```

---

### 2. 村民管理 API

#### 获取村民列表
```http
GET /api/v1/residents
```

**查询参数**：
```http
?page=1&limit=20&name=张&villageId=village_001&householdId=HH001
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "张三",
      "idCard": "110101********1234",
      "phone": "138****1234",
      "householdId": "HH001",
      "address": {
        "province": "北京市",
        "city": "北京市",
        "district": "朝阳区",
        "village": "幸福村",
        "detail": "1号院"
      },
      "familyType": "一般户",
      "tags": ["党员", "退役军人"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### 获取村民详情
```http
GET /api/v1/residents/:id
```

#### 创建村民
```http
POST /api/v1/residents
```

**请求体**：
```json
{
  "name": "张三",
  "idCard": "110101199001011234",
  "phone": "13800138000",
  "householdId": "HH001",
  "address": {
    "province": "北京市",
    "city": "北京市",
    "district": "朝阳区",
    "village": "幸福村",
    "detail": "1号院"
  },
  "familyType": "一般户",
  "tags": ["党员"]
}
```

#### 更新村民信息
```http
PUT /api/v1/residents/:id
```

#### 删除村民
```http
DELETE /api/v1/residents/:id
```

#### 批量导入村民
```http
POST /api/v1/batch-import/residents
Content-Type: multipart/form-data
```

**请求体**：
```
file: Excel文件
```

---

### 3. 村务治理 API

#### 获取公告列表
```http
GET /api/v1/governance/announcements
```

**查询参数**：
```http
?page=1&limit=20&priority=normal&villageId=village_001
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "关于召开村民代表大会的通知",
      "content": "经村委会研究决定...",
      "priority": "high",
      "status": "published",
      "author": {
        "id": "507f1f77bcf86cd799439011",
        "name": "村委会"
      },
      "attachments": [
        {
          "name": "会议议程.pdf",
          "url": "/uploads/attachments/xxx.pdf"
        }
      ],
      "readCount": 125,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

#### 发布公告
```http
POST /api/v1/governance/announcements
```

**请求体**：
```json
{
  "title": "公告标题",
  "content": "公告内容",
  "priority": "high",
  "villageId": "village_001",
  "attachments": ["file_id_1", "file_id_2"]
}
```

#### 获取投票列表
```http
GET /api/v1/governance/voting
```

#### 创建投票
```http
POST /api/v1/governance/voting
```

**请求体**：
```json
{
  "title": "村务决策投票",
  "description": "关于xxx事项的投票",
  "options": ["同意", "反对", "弃权"],
  "deadline": "2024-12-31T23:59:59Z",
  "anonymous": false
}
```

#### 投票
```http
POST /api/v1/governance/voting/:id/vote
```

---

### 4. 财务管理 API

#### 获取财务记录
```http
GET /api/v1/finance/records
```

**查询参数**：
```http
?page=1&limit=20&type=income&category=财政拨款&startDate=2024-01-01&endDate=2024-12-31
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "type": "income",
      "category": "财政拨款",
      "amount": 500000,
      "description": "年度财政拨款",
      "proof": {
        "type": "invoice",
        "number": "INV2024001",
        "url": "/uploads/proofs/xxx.pdf"
      },
      "approval": {
        "status": "approved",
        "approver": "张主任",
        "approvedAt": "2024-01-01T00:00:00Z"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 200
  }
}
```

#### 添加财务记录
```http
POST /api/v1/finance/records
```

**请求体**：
```json
{
  "type": "expense",
  "category": "基础设施",
  "amount": 50000,
  "description": "村内道路维修",
  "proofId": "file_id"
}
```

#### OCR识别票据
```http
POST /api/v1/finance/ocr
Content-Type: multipart/form-data
```

**请求体**：
```
file: 票据图片
```

**响应**：
```json
{
  "success": true,
  "data": {
    "type": "增值税普通发票",
    "number": "12345678",
    "date": "2024-01-01",
    "seller": "某某公司",
    "amount": 1000.00,
    "tax": 130.00,
    "total": 1130.00
  }
}
```

#### 获取财务报表
```http
GET /api/v1/finance/reports
```

**查询参数**：
```http
?type=monthly&year=2024&month=1
```

---

### 5. 应急管理 API

#### 获取应急事件列表
```http
GET /api/v1/emergency/events
```

**查询参数**：
```http
?status=pending&level=high&villageId=village_001
```

#### 上报应急事件
```http
POST /api/v1/emergency/events
```

**请求体**：
```json
{
  "type": "fire",
  "level": "high",
  "location": {
    "address": "幸福村1号院",
    "latitude": 39.9042,
    "longitude": 116.4074
  },
  "description": "发现火情，请求支援",
  "reporter": {
    "name": "张三",
    "phone": "13800138000"
  },
  "images": ["file_id_1", "file_id_2"]
}
```

#### 发送应急广播
```http
POST /api/v1/emergency/broadcast
```

**请求体**：
```json
{
  "villageId": "village_001",
  "type": "emergency",
  "message": "紧急通知：请村民立即撤离到安全地带",
  "priority": "critical"
}
```

#### 获取应急预案
```http
GET /api/v1/emergency/plans
```

---

### 6. 电子商务 API

#### 获取产品列表
```http
GET /api/v1/ecommerce/products
```

**查询参数**：
```http
?category=农产品&page=1&limit=20&sort=price&order=asc
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "有机苹果",
      "category": "农产品",
      "price": 10.5,
      "unit": "斤",
      "stock": 1000,
      "images": [
        "https://example.com/products/apple.jpg"
      ],
      "description": "本地种植的新鲜有机苹果",
      "supplier": {
        "id": "supplier_001",
        "name": "幸福村合作社"
      },
      "rating": 4.8,
      "salesCount": 500
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### 创建订单
```http
POST /api/v1/ecommerce/orders
```

**请求体**：
```json
{
  "items": [
    {
      "productId": "product_001",
      "quantity": 10,
      "price": 10.5
    }
  ],
  "deliveryAddress": {
    "name": "张三",
    "phone": "13800138000",
    "address": "幸福村1号院"
  },
  "remark": "请尽快发货"
}
```

#### 获取订单列表
```http
GET /api/v1/ecommerce/orders
```

---

### 7. 政务服务 API

#### 提交办事申请
```http
POST /api/v1/government/applications
```

**请求体**：
```json
{
  "serviceType": "证明开具",
  "serviceName": "居住证明",
  "applicant": {
    "name": "张三",
    "idCard": "110101199001011234",
    "phone": "13800138000"
  },
  "materials": ["file_id_1", "file_id_2"],
  "remark": "需要用于办理xx业务"
}
```

#### 获取政策列表
```http
GET /api/v1/government/policies
```

**查询参数**：
```http
?category=补贴政策&keyword=农业
```

#### 政策计算器
```http
POST /api/v1/policy-calculator/calculate
```

**请求体**：
```json
{
  "policyId": "policy_001",
  "params": {
    "householdSize": 4,
    "landArea": 10,
    "cropType": "水稻"
  }
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "policyName": "农业补贴政策",
    "result": {
      "subsidyAmount": 5000,
      "breakdown": [
        {"item": "种植补贴", "amount": 3000},
        {"item": "农机补贴", "amount": 2000}
      ]
    },
    "notes": "补贴将在30个工作日内发放"
  }
}
```

---

### 8. 村委管理 API

#### 获取村委成员列表
```http
GET /api/v1/committee/members
```

#### 获取值班表
```http
GET /api/v1/duty-schedule
```

**查询参数**：
```http
?startDate=2024-01-01&endDate=2024-01-31
```

#### 一键呼叫值班人员
```http
POST /api/v1/duty-schedule/call
```

**请求体**：
```json
{
  "scheduleId": "schedule_001",
  "reason": "紧急事件需要处理"
}
```

#### 获取村情地图
```http
GET /api/v1/village-map/data
```

---

### 9. 智能交互 API

#### AI智能问答
```http
POST /api/smart-interaction/chat
```

**请求体**：
```json
{
  "message": "如何申请农业补贴？",
  "context": {
    "userId": "user_001",
    "villageId": "village_001"
  }
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "answer": "您可以按以下步骤申请农业补贴...",
    "relatedPolicies": ["policy_001", "policy_002"],
    "suggestions": ["点击查看详情", "立即申请"]
  }
}
```

---

### 10. 实时计算 API

#### 获取实时系统状态
```http
GET /api/v1/realtime/status
```

**响应**：
```json
{
  "success": true,
  "data": {
    "status": {
      "healthy": true,
      "uptime": 86400
    },
    "metrics": {
      "system_cpu_usage": 45.2,
      "system_memory_usage": 68.5,
      "api_request_rate": 125.5,
      "api_response_time": 85.3,
      "data_processing_rate": 95.2
    },
    "alerts": [
      {
        "rule": "high_cpu_alert",
        "severity": "warning",
        "message": "CPU使用率超过80%"
      }
    ]
  }
}
```

#### 订阅实时事件 (SSE)
```http
GET /api/v1/realtime/subscribe
```

**事件类型**：
- `dataProcessed` - 数据处理完成
- `alertTriggered` - 预警触发
- `metricUpdated` - 指标更新
- `heartbeat` - 心跳检测

---

## 响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 分页响应
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## 错误码

| 错误码 | 说明 |
|-------|------|
| 1001 | 参数错误 |
| 1002 | 参数缺失 |
| 2001 | 未认证 |
| 2002 | Token过期 |
| 2003 | Token无效 |
| 3001 | 无权限 |
| 3002 | 资源不存在 |
| 3003 | 资源已存在 |
| 4001 | 操作失败 |
| 4002 | 数据验证失败 |
| 5001 | 服务器错误 |
| 5002 | 数据库错误 |
| 5003 | 外部服务错误 |

### 错误响应示例
```json
{
  "success": false,
  "error": {
    "code": 2001,
    "message": "未认证",
    "details": "请先登录"
  },
  "requestId": "uuid"
}
```

---

## 接口示例

### 完整请求示例

#### 1. 登录获取Token
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

#### 2. 使用Token访问API
```bash
curl -X GET http://localhost:3001/api/v1/residents \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Village-ID: village_001"
```

#### 3. 上传文件
```bash
curl -X POST http://localhost:3001/api/v1/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf"
```

#### 4. 订阅实时事件
```javascript
const eventSource = new EventSource('http://localhost:3001/api/v1/realtime/subscribe');

eventSource.addEventListener('dataProcessed', (event) => {
  const data = JSON.parse(event.data);
  console.log('Data processed:', data);
});

eventSource.addEventListener('alertTriggered', (event) => {
  const alert = JSON.parse(event.data);
  console.warn('Alert triggered:', alert);
});
```

---

## Socket.IO 事件

### 连接
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### 事件列表

#### 客户端发送事件

| 事件名 | 参数 | 说明 |
|-------|------|------|
| join-village | { villageId, userId } | 加入村庄房间 |
| leave-village | { villageId } | 离开村庄房间 |
| send-announcement | { villageId, announcement } | 发送公告 |
| emergency-broadcast | { villageId, emergency } | 应急广播 |
| submit-suggestion | { villageId, suggestion } | 提交建议 |
| village-message | { villageId, userId, message } | 发送消息 |

#### 服务器推送事件

| 事件名 | 数据 | 说明 |
|-------|------|------|
| joined-village | { villageId, room, onlineCount } | 加入成功 |
| new-announcement | { announcement } | 新公告通知 |
| emergency-alert | { emergency } | 应急警报 |
| new-suggestion | { suggestion } | 新建议通知 |
| user-joined | { userId, socketId } | 用户加入 |
| user-left | { userId, socketId } | 用户离开 |

---

## API限流

### 限流规则

| 用户类型 | 限制 |
|---------|------|
| 未认证用户 | 100次/小时 |
| 普通用户 | 1000次/小时 |
| 村委用户 | 5000次/小时 |
| 管理员 | 无限制 |

### 限流响应
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1609459200

{
  "success": false,
  "error": {
    "code": 429,
    "message": "请求过于频繁，请稍后再试"
  }
}
```

---

## OpenAPI文档

项目提供自动生成的OpenAPI文档：

- JSON格式: `GET /api/v1/docs`
- HTML格式: `GET /api/v1/docs.html`
- Postman集合: `GET /api/v1/postman`

---

本文档持续更新中...
