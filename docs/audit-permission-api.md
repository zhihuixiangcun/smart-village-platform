# 村干部审核和权限分配 API 接口文档

## 1. 村民注册接口

### POST /api/v1/auth/resident-register

村民自主注册账号

**请求参数**:
```json
{
  "name": "张三",
  "phone": "13800138000",
  "idCard": "110101199001011234",
  "villageId": "村庄ID",
  "address": "详细家庭住址",
  "password": "123456",
  "verifyCode": "123456"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "userId": "用户ID",
    "token": "访问令牌"
  }
}
```

## 2. 村干部申请接口

### POST /api/v1/auth/official-apply

村民申请村干部职务

**请求参数**:
```json
{
  "name": "李四",
  "phone": "13900139000",
  "idCard": "110101199002022345",
  "villageId": "村庄ID",
  "position": "村主任",
  "department": "村委会",
  "address": "详细住址",
  "reason": "申请理由（至少50字）",
  "experience": "工作经验",
  "skills": ["财务管理", "文书写作"],
  "documents": ["身份证照片URL1", "身份证照片URL2"]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "申请提交成功",
  "data": {
    "applicationId": "申请ID",
    "status": "pending"
  }
}
```

## 3. 获取申请列表接口

### GET /api/v1/admin/official-applications

获取村干部申请列表（管理员权限）

**查询参数**:
- `page`: 页码（默认：1）
- `pageSize`: 每页数量（默认：20）
- `status`: 状态筛选（pending, processing, approved, rejected）
- `position`: 职务筛选
- `keyword`: 搜索关键词（姓名/手机号）
- `startDate`: 开始日期
- `endDate`: 结束日期

