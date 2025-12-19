# 智慧乡村平台 API 设计标准与开发指南

## 一、设计原则

### 1. RESTful 设计原则
- **资源导向**：API应围绕资源设计，使用名词而非动词
- **统一接口**：使用标准的HTTP方法（GET、POST、PUT、DELETE、PATCH）
- **无状态**：每个请求包含处理所需的所有信息
- **可缓存**：响应应明确标识是否可缓存
- **分层系统**：客户端无需知道是否直接连接到服务器

### 2. URL 设计规范
```
# 基础格式
https://api.smartvillage.com/api/v1/{resource}/{id}/{sub-resource}

# 示例
GET    /api/v1/users                          # 获取用户列表
GET    /api/v1/users/{id}                     # 获取特定用户
POST   /api/v1/users                          # 创建用户
PUT    /api/v1/users/{id}                     # 更新用户
DELETE /api/v1/users/{id}                     # 删除用户
GET    /api/v1/users/{id}/permissions         # 获取用户权限
```

### 3. 命名约定
- **URL路径**：使用小写字母、连字符分隔
- **查询参数**：使用驼峰命名（camelCase）
- **JSON字段**：使用驼峰命名（camelCase）
- **常量**：使用大写字母、下划线分隔

## 二、响应格式标准

### 1. 统一响应结构
```json
{
  "success": true,                           // 必需：请求是否成功
  "data": {},                               // 成功时：返回的数据
  "message": "操作成功",                     // 可选：消息说明
  "code": "SUCCESS",                        // 可选：业务代码
  "timestamp": "2025-01-01T00:00:00Z",     // 必需：时间戳
  "requestId": "550e8400-e29b-41d4-a716"   // 必需：请求ID
}
```

### 2. 错误响应结构
```json
{
  "success": false,
  "error": "详细错误信息",
  "code": "ERROR_CODE",
  "details": {
    "field": "具体错误字段",
    "reason": "错误原因"
  },
  "timestamp": "2025-01-01T00:00:00Z",
  "requestId": "550e8400-e29b-41d4-a716"
}
```

### 3. 分页响应结构
```json
{
  "success": true,
  "data": {
    "items": [],                            // 数据列表
    "pagination": {
      "page": 1,                            // 当前页码
      "limit": 20,                          // 每页数量
      "total": 100,                         // 总记录数
      "totalPages": 5,                      // 总页数
      "hasNext": true,                      // 是否有下一页
      "hasPrev": false                      // 是否有上一页
    }
  }
}
```

## 三、HTTP状态码使用规范

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功，无返回内容 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或认证失败 |
| 403 | Forbidden | 已认证但无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable Entity | 请求格式正确但语义错误 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |
| 502 | Bad Gateway | 网关错误 |
| 503 | Service Unavailable | 服务不可用 |

## 四、认证与授权

### 1. 认证方式
```bash
# JWT Bearer Token
Authorization: Bearer <jwt_token>

# API Key（用于服务间调用）
X-API-Key: <api_key>

# 村庄ID（多租户支持）
X-Village-Id: <village_id>
```

### 2. JWT Token 结构
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "iat": 1640995200,
    "exp": 1641081600,
    "scope": "read write",
    "villageId": "village_001"
  }
}
```

### 3. 权限模型
```json
{
  "userId": "user_001",
  "role": "village_admin",
  "permissions": [
    "users:read",
    "users:write",
    "finance:read",
    "announcements:write"
  ],
  "dataScope": {
    "villageIds": ["village_001"],
    "departments": ["admin", "finance"]
  }
}
```

## 五、数据验证规范

### 1. 输入验证
- **类型验证**：确保数据类型正确
- **格式验证**：邮箱、电话、身份证等格式
- **业务规则验证**：如年龄范围、金额限制等
- **安全验证**：防止SQL注入、XSS攻击

### 2. 验证示例
```javascript
// 请求体验证规则
{
  "username": {
    "type": "string",
    "minLength": 3,
    "maxLength": 50,
    "pattern": "^[a-zA-Z0-9_]+$",
    "required": true
  },
  "email": {
    "type": "string",
    "format": "email",
    "required": true
  },
  "age": {
    "type": "integer",
    "minimum": 0,
    "maximum": 150
  }
}
```

## 六、API版本管理

### 1. 版本策略
- **URI版本控制**：`/api/v1/`, `/api/v2/`
- **向后兼容**：新版本保持对旧版本的兼容
- **废弃通知**：提前6个月通知API废弃
- **迁移指南**：提供版本迁移文档

### 2. 版本响应头
```http
API-Version: v1.0.0
Supported-Versions: v1, v2
Deprecated-Versions: v0
```

## 七、限流与安全策略

### 1. 限流规则
```yaml
# 默认限流
default:
  requests: 1000
  window: 15m
  strategy: sliding_window

