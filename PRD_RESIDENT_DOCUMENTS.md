# 村民证件包管理系统 PRD

## 一、功能概述

### 1.1 功能定位
为村民提供安全的个人证件数字化存储和管理服务，确保证件信息的安全性和隐私保护。

### 1.2 核心价值
- **隐私安全**：严格的权限控制，确保只有本人和授权村干部可访问
- **便捷管理**：村民可随时上传、更新、查看自己的证件
- **加密存储**：敏感信息AES/RSA加密存储
- **审计追溯**：所有操作记录可追溯

## 二、功能需求

### 2.1 证件类型

| 证件类型 | 说明 | 必填字段 |
|---------|------|----------|
| 身份证 | 居民身份证 | 姓名、身份证号、有效期、正面照、背面照 |
| 户口本 | 家庭户口簿 | 户主姓名、户口本号、家庭关系、首页照 |
| 银行卡 | 银行储蓄卡 | 开户行、卡号（后4位）、持卡人姓名 |
| 毕业证 | 学历证书 | 学校名称、专业、学历、毕业时间、证书编号 |
| 个人相片 | 证件照片 | 照片描述、拍摄日期、用途 |
| 其他证件 | 其他证明材料 | 证件名称、发证机关、有效期 |

### 2.2 权限体系

#### 访问权限矩阵

| 操作 | 本人 | 本村干部 | 其他村干部 | 其他村民 | 系统管理员 |
|------|------|----------|------------|----------|------------|
| 查看证件包 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 上传证件 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 更新证件 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 删除证件 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 查看操作日志 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 导出数据 | ❌ | ✅（脱敏） | ❌ | ❌ | ✅ |

#### 权限验证规则

1. **本人查看**：验证用户ID与证件包所属村民ID一致
2. **村干部查看**：验证用户角色为村干部且与村民同属一个村庄
3. **数据脱敏**：村干部查看时自动脱敏敏感字段（身份证号显示后4位）
4. **操作日志**：记录所有查看、修改操作，包含操作人、时间、IP地址

### 2.3 数据安全

#### 加密策略
- **传输加密**：HTTPS + 双向认证
- **存储加密**：AES-256-GCM加密证件内容
- **密钥管理**：独立密钥服务，定期轮换
- **访问控制**：基于角色的细粒度权限控制

#### 敏感字段处理
```javascript
// 脱敏规则
{
  idCard: '3301**********1234',    // 身份证号
  bankCard: '6222**********8888',   // 银行卡号
  phone: '138****5678'             // 手机号
}
```

## 三、用户故事

### 3.1 村民场景
> 作为村民，我希望将身份证、毕业证等证件上传到系统，以便在线办理各项业务时无需重复提交材料。

**验收标准**：
- 可以上传各类证件图片
- 可以查看已上传的证件
- 可以更新或删除自己的证件
- 证件信息加密存储，其他人无法查看

### 3.2 村干部场景
> 作为村干部，我需要在征得村民同意后查看其证件包，以便协助办理相关业务。

**验收标准**：
- 可以查看本村村民的证件包（敏感信息已脱敏）
- 查看操作会记录到审计日志
- 无法修改村民的证件
- 查看权限仅限本村村民

### 3.3 安全审计场景
> 作为系统管理员，我需要查看所有证件包的访问日志，以确保系统安全。

**验收标准**：
- 可以查看谁在什么时间查看了哪些证件
- 可以导出操作日志
- 可以对异常访问进行预警

## 四、功能流程

### 4.1 上传证件流程
```
村民登录 → 选择证件类型 → 上传证件图片 → 填写证件信息 → 确认提交 → 系统加密存储 → 记录操作日志
```

### 4.2 查看证件流程
```
用户发起请求 → 系统验证权限 → 解密证件信息 → 脱敏处理（村干部） → 返回数据 → 记录访问日志
```

### 4.3 权限验证流程
```
请求携带Token → 中间件验证身份 → 检查角色权限 → 验证村庄关系 → 允许/拒绝访问
```

## 五、API接口设计

### 5.1 证件包管理

#### 创建/更新证件
```
POST /api/v1/documents/package
Authorization: Bearer {token}

Request Body:
{
  "residentId": "村民ID",
  "documents": [
    {
      "type": "id_card",
      "idNumber": "身份证号",
      "name": "姓名",
      "validFrom": "2020-01-01",
      "validTo": "2030-01-01",
      "frontPhoto": "data:image/jpeg;base64,...",
      "backPhoto": "data:image/jpeg;base64,..."
    }
  ]
}

Response:
{
  "success": true,
  "message": "证件保存成功"
}
```

#### 查看证件包
```
GET /api/v1/documents/package/:residentId
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "residentId": "村民ID",
    "residentName": "村民姓名",
    "documents": [
      {
        "type": "id_card",
        "typeLabel": "身份证",
        "idNumber": "3301**********1234",  // 脱敏
        "name": "张三",
        "validTo": "2030-01-01",
        "frontPhoto": "/api/v1/documents/file/xxx",
        "backPhoto": "/api/v1/documents/file/yyy"
      }
    ]
  },
  "accessLog": {
    "accessedAt": "2025-12-31T00:00:00Z",
    "accessBy": "操作人ID",
    "accessByName": "操作人姓名",
    "purpose": "业务办理"
  }
}
```

