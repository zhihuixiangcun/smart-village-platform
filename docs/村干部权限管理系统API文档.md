# 村干部权限管理系统 API 使用文档

## 📋 概述

本文档描述了智慧乡村平台中村干部权限管理系统的API接口，包括村干部账号审核、村民分组管理、人口变动管理等核心功能。

## 🔐 认证说明

所有API接口都需要在请求头中携带JWT Token进行身份验证：

```
Authorization: Bearer <your-jwt-token>
```

## 🏛️ 一、村干部管理 API (`/api/committee`)

### 1. 提交村干部账号申请

**接口地址**: `POST /api/committee/applications`

**权限要求**: 需要登录

**请求参数**:
```json
{
  "applicationType": "new_account",  // 申请类型: new_account, role_change, permission_grant, role_resign
  "targetRole": "secretary",         // 目标角色: secretary, village_head, accountant, population_admin, security_director
  "targetVillageId": "village123",   // 目标村庄ID
  "documents": [                     // 证明文件
    {
      "type": "id_card",
      "url": "/uploads/id_card.jpg"
    },
    {
      "type": "appointment_letter",
      "url": "/uploads/appointment.pdf"
    }
  ],
  "reason": "申请担任村支书"          // 申请理由
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "申请提交成功，等待审核",
  "data": {
    "applicationId": "APP-1704567890123-abc123",
    "status": "pending",
    "currentStep": 1
  }
}
```

### 2. 获取申请列表

**接口地址**: `GET /api/committee/applications`

**权限要求**: `committee:read` 或 `committee:approve`

**查询参数**:
- `villageId` (可选): 村庄ID
- `status` (可选): 申请状态 (pending, under_review, approved, rejected)
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认20

**响应示例**:
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "_id": "app123",
        "applicationId": "APP-1704567890123-abc123",
        "applicationType": "new_account",
        "applicant": {
          "userId": "user123",
          "name": "张三",
          "phone": "138****1234",
          "currentPosition": "村民"
        },
        "targetRole": "secretary",
        "targetVillageId": "village123",
        "status": "pending",
        "submittedAt": "2025-01-06T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

### 3. 审核申请

**接口地址**: `PUT /api/committee/applications/:applicationId/review`

**权限要求**: `committee:approve` (仅村支书和村主任)

**请求参数**:
```json
{
  "decision": "approve",  // 决策: approve (通过) / reject (驳回)
  "comments": "同意申请"   // 审核意见
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "审核通过",
  "data": {
    "applicationId": "APP-1704567890123-abc123",
    "status": "approved",
    "currentStep": 2
  }
}
```

### 4. 获取村干部成员列表

**接口地址**: `GET /api/committee/members`

**权限要求**: `committee:read`

**查询参数**:
- `villageId` (可选): 村庄ID
- `role` (可选): 角色代码
- `status` (可选): 状态，默认 active

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "member123",
      "userId": "user123",
      "name": "张三",
      "phone": "138****1234",
      "roleCode": "secretary",
      "roleName": "村支书",
      "roleLevel": 5,
      "villageId": "village123",
      "status": "active",
      "assignedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 5. 更新成员权限

**接口地址**: `PUT /api/committee/members/:memberId`

**权限要求**: `committee:manage` (仅村支书)

**请求参数**:
```json
{
  "customPermissions": ["resident:delete", "finance:export"],
  "restrictions": {
    "dataScope": "all",
    "approvalRequired": ["finance:approve"],
    "dailyLimit": {
      "operation": "approve",
      "amount": 10
    }
  }
}
```

### 6. 移除成员

**接口地址**: `DELETE /api/committee/members/:memberId`

**权限要求**: `committee:manage` (仅村支书)

### 7. 获取统计数据

**接口地址**: `GET /api/committee/statistics`