# 认证接口
auth:
  requests: 10
  window: 1m
  strategy: fixed_window

# 文件上传
file-upload:
  requests: 50
  window: 1h
  strategy: token_bucket
```

### 2. 安全措施
- **HTTPS强制**：所有API必须使用HTTPS
- **CORS配置**：严格的跨域资源共享配置
- **输入过滤**：过滤危险字符和SQL注入
- **输出脱敏**：敏感数据自动脱敏
- **请求签名**：关键API需要请求签名

## 八、文件上传规范

### 1. 上传限制
- **文件大小**：单个文件最大50MB
- **支持格式**：jpg, jpeg, png, gif, pdf, doc, docx, xls, xlsx
- **存储位置**：云存储（阿里云OSS或腾讯云COS）
- **加密方式**：AES-256加密存储

### 2. 上传接口示例
```javascript
// 单文件上传
POST /api/v1/upload
Content-Type: multipart/form-data

{
  "file": <binary>,
  "type": "avatar|document|invoice",
  "category": "string"
}

// 响应
{
  "success": true,
  "data": {
    "fileId": "file_001",
    "fileName": "avatar.jpg",
    "fileSize": 1024000,
    "fileUrl": "https://cdn.example.com/files/avatar.jpg",
    "thumbnailUrl": "https://cdn.example.com/thumbnails/avatar.jpg"
  }
}
```

## 九、缓存策略

### 1. 缓存控制头
```http
# 强缓存
Cache-Control: public, max-age=3600

# 协商缓存
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT

# 不缓存
Cache-Control: no-cache, no-store, must-revalidate
```

### 2. 缓存策略
- **静态资源**：缓存1年
- **API数据**：根据数据更新频率设置
- **用户数据**：短时间缓存或实时获取
- **配置数据**：长期缓存，主动失效

## 十、日志与监控

### 1. 日志格式
```json
{
  "timestamp": "2025-01-01T00:00:00Z",
  "level": "INFO",
  "requestId": "550e8400-e29b-41d4-a716",
  "method": "POST",
  "path": "/api/v1/users",
  "status": 201,
  "duration": 125,
  "userId": "user_001",
  "ip": "192.168.1.1",
  "userAgent": "SmartVillageApp/1.0",
  "message": "用户创建成功"
}
```

### 2. 监控指标
- **请求量**：QPS、并发数
- **响应时间**：P50、P95、P99
- **错误率**：4xx、5xx错误占比
- **资源使用**：CPU、内存、网络IO

## 十一、WebSocket实时通信

### 1. 连接建立
```javascript
// WebSocket连接
const ws = new WebSocket('wss://api.smartvillage.com/ws');

// 认证
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token',
  villageId: 'village_001'
}));

// 事件订阅
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['emergency', 'announcements', 'notifications']
}));
```

### 2. 消息格式
```json
{
  "type": "event_type",
  "channel": "emergency",
  "data": {},
  "timestamp": "2025-01-01T00:00:00Z",
  "id": "event_001"
}
```

## 十二、错误处理最佳实践

### 1. 错误代码定义
```javascript
const ERROR_CODES = {
  // 通用错误 (1000-1999)
  UNKNOWN_ERROR: 'E1000',
  INVALID_REQUEST: 'E1001',
  VALIDATION_FAILED: 'E1002',

  // 认证错误 (2000-2999)
  UNAUTHORIZED: 'E2000',
  TOKEN_EXPIRED: 'E2001',
  INVALID_CREDENTIALS: 'E2002',

  // 业务错误 (3000-3999)
  USER_NOT_FOUND: 'E3000',
  DUPLICATE_USERNAME: 'E3001',
  INSUFFICIENT_BALANCE: 'E3002',

  // 系统错误 (5000-5999)
  DATABASE_ERROR: 'E5000',
  EXTERNAL_SERVICE_ERROR: 'E5001',
  RATE_LIMIT_EXCEEDED: 'E5002'
};
```

### 2. 错误响应示例
```javascript
// 验证失败
{
  "success": false,
  "error": "请求参数验证失败",
  "code": "E1002",
  "details": {
    "fields": [
      {
        "name": "email",
        "message": "邮箱格式不正确"
      },
      {
        "name": "age",
        "message": "年龄必须在0-150之间"
      }
    ]
  }
}