**响应示例**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "申请ID",
        "name": "李四",
        "phone": "13900139000",
        "idCard": "110101199002022345",
        "villageId": "村庄ID",
        "villageName": "幸福村",
        "position": "村主任",
        "department": "村委会",
        "reason": "申请理由...",
        "experience": "工作经验...",
        "skills": ["财务管理", "文书写作"],
        "documents": ["照片URL"],
        "status": "pending",
        "createdAt": "2024-01-09T10:00:00Z",
        "auditComment": "",
        "auditedAt": null,
        "auditedBy": null
      }
    ],
    "total": 100
  }
}
```

## 4. 获取申请统计接口

### GET /api/v1/admin/official-application-stats

获取申请统计数据

**响应示例**:
```json
{
  "success": true,
  "data": {
    "pending": 15,
    "processing": 5,
    "approved": 50,
    "rejected": 10
  }
}
```

## 5. 审核申请接口

### POST /api/v1/admin/official-application/:id/audit

审核村干部申请

**路径参数**:
- `id`: 申请ID

**请求参数**:
```json
{
  "action": "approve",  // approve | reject
  "comment": "审核意见",
  "permissions": [      // 审核通过时必填
    {
      "module": "document_management",
      "actions": ["create", "read", "update"]
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "审核完成"
}
```

## 6. 获取村干部列表接口

### GET /api/v1/admin/village-officials

获取已审核通过的村干部列表

**查询参数**:
- `page`: 页码
- `pageSize`: 每页数量
- `villageId`: 村庄ID筛选
- `role`: 角色筛选（village_official, township_official）
- `keyword`: 搜索关键词

**响应示例**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "用户ID",
        "name": "李四",
        "phone": "13900139000",
        "idCard": "110101199002022345",
        "villageId": "村庄ID",
        "villageName": "幸福村",
        "role": "village_official",
        "position": "村主任",
        "department": "村委会",
        "permissions": [
          {
            "module": "document_management",
            "actions": ["create", "read", "update"]
          }
        ],
        "isActive": true,
        "createdAt": "2024-01-09T10:00:00Z"
      }
    ],
    "total": 50
  }
}
```

## 7. 分配权限接口

### POST /api/v1/admin/users/:id/permissions

分配用户权限

**路径参数**:
- `id`: 用户ID

**请求参数**:
```json
[
  {
    "module": "document_management",
    "actions": ["create", "read", "update", "delete"]
  },
  {
    "module": "duty_management",
    "actions": ["create", "read", "update", "approve"]
  }
]
```

**响应示例**:
```json
{
  "success": true,
  "message": "权限分配成功"
}
```

## 8. 更新用户状态接口

### PUT /api/v1/admin/users/:id/status

更新用户账号状态（启用/禁用）

**路径参数**:
- `id`: 用户ID

**请求参数**:
```json
{
  "isActive": true
}
```

## 9. 批量更新用户状态接口

### PUT /api/v1/admin/users/batch-status

批量更新用户状态

**请求参数**:
```json
{
  "userIds": ["用户ID1", "用户ID2"],
  "isActive": true
}
```

## 10. 删除用户接口

### DELETE /api/v1/admin/users/:id

删除用户

**路径参数**:
- `id`: 用户ID

## 11. 批量删除用户接口

### DELETE /api/v1/admin/users/batch-delete

批量删除用户

**请求参数**:
```json
{
  "userIds": ["用户ID1", "用户ID2"]
}
```

## 12. 发送验证码接口

### POST /api/v1/auth/send-verify-code

发送短信验证码

**请求参数**:
```json
{
  "phone": "13800138000",
  "type": "register"  // register | login | reset_password
}
```

## 13. 验证验证码接口

### POST /api/v1/auth/verify-code

验证短信验证码

**请求参数**:
```json
{
  "phone": "13800138000",
  "code": "123456",
  "type": "register"
}
```

## 14. 获取村庄列表接口

### GET /api/v1/villages

获取所有村庄列表

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "村庄ID",
      "name": "幸福村",
      "code": "XFC",
      "address": "详细地址"
    }
  ]
}
```

## 权限模块说明

| 模块代码 | 模块名称 | 说明 |
|---------|---------|------|
| document_management | 资料收集 | 村民资料收集和管理 |
| duty_management | 值班管理 | 村委值班安排和管理 |
| user_management | 用户管理 | 村民和村干部用户管理 |
| village_overview | 村务公开 | 村务公告和信息公开 |
| statistics_analysis | 数据分析 | 村务数据统计和分析 |
| finance_management | 财务管理 | 村财务收支管理（乡镇干部）|
| project_management | 项目管理 | 村项目管理（乡镇干部）|
| system_settings | 系统设置 | 系统参数配置（管理员）|

## 权限动作说明

| 动作代码 | 动作名称 | 说明 |
|---------|---------|------|
| create | 创建 | 新增数据 |
| read | 查看 | 查看数据 |
| update | 修改 | 修改数据 |
| delete | 删除 | 删除数据 |
| approve | 审批 | 审核审批 |
| export | 导出 | 导出数据 |

## 审核状态说明

| 状态代码 | 状态名称 | 说明 |
|---------|---------|------|
| pending | 待审核 | 等待管理员审核 |
| processing | 审核中 | 正在审核中 |
| approved | 已通过 | 审核通过，已任职 |
| rejected | 已拒绝 | 审核拒绝 |

## 错误码说明

| 错误码 | 说明 |
|---------|------|
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如手机号已存在）|
| 500 | 服务器内部错误 |

## 开发注意事项

1. **身份证脱敏**: 前端展示身份证时需要脱敏处理，显示格式：`110101********1234`

2. **权限验证**: 所有需要权限的接口都需要在后端验证用户权限

3. **审核记录**: 审核操作需要记录审核人、审核时间、审核意见

4. **状态流转**: 申请状态只能从 pending -> processing -> approved/rejected

5. **文件上传**: 身份证照片需要先上传到文件服务器，获取URL后保存到数据库

6. **批量操作**: 批量操作需要添加事务处理，确保数据一致性

7. **敏感操作**: 删除用户、分配权限等敏感操作需要二次确认

8. **日志记录**: 重要操作需要记录到系统日志，包括操作人、操作时间、操作内容

---

**文档版本**: v1.0
**最后更新**: 2024-01-09