**权限要求**: `committee:read`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "applications": {
      "pending": 5,
      "under_review": 3,
      "approved": 45,
      "rejected": 2
    },
    "members": [
      {
        "roleCode": "secretary",
        "roleName": "村支书",
        "count": 1
      },
      {
        "roleCode": "accountant",
        "roleName": "会计",
        "count": 2
      }
    ],
    "totalMembers": 8
  }
}
```

## 👥 二、人口管理 API (`/api/population`)

### 村民分组管理

#### 1. 创建村民分组

**接口地址**: `POST /api/population/groups`

**权限要求**: `group:create` (人口主任)

**请求参数**:
```json
{
  "groupName": "独居老人关怀组",
  "groupType": "special_care",  // 分组类型: special_care, dynamic_monitoring, party_member, volunteer, grid_responsibility, custom
  "villageId": "village123",
  "description": "关爱独居老人",
  "carePlan": {
    "enabled": true,
    "frequency": "weekly",
    "tasks": [
      {
        "type": "visit",
        "title": "每周探访",
        "description": "每周至少探访一次"
      },
      {
        "type": "call",
        "title": "电话问候",
        "description": "每天电话问候"
      }
    ]
  },
  "tags": ["关爱", "老人", "重点"]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "分组创建成功",
  "data": {
    "_id": "group123",
    "groupId": "GRP-1704567890123-xyz789",
    "groupName": "独居老人关怀组",
    "groupType": "special_care",
    "memberCount": 0,
    "status": "active"
  }
}
```

#### 2. 获取分组列表

**接口地址**: `GET /api/population/groups`

**权限要求**: `group:read`

**查询参数**:
- `villageId` (可选): 村庄ID
- `groupType` (可选): 分组类型
- `status` (可选): 状态，默认 active
- `page` (可选): 页码
- `limit` (可选): 每页数量

#### 3. 添加分组成员

**接口地址**: `POST /api/population/groups/:groupId/members`

**权限要求**: `group:update` (人口主任)

**请求参数**:
```json
{
  "userIds": ["user123", "user456", "user789"],
  "careTasks": [
    {
      "type": "visit",
      "assignedTo": "volunteer123",
      "dueDate": "2025-01-13",
      "status": "pending"
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功添加 3 名成员",
  "data": {
    "addedCount": 3,
    "totalMembers": 15
  }
}
```

#### 4. 移除分组成员

**接口地址**: `DELETE /api/population/groups/:groupId/members/:userId`

**权限要求**: `group:update` (人口主任)

### 人口变动管理

#### 1. 提交人口变动申请

**接口地址**: `POST /api/population/changes`

**权限要求**: `population:create` (人口主任)

**请求参数**:
```json
{
  "changeType": "birth",  // 变动类型: birth, marriage_in, marriage_out, death, move_in, move_out
  "villageId": "village123",
  "householdId": "household123",
  "personInfo": {
    "name": "张小明",
    "idCard": "330123202501061234",
    "gender": "male",
    "birthDate": "2025-01-06",
    "relation": "子女",
    "phone": "138****1234"
  },
  "changeDate": "2025-01-06",
  "documents": [
    {
      "type": "birth_certificate",
      "url": "/uploads/birth_cert.pdf"
    }
  ],
  "notes": "新生儿出生登记",
  "autoUpdateHousehold": true
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "变动申请已提交，等待审核",
  "data": {
    "changeId": "CHG-1704567890123-def456",
    "status": "pending"
  }
}
```

#### 2. 获取人口变动列表

**接口地址**: `GET /api/population/changes`

**权限要求**: `population:read`

**查询参数**:
- `villageId` (可选): 村庄ID
- `householdId` (可选): 家庭ID
- `changeType` (可选): 变动类型
- `status` (可选): 状态
- `startDate` (可选): 开始日期
- `endDate` (可选): 结束日期
- `page` (可选): 页码
- `limit` (可选): 每页数量

**响应示例**:
```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "_id": "change123",
        "changeId": "CHG-1704567890123-def456",
        "changeType": "birth",
        "personInfo": {
          "name": "张小明",
          "idCard": "330123202501061234",
          "relation": "子女"
        },
        "changeDate": "2025-01-06T00:00:00Z",
        "status": "pending",
        "submittedBy": {
          "_id": "user123",
          "name": "李主任"
        }
      }
    ],
    "pagination": {
      "total": 23,
      "page": 1,
      "limit": 20,
      "pages": 2
    }
  }
}
```

#### 3. 审核人口变动申请

**接口地址**: `PUT /api/population/changes/:changeId/review`

**权限要求**: `population:approve` (村支书或人口主任)

**请求参数**:
```json
{
  "decision": "approve",
  "reviewNotes": "审核通过，已自动更新家庭档案"
}
```

#### 4. 获取人口统计

**接口地址**: `GET /api/population/statistics`

**权限要求**: `population:read`

**查询参数**:
- `villageId` (可选): 村庄ID
- `startDate` (可选): 统计开始日期
- `endDate` (可选): 统计结束日期

**响应示例**:
```json
{
  "success": true,
  "data": {
    "changesByType": [
      {
        "type": "birth",
        "typeName": "新生儿出生",
        "count": 5
      },
      {
        "type": "death",
        "typeName": "死亡",
        "count": 2
      },
      {
        "type": "marriage_in",
        "typeName": "婚入",
        "count": 3
      }
    ],
    "changesByStatus": {
      "pending": 8,
      "approved": 150,
      "rejected": 5
    },
    "total": 163,
    "groups": [
      {
        "type": "special_care",
        "typeName": "特殊关怀组",
        "count": 5,
        "totalMembers": 45
      },
      {
        "type": "party_member",
        "typeName": "党员",
        "count": 1,
        "totalMembers": 32
      }
    ],
    "totalGroups": 8,
    "totalGroupMembers": 156
  }
}
```

## 🔑 三、权限代码说明

### 角色代码

| 角色 | 代码 | 级别 | 说明 |
|------|------|------|------|
| 村支书 | `secretary` | 5 | 最高权限，负责审核审批 |
| 村主任 | `village_head` | 4 | 村务管理、财务审批 |
| 会计 | `accountant` | 3 | 财务数据管理 |
| 人口主任 | `population_admin` | 3 | 村民信息、人口管理 |
| 治保主任 | `security_director` | 3 | 安全管理、应急响应 |

### 权限代码格式

权限代码采用 `模块:操作` 格式：

**模块列表**:
- `resident` - 村民管理
- `population` - 人口管理
- `finance` - 财务管理
- `security` - 安全管理
- `emergency` - 应急管理
- `announcement` - 公告管理
- `task` - 任务管理
- `group` - 分组管理
- `audit` - 审计日志
- `committee` - 村委管理

**操作列表**:
- `read` - 读取/查看
- `create` - 创建/新增
- `update` - 更新/修改
- `delete` - 删除
- `approve` - 审核审批
- `manage` - 管理
- `export` - 导出
- `*` - 所有权限

**权限示例**:
- `resident:read` - 查看村民信息
- `committee:approve` - 审核村干部申请
- `population:create` - 创建人口变动记录
- `group:update` - 更新村民分组
- `finance:*` - 财务管理所有权限

## 📊 四、常见使用场景

### 场景1：村民申请成为村干部

1. 村民提交申请
```bash
POST /api/committee/applications
{
  "applicationType": "new_account",
  "targetRole": "population_admin",
  "targetVillageId": "village123",
  "reason": "申请担任人口主任"
}
```

2. 村主任初审
```bash
PUT /api/committee/applications/{applicationId}/review
{
  "decision": "approve",
  "comments": "同意推荐"
}
```

3. 村支书终审
```bash
PUT /api/committee/applications/{applicationId}/review
{
  "decision": "approve",
  "comments": "批准任命"
}
```

### 场景2：人口主任创建特殊关怀组

1. 创建分组
```bash
POST /api/population/groups
{
  "groupName": "独居老人关怀组",
  "groupType": "special_care",
  "villageId": "village123",
  "carePlan": {
    "enabled": true,
    "frequency": "weekly"
  }
}
```

2. 添加成员
```bash
POST /api/population/groups/{groupId}/members
{
  "userIds": ["user1", "user2", "user3"]
}
```

### 场景3：新生儿出生登记

1. 提交出生记录
```bash
POST /api/population/changes
{
  "changeType": "birth",
  "villageId": "village123",
  "householdId": "household123",
  "personInfo": {
    "name": "张小明",
    "idCard": "330123202501061234",
    "gender": "male",
    "birthDate": "2025-01-06",
    "relation": "子女"
  },
  "autoUpdateHousehold": true
}
```

2. 村支书审核
```bash
PUT /api/population/changes/{changeId}/review
{
  "decision": "approve"
}
```

系统会自动将新生儿添加到对应家庭档案中。

## ⚠️ 五、错误代码说明

| 错误代码 | HTTP状态码 | 说明 |
|----------|-----------|------|
| `PERMISSION_DENIED` | 403 | 权限不足 |
| `AUTHENTICATION_FAILED` | 401 | 认证失败 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `DUPLICATE_APPLICATION` | 400 | 重复申请 |
| `INVALID_STATUS` | 400 | 状态无效 |

## 🔗 六、相关文档

- [村干部权限管理系统实现总结](./村干部权限管理系统实现总结.md)
- [数据库模型设计](../src/models/)
- [权限配置文件](../src/config/permissions.js)

---

**最后更新**: 2025-01-06
**版本**: v1.0
**作者**: Claude Code AI Assistant