// 业务错误
{
  "success": false,
  "error": "用户名已存在",
  "code": "E3001",
  "details": {
    "suggestion": "请使用其他用户名"
  }
}
```

## 十三、测试规范

### 1. 单元测试
- 覆盖率要求：>80%
- 测试框架：Jest
- 测试组织：按功能模块分组

### 2. 集成测试
- API端点测试
- 数据库操作测试
- 第三方服务集成测试

### 3. 性能测试
- 压力测试：模拟高并发
- 负载测试：验证系统容量
- 稳定性测试：长时间运行验证

## 十四、文档规范

### 1. API文档要求
- 使用OpenAPI 3.0规范
- 提供详细的请求/响应示例
- 包含错误代码说明
- 定期更新保持同步

### 2. 代码注释
```javascript
/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @param {string} params.search - 搜索关键词
 * @returns {Promise<Object>} 用户列表数据
 * @throws {ValidationError} 参数验证失败
 * @example
 * const users = await getUsers({ page: 1, limit: 20 });
 */
async function getUsers(params) {
  // 实现代码
}
```

## 十五、部署与运维

### 1. 环境配置
```yaml
# 开发环境
NODE_ENV: development
PORT: 3001
LOG_LEVEL: debug

# 测试环境
NODE_ENV: test
PORT: 3002
LOG_LEVEL: info

# 生产环境
NODE_ENV: production
PORT: 3001
LOG_LEVEL: warn
```

### 2. 健康检查
```javascript
// 健康检查端点
GET /health
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "external_service": "degraded"
  }
}
```

## 十六、最佳实践总结

### DOs (应该做的)
- ✓ 使用HTTPS加密传输
- ✓ 实施严格的认证授权
- ✓ 保持API版本向后兼容
- ✓ 提供清晰的错误信息
- ✓ 实施适当的缓存策略
- ✓ 添加完整的日志记录
- ✓ 编写全面的测试用例
- ✓ 保持API文档最新

### DON'Ts (不应该做的)
- ✗ 在URL中使用动词
- ✗ 在URL中使用大写字母
- ✗ 返回敏感信息
- ✗ 忽略错误处理
- ✗ 硬编码配置信息
- ✗ 跳过输入验证
- ✗ 暴露内部实现细节
- ✗ 忽视性能优化

## 十七、API使用示例

### 1. 用户注册
```javascript
// 请求
POST /api/v1/auth/register
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "SecurePass123!",
  "villageId": "village_001",
  "personalInfo": {
    "name": "张三",
    "phone": "13800138000",
    "idCard": "330102199001011234"
  }
}

// 响应
{
  "success": true,
  "data": {
    "user": {
      "id": "user_001",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "role": "resident",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2025-01-02T00:00:00Z"
  }
}
```

### 2. 语音识别
```javascript
// 上传音频文件
POST /api/v1/voice/speech-to-text
Content-Type: multipart/form-data

{
  "audio": <audio_file>,
  "dialect": "cantonese"
}

// 响应
{
  "success": true,
  "data": {
    "text": "我要申请耕地补贴",
    "confidence": 0.95,
    "detectedDialect": "cantonese",
    "duration": 3.5
  }
}
```

### 3. 人脸验证登录
```javascript
// 请求
POST /api/v1/face/verify
{
  "faceImage": "data:image/jpeg;base64,...",
  "liveData": {
    "challenge": "blink",
    "liveness": true
  }
}

// 响应
{
  "success": true,
  "data": {
    "verified": true,
    "confidence": 0.98,
    "matchThreshold": 0.85,
    "userId": "user_001"
  }
}
```

### 4. 村民二维码生成
```javascript
// 请求
GET /api/v1/residents/resident_001/qrcode

// 响应
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://api.smartvillage.com/qrcodes/resident_001.png",
    "qrCodeData": "https://smartvillage.com/resident/resident_001",
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

### 5. 应急广播
```javascript
// 请求
POST /api/v1/emergency/broadcast
{
  "message": "台风预警：请村民做好防范准备",
  "severity": "critical",
  "targetArea": "全村",
  "channels": ["sms", "app_push", "broadcast"]
}

// 响应
{
  "success": true,
  "data": {
    "broadcastId": "broadcast_001",
    "reachedCount": 1250,
    "successRate": 0.98
  }
}
```

---

## 附录

### A. 错误代码速查表
详见 `ERROR_CODES` 定义

### B. API限流规则速查表
详见限流策略配置

### C. 数据字典
详见数据库设计文档

### D. 第三方服务集成
详见集成开发文档

### E. 部署清单
详见运维部署手册