---
name: api-design
description: RESTful API 设计最佳实践。当用户需要设计 API 接口、定义端点规范、编写 API 文档、或评估现有 API 设计时使用此技能。
---

# API Design

提供专业的 RESTful API 设计指导，确保接口一致性、可用性和可扩展性。

## 设计原则

1. **资源导向**：URL 表示资源，HTTP 方法表示操作
2. **一致性**：命名、格式、错误处理保持统一
3. **版本化**：支持 API 演进而不破坏现有客户端
4. **自描述**：响应包含足够信息供客户端理解

## URL 设计规范

### 资源命名
```
GET    /users# 获取用户列表
GET    /users/{id}         # 获取单个用户
POST   /users              # 创建用户
PUT    /users/{id}         # 更新用户（全量）
PATCH  /users/{id}         # 更新用户（部分）
DELETE /users/{id}         # 删除用户
```

### 命名规则
- 使用名词复数：`/users` 而非 `/user`
- 使用小写和连字符：`/user-profiles` 而非 `/userProfiles`
- 避免动词：`POST /users` 而非 `/createUser`
- 嵌套资源：`/users/{id}/orders`（最多 2 层）

## HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | GET/PUT/PATCH 成功 |
| 201 | Created | POST 创建成功 |
| 204 | No Content | DELETE 成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 422 | Unprocessable | 业务验证失败 |
| 500 | Server Error | 服务器错误 |

## 响应格式

### 成功响应
```json
{
  "data": {
    "id": "123",
    "name": "张三",
    "email": "zhang@example.com"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 列表响应（带分页）
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### 错误响应
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {"field": "email", "message": "邮箱格式不正确"}
    ]
  }
}
```

## 版本控制

推荐 URL 路径版本：
```
/api/v1/users
/api/v2/users
```

## 查询参数规范

```
# 分页
?page=1&per_page=20

# 排序
?sort=created_at&order=desc

# 过滤
?status=active&role=admin

# 字段选择
?fields=id,name,email

# 搜索
?q=keyword
```

## 设计检查清单

- [ ] URL 使用名词复数
- [ ] HTTP 方法语义正确
- [ ] 状态码使用恰当
- [ ] 响应格式统一
- [ ] 错误信息清晰
- [ ] 支持分页和过滤
- [ ] 包含版本号