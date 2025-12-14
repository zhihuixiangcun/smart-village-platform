# 智慧乡村平台 API 设计规范

## 基础规范

### API版本控制
- 版本号格式：`/api/v1`、`/api/v2`
- 主版本变更：不兼容的API改动
- 向后兼容：在同一版本内维护兼容性

### HTTP状态码规范
```
200 - 成功
201 - 创建成功
400 - 客户端参数错误
401 - 未认证
403 - 权限不足
404 - 资源不存在
409 - 资源冲突
422 - 数据验证失败
500 - 服务器内部错误
503 - 服务不可用
```

### 响应数据格式
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "requestId": "uuid-string"
}
```

## 服务边界定义

### 1. 认证服务 (Auth Service)
**端口**: 3001
**职责**: 用户认证、权限管理、会话管理

#### API端点设计
```
POST   /api/v1/auth/login           # 用户登录
POST   /api/v1/auth/logout          # 用户登出
POST   /api/v1/auth/refresh         # 刷新Token
GET    /api/v1/auth/profile         # 获取用户信息
PUT    /api/v1/auth/profile         # 更新用户信息
POST   /api/v1/auth/password        # 修改密码
```

#### 示例请求/响应
```javascript
// POST /api/v1/auth/login
{
  "username": "villager001",
  "password": "secure_password",
  "deviceInfo": "mobile"
}

// 响应
{
  "success": true,
  "data": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600,
    "userInfo": {
      "id": "user_123",
      "username": "villager001",
      "role": "resident",
      "villageId": "village_001"
    }
  },
  "message": "登录成功"
}
```

### 2. 村务服务 (Village Service)
**端口**: 3002
**职责**: 村民管理、公告发布、投票建议

#### API端点设计
```
# 村民管理
GET    /api/v1/residents           # 获取村民列表
POST   /api/v1/residents           # 新增村民
GET    /api/v1/residents/:id       # 获取村民详情
PUT    /api/v1/residents/:id       # 更新村民信息
DELETE /api/v1/residents/:id       # 删除村民

# 公告管理
GET    /api/v1/announcements       # 获取公告列表
POST   /api/v1/announcements       # 发布公告
GET    /api/v1/announcements/:id   # 获取公告详情
PUT    /api/v1/announcements/:id   # 更新公告
DELETE /api/v1/announcements/:id   # 删除公告

# 投票建议
GET    /api/v1/suggestions         # 获取建议列表
POST   /api/v1/suggestions         # 提交建议
GET    /api/v1/suggestions/:id     # 获取建议详情
POST   /api/v1/suggestions/:id/vote # 投票
```

#### 示例请求/响应
```javascript
// GET /api/v1/residents?page=1&limit=20&status=在住
{
  "success": true,
  "data": {
    "residents": [
      {
        "id": "resident_001",
        "name": "张三",
        "idCard": "110101199001011234",
        "phone": "13800138001",
        "address": "村东组12号",
        "householdId": "HH001",
        "status": "在住",
        "createdAt": "2024-01-15T08:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  },
  "message": "获取村民列表成功"
}
```

### 3. 通知服务 (Notification Service)
**端口**: 3003
**职责**: 消息推送、短信通知、紧急广播

#### API端点设计
```
GET    /api/v1/notifications       # 获取通知列表
POST   /api/v1/notifications       # 发送通知
GET    /api/v1/notifications/:id   # 获取通知详情
PUT    /api/v1/notifications/:id   # 标记已读
POST   /api/v1/notifications/broadcast # 紧急广播
```

### 4. 监控服务 (Monitoring Service)
**端口**: 3004
**职责**: 系统监控、性能指标、健康检查

#### API端点设计
```
GET    /api/v1/monitoring/health   # 系统健康检查
GET    /api/v1/monitoring/metrics  # 性能指标
GET    /api/v1/monitoring/logs     # 日志查询
```

## 数据库设计

### 用户认证数据库 (auth_db)
```sql
-- 用户表
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100),
    role ENUM('admin', 'village_admin', 'resident') DEFAULT 'resident',
    village_id VARCHAR(50),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_phone (phone),
    INDEX idx_village_id (village_id)
);

-- 角色权限表
CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    UNIQUE KEY unique_permission (role, resource, action)
);
```

### 村务数据库 (village_db)
```sql
-- 村民表
CREATE TABLE residents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    id_card VARCHAR(18) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    household_id VARCHAR(50),
    village_id VARCHAR(50) NOT NULL,
    status ENUM('在住', '外出', '迁出') DEFAULT '在住',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_id_card (id_card),
    INDEX idx_phone (phone),
    INDEX idx_village_id (village_id),
    INDEX idx_household_id (household_id)
);

-- 公告表
CREATE TABLE announcements (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT '通知公告',
    author_id VARCHAR(50) NOT NULL,
    village_id VARCHAR(50) NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    published_at DATETIME,
    expires_at DATETIME,
    views INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_village_id (village_id),
    INDEX idx_author_id (author_id),
    INDEX idx_status (status),
    INDEX idx_published_at (published_at)
);
```

## 技术栈推荐

### 后端技术
- **API框架**: Express.js (快速开发) 或 Fastify (高性能)
- **数据库**: MongoDB (文档存储) + MySQL (事务数据)
- **缓存**: Redis (会话缓存、接口缓存)
- **消息队列**: RabbitMQ 或 Redis Streams
- **认证**: JWT + Refresh Token
- **文档**: Swagger/OpenAPI 3.0

### 基础设施
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx (生产环境)
- **日志**: Winston + ELK Stack
- **监控**: Prometheus + Grafana
- **CI/CD**: GitHub Actions

## 缓存策略

### 1. 多级缓存架构
```
客户端缓存 -> CDN缓存 -> API网关缓存 -> Redis缓存 -> 数据库
```

### 2. 缓存策略
```javascript
// 不同数据的缓存TTL
const CACHE_TTL = {
  USER_SESSION: 30 * 60,        // 30分钟
  ANNOUNCEMENTS: 10 * 60,       // 10分钟
  RESIDENTS_LIST: 5 * 60,       // 5分钟
  VILLAGE_STATS: 60 * 60,       // 1小时
  SYSTEM_CONFIG: 24 * 60 * 60   // 24小时
};
```

## 性能优化建议

### 1. 数据库优化
- 建立适当的索引
- 实现读写分离
- 使用连接池
- 定期清理过期数据

### 2. API优化
- 实现分页查询
- 使用字段过滤
- 启用GZIP压缩
- 设置适当的缓存头

### 3. 监控指标
- API响应时间 < 200ms
- 数据库查询时间 < 100ms
- 缓存命中率 > 80%
- 错误率 < 1%

## 安全考虑

### 1. 认证授权
- JWT Token有效期控制
- 刷新Token轮换机制
- 基于角色的权限控制(RBAC)
- API访问频率限制

### 2. 数据安全
- 敏感数据加密存储
- API请求参数验证
- SQL注入防护
- XSS攻击防护

### 3. 网络安全
- HTTPS强制加密
- CORS策略配置
- 安全响应头设置
- 防护DDoS攻击