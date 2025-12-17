# 消息模板系统 REST API 设计规范

## 🎯 API概述

为智慧乡村通知服务的消息模板系统提供标准化的REST API接口，支持模板管理、消息发送、批量处理等核心功能。

## 🌐 API基础信息

- **基础URL**: `http://localhost:3001/api/v1/notifications`
- **认证方式**: JWT Token (Bearer Token)
- **数据格式**: JSON
- **字符编码**: UTF-8
- **API版本**: v1

## 📋 API端点规范

### 1. 模板管理 (Template Management)

#### 1.1 获取所有模板
```
GET /api/v1/notifications/templates
```
**描述**: 获取系统中所有可用的消息模板列表

**响应示例**:
```json
{
  "status": "success",
  "message": "模板列表获取成功",
  "data": {
    "templates": [
      {
        "id": "emergency_typhoon",
        "name": "台风预警",
        "category": "emergency",
        "description": "台风天气预警通知模板",
        "priority": "urgent",
        "channels": ["sms", "push", "broadcast"],
        "variableCount": 4,
        "hasConditions": false,
        "dialectSupport": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 6
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 1.2 按类别获取模板
```
GET /api/v1/notifications/templates?category={category}
```
**查询参数**:
- `category`: emergency, announcement, service, agriculture, weather, health, event, maintenance

#### 1.3 获取单个模板详情
```
GET /api/v1/notifications/templates/{templateId}
```
**路径参数**:
- `templateId`: 模板唯一标识符

**响应示例**:
```json
{
  "status": "success", 
  "data": {
    "template": {
      "id": "emergency_typhoon",
      "name": "台风预警",
      "category": "emergency", 
      "content": "🌪️【紧急通知】{{village.name}}：台风\"{{typhoon.name}}\"即将影响我村...",
      "variables": ["village.name", "typhoon.name", "typhoon.arrivalTime", "contact.emergency"],
      "conditions": [],
      "channels": ["sms", "push", "broadcast"],
      "priority": "urgent",
      "dialectSupport": true,
      "formatting": {
        "emoji": "🚨",
        "maxLength": 200
      }
    }
  }
}
```

#### 1.4 创建自定义模板
```
POST /api/v1/notifications/templates
```
**请求体**:
```json
{
  "templateId": "custom_water_outage",
  "template": {
    "name": "停水通知",
    "category": "service",
    "description": "停水维修通知模板",
    "content": "🚰【停水通知】{{village.name}}村民注意：因{{reason}}，定于{{date}}{{time}}停水{{duration}}。",
    "priority": "high",
    "channels": ["sms", "push"],
    "variables": ["village.name", "reason", "date", "time", "duration"],
    "dialectSupport": true,
    "formatting": {
      "emoji": "🚰",
      "maxLength": 200
    },
    "tags": ["公共设施", "维修"]
  }
}
```

#### 1.5 更新模板
```
PUT /api/v1/notifications/templates/{templateId}
```

#### 1.6 删除模板
```
DELETE /api/v1/notifications/templates/{templateId}
```

### 2. 模板预览 (Template Preview)

#### 2.1 预览模板渲染结果
```
POST /api/v1/notifications/templates/{templateId}/preview
```
**请求体**:
```json
{
  "data": {
    "village": { "name": "幸福村" },
    "typhoon": { 
      "name": "海燕",
      "arrivalTime": "今晚8点"
    },
    "contact": { "emergency": "110" }
  },
  "options": {
    "dialect": "四川话"
  }
}
```

**响应示例**:
```json
{
  "status": "success",
  "data": {
    "preview": {
      "message": "🌪️【紧急通知】幸福村：台风\"海燕\"即将影响我村，预计今晚8点抵达...",
      "templateInfo": {
        "id": "emergency_typhoon",
        "category": "emergency",
        "priority": "urgent",
        "channels": ["sms", "push", "broadcast"]
      },
      "metadata": {
        "renderedAt": "2024-01-15T10:30:00.000Z",
        "dataUsed": ["village.name", "typhoon.name", "typhoon.arrivalTime"],
        "dialect": "四川话"
      }
    }
  }
}
```

### 3. 消息发送 (Message Sending)

#### 3.1 单个模板消息发送
```
POST /api/v1/notifications/send
```
**请求体**:
```json
{
  "templateId": "emergency_typhoon",
  "data": {
    "village": { "name": "幸福村" },
    "typhoon": { "name": "海燕", "arrivalTime": "今晚8点" },
    "contact": { "emergency": "110" }
  },
  "recipients": {
    "phone": "13800138000",
    "email": "villager@example.com",
    "deviceToken": "fcm_token_123",
    "dialect": "四川话"
  },
  "options": {
    "priority": "urgent",
    "scheduleTime": null
  }
}
```

**响应示例**:
```json
{
  "status": "success",
  "message": "模板通知发送完成",
  "data": {
    "notificationId": "notify_1642234567890_abc123",
    "templateId": "emergency_typhoon",
    "renderedMessage": "🌪️【紧急通知】幸福村：台风\"海燕\"即将影响我村...",
    "channels": ["sms", "push"],
    "results": [
      {
        "channel": "sms",
        "success": true,
        "messageId": "sms_123456",
        "cost": 0.05
      },
      {
        "channel": "push", 
        "success": true,
        "messageId": "push_789012"
      }
    ],
    "totalSent": 2,
    "totalFailed": 0,
    "sentAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 3.2 批量模板消息发送
```
POST /api/v1/notifications/send/batch
```
**请求体**:
```json
{
  "templateId": "announcement_meeting",
  "commonData": {
    "village": { "name": "和谐村" },
    "meeting": {
      "date": "2024年3月15日",
      "time": "晚上7点",
      "location": "村委会",
      "agenda": "讨论春节活动"
    }
  },
  "recipients": [
    {
      "id": "user1",
      "contact": { "phone": "13800138001" },
      "data": { "user": { "name": "张三" } },
      "dialect": "普通话"
    },
    {
      "id": "user2",
      "contact": { "phone": "13800138002" }, 
      "data": { "user": { "name": "李四" } },
      "dialect": "四川话"
    }
  ]
}
```

### 4. 消息历史 (Message History)

#### 4.1 获取发送历史
```
GET /api/v1/notifications/history?page=1&limit=20&type=template_notification&startDate=2024-01-01&endDate=2024-01-31
```
**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页条数 (默认: 20，最大: 100)
- `type`: 消息类型 (sms, email, push, broadcast, template_notification)
- `startDate`: 开始日期
- `endDate`: 结束日期
- `templateId`: 模板ID过滤

#### 4.2 获取消息统计
```
GET /api/v1/notifications/stats
```
**响应示例**:
```json
{
  "status": "success",
  "data": {
    "stats": {
      "total": 1250,
      "byType": {
        "sms": 800,
        "email": 200,
        "push": 250
      },
      "byDay": {
        "2024-01-15": 45,
        "2024-01-14": 38
      },
      "successRate": {
        "sms": { "total": 800, "success": 776, "rate": "97.00%" },
        "email": { "total": 200, "success": 198, "rate": "99.00%" },
        "push": { "total": 250, "success": 240, "rate": "96.00%" }
      }
    }
  }
}
```

### 5. 广播通知 (Broadcast)

#### 5.1 发送广播通知
```
POST /api/v1/notifications/broadcast
```
**请求体**:
```json
{
  "templateId": "emergency_typhoon",
  "data": {
    "village": { "name": "全体村民" },
    "typhoon": { "name": "海燕", "arrivalTime": "今晚8点" }
  },
  "options": {
    "villageId": "village_123",
    "userRole": "all",
    "channels": ["sms", "push", "email"],
    "emergency": true
  }
}
```

### 6. 定时发送 (Scheduled Notifications)

#### 6.1 创建定时通知
```
POST /api/v1/notifications/schedule
```
**请求体**:
```json
{
  "templateId": "announcement_meeting",
  "data": { "村民大会数据..." },
  "recipients": { "接收人信息..." },
  "scheduledTime": "2024-01-20T19:00:00.000Z",
  "options": {
    "timezone": "Asia/Shanghai"
  }
}
```

#### 6.2 获取定时任务列表
```
GET /api/v1/notifications/scheduled
```

#### 6.3 取消定时任务
```
DELETE /api/v1/notifications/scheduled/{scheduleId}
```

## 🔒 错误响应规范

所有API错误都遵循统一格式：

```json
{
  "status": "error",
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "指定的模板不存在",
    "details": "Template 'non_existent_template' was not found in the system",
    "field": "templateId"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_1642234567890_xyz789"
}
```

### 常见错误代码
- `TEMPLATE_NOT_FOUND` (404): 模板不存在
- `INVALID_TEMPLATE_DATA` (400): 无效的模板数据  
- `VALIDATION_ERROR` (400): 请求参数验证失败
- `SEND_FAILED` (500): 消息发送失败
- `RATE_LIMIT_EXCEEDED` (429): 请求频率超限
- `UNAUTHORIZED` (401): 未授权访问
- `INSUFFICIENT_PRIVILEGES` (403): 权限不足

## 🔐 认证和权限

### JWT Token认证
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 权限级别
- `template:read` - 查看模板
- `template:write` - 创建/编辑模板  
- `template:delete` - 删除模板
- `notification:send` - 发送通知
- `notification:broadcast` - 广播通知
- `notification:schedule` - 定时通知

## 📊 API限流

- **普通用户**: 100请求/15分钟
- **高级用户**: 500请求/15分钟  
- **系统管理员**: 1000请求/15分钟

## 🔄 API版本控制

- 当前版本: `v1`
- 版本标识: URL路径中包含版本号 `/api/v1/`
- 向后兼容: 保持至少2个主版本的兼容性

## 📝 使用示例

### JavaScript/Node.js 示例
```javascript
const axios = require('axios');

// 发送模板消息
async function sendTemplateMessage() {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/notifications/send', {
      templateId: 'emergency_typhoon',
      data: {
        village: { name: '幸福村' },
        typhoon: { name: '海燕', arrivalTime: '今晚8点' },
        contact: { emergency: '110' }
      },
      recipients: {
        phone: '13800138000',
        dialect: '四川话'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('发送成功:', response.data);
  } catch (error) {
    console.error('发送失败:', error.response.data);
  }
}
```

### cURL 示例
```bash
# 获取所有模板
curl -X GET "http://localhost:3001/api/v1/notifications/templates" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 发送模板消息
curl -X POST "http://localhost:3001/api/v1/notifications/send" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "emergency_typhoon",
    "data": {
      "village": {"name": "幸福村"},
      "typhoon": {"name": "海燕", "arrivalTime": "今晚8点"}
    },
    "recipients": {
      "phone": "13800138000"
    }
  }'
```

## 🎯 设计原则

1. **RESTful设计**: 遵循REST架构原则
2. **统一响应格式**: 所有API采用统一的JSON响应格式  
3. **错误处理**: 提供详细的错误信息和错误代码
4. **安全性**: 支持JWT认证和细粒度权限控制
5. **性能**: 支持分页、限流和缓存
6. **可扩展性**: 支持API版本控制和向后兼容

---
*API设计文档 v1.0*  
*更新时间: 2024年01月15日*