#### 获取操作日志
```
GET /api/v1/documents/package/:residentId/logs
Authorization: Bearer {token}

Query Params:
- page: 页码
- limit: 每页数量
- startDate: 开始日期
- endDate: 结束日期

Response:
{
  "success": true,
  "data": [
    {
      "_id": "日志ID",
      "operatorId": "操作人ID",
      "operatorName": "操作人姓名",
      "operatorRole": "村干部",
      "action": "view",
      "targetResident": "村民姓名",
      "documentTypes": ["id_card", "bank_card"],
      "ipAddress": "192.168.1.100",
      "createdAt": "2025-12-31T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### 5.2 证件文件访问

```
GET /api/v1/documents/file/:fileId
Authorization: Bearer {token}
Query Params:
- residentId: 村民ID（用于权限验证）

Response:
- 返回证件图片文件
```

## 六、数据模型设计

### 6.1 DocumentPackage（证件包）
```javascript
{
  residentId: ObjectId,           // 村民ID（关联User）
  villageId: ObjectId,            // 村庄ID
  documents: [{                   // 证件列表
    type: String,                 // 证件类型
    typeLabel: String,            // 证件类型名称
    data: {
      encrypted: Boolean,         // 是否加密
      content: Object             // 加密后的证件内容
    },
    files: [{                     // 文件列表
      fileType: String,           // 文件类型（front/back等）
      fileKey: String,            // 文件存储key
      originalName: String,       // 原始文件名
      mimeType: String,           // MIME类型
      size: Number,               // 文件大小
      uploadedAt: Date            // 上传时间
    }],
    status: String,              // 状态（active/expired/lost）
    expiryDate: Date,             // 有效期
    reminderSent: Boolean,        // 是否已发送过期提醒
    createdAt: Date,
    updatedAt: Date
  }],
  accessSettings: {              // 访问设置
    allowCommitteeView: Boolean,  // 是否允许村干部查看
    committeeAccessLog: [{       // 村干部访问记录
      committeeMemberId: ObjectId,
      committeeMemberName: String,
      accessedAt: Date,
      purpose: String,
      ipAddress: String
    }]
  },
  security: {                     // 安全设置
    encryptLevel: {               // 加密级别
      idCard: 'high',             // 身份证：高级加密
      bankCard: 'high',           // 银行卡：高级加密
      other: 'standard'           // 其他：标准加密
    },
    lastEncryptedAt: Date,        // 最后加密时间
    keyRotationRequired: Boolean  // 是否需要密钥轮换
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 6.2 DocumentAccessLog（访问日志）
```javascript
{
  residentId: ObjectId,           // 村民ID
  operatorId: ObjectId,           // 操作人ID
  operatorName: String,           // 操作人姓名
  operatorRole: String,           // 操作人角色
  action: String,                 // 操作类型（view/create/update/delete）
  documentTypes: [String],        // 涉及的证件类型
  ipAddress: String,              // IP地址
  userAgent: String,              // 用户代理
  purpose: String,                // 访问目的
  metadata: Object,               // 其他元数据
  createdAt: Date
}
```

## 七、安全设计

### 7.1 加密实现
```javascript
// 敏感字段加密
const crypto = require('crypto');

function encryptSensitiveData(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
```

### 7.2 权限验证中间件
```javascript
async function checkDocumentAccess(req, res, next) {
  const { residentId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // 1. 检查是否是本人
  if (userId === residentId) {
    return next();
  }

  // 2. 检查是否是村干部且同村
  if (userRole === 'committee_member' || userRole === 'village_admin') {
    const resident = await User.findById(residentId);
    const committee = await User.findById(userId);

    if (resident.villageId.equals(committee.villageId)) {
      // 记录访问日志
      await logDocumentAccess(residentId, userId, 'view');
      // 返回脱敏数据
      req.isCommitteeView = true;
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    message: '您没有权限查看此证件包'
  });
}
```

## 八、前端页面设计

### 8.1 证件包管理页面
- 证件卡片展示（类型、状态、有效期）
- 上传证件功能
- 证件详情查看
- 过期提醒
- 操作日志查看

### 8.2 村干部查看页面
- 村民搜索
- 证件包查看（脱敏）
- 查看记录
- 访问目的填写

## 九、测试用例

### 9.1 权限测试
- 验证村民只能查看自己的证件包
- 验证村干部可以查看本村村民证件包（脱敏）
- 验证村干部无法查看外村村民证件包
- 验证普通村民无法查看他人证件包

### 9.2 安全测试
- 验证敏感数据加密存储
- 验证传输过程HTTPS加密
- 验证操作日志完整记录
- 验证越权访问被拒绝

## 十、上线计划

### 10.1 第一阶段（MVP）
- 基础证件上传、查看功能
- 本人权限控制
- 基础加密存储

### 10.2 第二阶段
- 村干部权限控制
- 操作日志审计
- 数据脱敏显示

### 10.3 第三阶段
- 证件过期提醒
- 智能证件分类
- 数据统计分析

---

**文档版本**: v1.0
**创建日期**: 2025-12-31
**最后更新**: 2025-12-31
