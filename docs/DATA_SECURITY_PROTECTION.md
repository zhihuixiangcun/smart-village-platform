# 🔒 智慧村庄平台 - 数据安全保障体系

## 📋 概述

智慧村庄平台的数据安全保障体系是一个多层次、全方位的安全保护系统，涵盖权限分级控制、敏感数据脱敏、操作日志审计等核心安全功能，确保村庄和村民的数据安全与隐私保护。

## 🏗️ 安全架构体系

### 多层安全防护架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    数据安全保障体系架构                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   应用层安全     │    │   访问控制层     │    │   数据保护层     │ │
│  │                │    │                │    │                │ │
│  │ • 身份认证      │◄──►│ • 角色权限管理  │◄──►│ • 数据加密      │ │
│  │ • 会话管理      │    │ • 数据权限控制  │    │ • 敏感数据脱敏  │ │
│  │ • 安全中间件    │    │ • 操作审计      │    │ • 数据完整性    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   网络层安全     │    │   系统层安全     │    │   管理层安全     │ │
│  │                │    │                │    │                │ │
│  │ • HTTPS加密     │    │ • 主机安全      │    │ • 安全策略      │ │
│  │ • 防火墙规则    │    │ • 系统加固      │    │ • 合规审计      │ │
│  │ • DDoS防护      │    │ • 漏洞扫描      │    │ • 应急响应      │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 核心安全组件

| 组件 | 功能描述 | 实现方式 |
|------|----------|----------|
| **访问控制系统** | 基于角色的权限控制 (RBAC) | 多层级权限验证 |
| **数据加密服务** | AES-256 + RSA 加密保护 | 对称/非对称加密 |
| **审计日志系统** | 完整操作轨迹记录 | 事件驱动审计 |
| **敏感数据脱敏** | 自动数据脱敏处理 | 字段级脱敏策略 |
| **安全中间件** | 统一安全防护中间件 | Express中间件集成 |

## 🔐 1. 权限分级控制

### 角色体系设计

#### 角色层级结构
```javascript
const ROLES = {
  SUPER_ADMIN: 'super_admin',        // 超级管理员 - 最高权限
  VILLAGE_ADMIN: 'village_admin',    // 村庄管理员 - 村庄级管理
  PARTY_SECRETARY: 'party_secretary', // 村支书 - 党务管理
  COMMITTEE_MEMBER: 'committee_member', // 村委会成员 - 委员会管理
  VILLAGE_OFFICER: 'village_officer', // 村务人员 - 具体业务处理
  ACCOUNTANT: 'accountant',          // 会计 - 财务数据管理
  GRID_MANAGER: 'grid_manager',      // 网格员 - 网格区域管理
  VOLUNTEER: 'volunteer',            // 志愿者 - 志愿服务管理
  RESIDENT: 'resident',              // 村民 - 基础权限
  GUEST: 'guest'                     // 访客 - 只读权限
};
```

#### 权限级别定义
```javascript
const PERMISSION_LEVELS = {
  READ: 'read',           // 只读权限 - 查看数据
  WRITE: 'write',         // 写入权限 - 创建和修改数据
  DELETE: 'delete',       // 删除权限 - 删除数据
  APPROVE: 'approve',     // 审批权限 - 审批业务流程
  EXPORT: 'export',       // 导出权限 - 导出敏感数据
  ADMIN: 'admin'          // 管理权限 - 系统管理功能
};
```

#### 数据访问范围
```javascript
const DATA_SCOPES = {
  ALL: 'all',                   // 全部数据 - 跨村庄访问
  VILLAGE: 'village',           // 村庄数据 - 本村庄内数据
  DEPARTMENT: 'department',     // 部门数据 - 部门内数据
  GRID: 'grid',                 // 网格数据 - 网格内数据
  TEAM: 'team',                 // 团队数据 - 团队内数据
  PERSONAL: 'personal'           // 个人数据 - 个人数据
};
```

### 权限矩阵设计

| 角色 | 村庄管理 | 村务处理 | 财务管理 | 数据导出 | 系统配置 | 审计日志 |
|------|----------|----------|----------|----------|----------|----------|
| 超级管理员 | ✅ 完全 | ✅ 完全 | ✅ 完全 | ✅ 完全 | ✅ 完全 | ✅ 完全 |
| 村庄管理员 | ✅ 完全 | ✅ 完全 | ✅ 完全 | ✅ 完全 | ❌ 限制 | ✅ 完全 |
| 村支书 | ✅ 完全 | ✅ 完全 | ⚠️ 查看 | ⚠️ 限制 | ❌ 限制 | ⚠️ 查看 |
| 村委会成员 | ⚠️ 查看 | ✅ 完全 | ❌ 禁止 | ⚠️ 限制 | ❌ 禁止 | ⚠️ 查看 |
| 会计 | ❌ 禁止 | ❌ 禁止 | ✅ 完全 | ✅ 导出 | ❌ 禁止 | ⚠️ 查看 |
| 网格员 | ⚠️ 查看 | ⚠️ 查看 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 | ⚠️ 查看 |
| 村民 | ❌ 禁止 | ⚠️ 查看 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 |

### 权限验证流程

```javascript
// 1. 用户认证
const authenticateToken = async (token) => {
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await User.findById(decoded.id);
  return user;
};

// 2. 权限检查
const checkPermission = (user, permission, resource) => {
  // 获取角色权限配置
  const rolePermissions = ROLE_PERMISSIONS[user.role];

  // 检查数据范围权限
  const hasScopePermission = checkDataScope(user, resource);

  // 检查操作权限
  const hasOperationPermission = rolePermissions.includes(permission);

  // 检查数据类型权限
  const hasDataTypePermission = checkDataTypePermission(user, resource);

  return hasScopePermission && hasOperationPermission && hasDataTypePermission;
};

// 3. 权限中间件使用示例
app.use('/api/v1/finance/*',
  authenticate(),                                   // 1. 认证
  authorize(PERMISSION_LEVELS.WRITE, 'finance') // 2. 授权
);
```

## 🔒 2. 敏感数据脱敏

### 数据敏感性分级

```javascript
const DATA_SENSITIVITY = {
  PUBLIC: 'public',           // 公开数据 - 无需脱敏
  INTERNAL: 'internal',       // 内部数据 - 部分脱敏
  SENSITIVE: 'sensitive',     // 敏感数据 - 大部分脱敏
  CONFIDENTIAL: 'confidential' // 机密数据 - 完全脱敏
};
```

### 敏感字段分类

#### 身份信息 (PERSONAL)
```javascript
const PERSONAL_FIELDS = [
  'idCard',           // 身份证号
  'passport',         // 护照号
  'socialSecurityNumber' // 社保号
];
```

#### 联系信息 (CONTACT)
```javascript
const CONTACT_FIELDS = [
  'phone',            // 电话号码
  'email',            // 电子邮箱
  'address',          // 详细地址
  'wechatId'          // 微信号
];
```

#### 金融信息 (FINANCIAL)
```javascript
const FINANCIAL_FIELDS = [
  'bankAccount',      // 银行账号
  'creditCard',       // 信用卡号
  'insuranceNumber',  // 保险号
  'taxId'             // 税号
];
```

#### 健康信息 (HEALTH)
```javascript
const HEALTH_FIELDS = [
  'medicalRecord',    // 病历号
  'bloodType',        // 血型
  'allergies',        // 过敏史
  'medications',      // 用药记录
  'diseases'          // 疾病史
];
```

### 脱敏规则定义

#### 身份证脱敏
```javascript
// 原始值: 110101199001011234
// 脱敏后: 110101********1234
const maskIdCard = (idCard) => {
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};
```

#### 电话号码脱敏
```javascript
// 原始值: 13812345678
// 脱敏后: 138****5678
const maskPhone = (phone) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};
```

#### 邮箱地址脱敏
```javascript
// 原始值: zhangsan@example.com
// 脱敏后: zh****@example.com
const maskEmail = (email) => {
  return email.replace(/(.{2}).*(@.*)/, '$1****$2');
};
```

#### 银行账号脱敏
```javascript
// 原始值: 6222020012345678901
// 脱敏后: 6222********8901
const maskBankAccount = (account) => {
  return account.replace(/(\d{4})\d*(\d{4})/, '$1****$2');
};
```

### 动态脱敏策略

```javascript
// 基于用户角色的脱敏策略
const getDesensitizationStrategy = (userRole, dataType) => {
  const strategies = {
    [ROLES.SUPER_ADMIN]: {
      // 超级管理员可以看到所有数据（生产环境建议也脱敏）
      [DATA_SENSITIVITY.CONFIDENTIAL]: 'partial',
      [DATA_SENSITIVITY.SENSITIVE]: 'minimal',
      [DATA_SENSITIVITY.INTERNAL]: 'none',
      [DATA_SENSITIVITY.PUBLIC]: 'none'
    },

    [ROLES.VILLAGE_ADMIN]: {
      [DATA_SENSITIVITY.CONFIDENTIAL]: 'full',
      [DATA_SENSITIVITY.SENSITIVE]: 'partial',
      [DATA_SENSITIVITY.INTERNAL]: 'minimal',
      [DATA_SENSITIVITY.PUBLIC]: 'none'
    },

    [ROLES.RESIDENT]: {
      [DATA_SENSITIVITY.CONFIDENTIAL]: 'full',
      [DATA_SENSITIVITY.SENSITIVE]: 'full',
      [DATA_SENSITIVITY.INTERNAL]: 'partial',
      [DATA_SENSITIVITY.PUBLIC]: 'none'
    }
  };

  return strategies[userRole] || strategies[ROLES.GUEST];
};

// 应用脱敏处理
const applyDesensitization = (data, userRole) => {
  const strategy = getDesensitizationStrategy(userRole);

  for (const [sensitivity, level] of Object.entries(strategy)) {
    const fields = SENSITIVE_FIELDS[sensitivity];

    if (level === 'full') {
      // 完全脱敏
      fields.forEach(field => {
        if (data[field]) {
          data[field] = '***';
        }
      });
    } else if (level === 'partial') {
      // 部分脱敏
      fields.forEach(field => {
        if (data[field]) {
          data[field] = maskField(field, data[field]);
        }
      });
    }
  }

  return data;
};
```

## 📝 3. 操作日志审计

### 审计日志结构

```javascript
const auditRecord = {
  // 基础信息
  id: 'uuid-v4',                    // 记录唯一标识
  timestamp: '2024-01-01T12:00:00Z', // 操作时间戳
  timestampUnix: 1704110400,        // Unix时间戳

  // 操作信息
  type: 'DATA_UPDATE',              // 操作类型
  action: 'update_resident_info',   // 具体操作
  resource: 'residents',            // 资源类型
  resourceType: 'document',         // 资源子类型
  resourceId: 'resident_001',        // 资源ID

  // 用户信息
  userId: 'user_001',               // 操作用户ID
  userName: '张三',                 // 操作用户姓名
  userRole: 'village_admin',        // 用户角色
  villageId: 'village_001',         // 用户所属村庄

  // 请求信息
  requestId: 'req_001',             // 请求ID
  sessionId: 'sess_001',            // 会话ID
  ip: '192.168.1.100',            // IP地址
  userAgent: 'Mozilla/5.0...',     // 用户代理
  endpoint: '/api/v1/residents/001', // API端点
  method: 'PUT',                   // HTTP方法

  // 操作结果
  status: 'success',                // 操作状态
  errorCode: null,                 // 错误代码
  errorMessage: null,               // 错误信息

  // 数据信息
  dataType: 'personal',             // 数据类型
  dataCount: 1,                    // 数据条数
  sensitivity: 'sensitive',         // 数据敏感性

  // 变更信息
  beforeState: {                   // 变更前状态
    name: '张三',
    phone: '13812345678'
  },
  afterState: {                    // 变更后状态
    name: '张三',
    phone: '138****5678'
  },
  changedFields: ['phone'],        // 变更字段列表

  // 权限信息
  requiredPermissions: ['write'],  // 所需权限
  grantedPermissions: ['write'],  // 已授予权限
  permissionCheckResult: true,    // 权限检查结果

  // 安全信息
  securityEvent: false,           // 是否为安全事件
  riskLevel: 'low',                // 风险级别
  threatDetected: false,           // 是否检测到威胁

  // 元数据
  metadata: {
    department: '村委会',
    grid: '第一网格',
    operationSource: 'web_platform'
  }
};
```

### 操作类型定义

```javascript
const OPERATION_TYPES = {
  // 认证操作
  LOGIN: 'login',                    // 登录
  LOGOUT: 'logout',                  // 登出
  PASSWORD_CHANGE: 'password_change', // 密码修改
  PASSWORD_RESET: 'password_reset',   // 密码重置

  // 数据操作
  DATA_CREATE: 'data_create',        // 数据创建
  DATA_READ: 'data_read',            // 数据读取
  DATA_UPDATE: 'data_update',        // 数据更新
  DATA_DELETE: 'data_delete',        // 数据删除
  DATA_EXPORT: 'data_export',        // 数据导出
  DATA_IMPORT: 'data_import',        // 数据导入

  // 权限操作
  ROLE_ASSIGN: 'role_assign',        // 角色分配
  ROLE_REVOKE: 'role_revoke',        // 角色撤销
  PERMISSION_GRANT: 'permission_grant', // 权限授予
  PERMISSION_REVOKE: 'permission_revoke', // 权限撤销

  // 业务操作
  ANNOUNCEMENT_CREATE: 'announcement_create',   // 公告创建
  ANNOUNCEMENT_UPDATE: 'announcement_update',   // 公告更新
  ANNOUNCEMENT_DELETE: 'announcement_delete',   // 公告删除

  FINANCE_TRANSACTION: 'finance_transaction',   // 财务交易
  FINANCE_APPROVAL: 'finance_approval',         // 财务审批

  VOTE_CREATE: 'vote_create',                   // 投票创建
  VOTE_PARTICIPATE: 'vote_participate',         // 投票参与
  VOTE_COUNT: 'vote_count',                     // 投票统计

  // 安全操作
  SECURITY_BREACH: 'security_breach',         // 安全漏洞
  UNAUTHORIZED_ACCESS: 'unauthorized_access', // 未授权访问
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'  // 可疑活动
};
```

### 审计事件示例

#### 用户登录事件
```javascript
const loginEvent = {
  type: OPERATION_TYPES.LOGIN,
  action: 'user_login',
  resource: 'auth_system',
  resourceType: 'authentication',
  userId: 'user_001',
  userName: '张三',
  userRole: 'village_admin',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  status: 'success',
  metadata: {
    loginMethod: 'password',
    mfaEnabled: true,
    deviceType: 'desktop'
  }
};
```

#### 数据修改事件
```javascript
const dataUpdateEvent = {
  type: OPERATION_TYPES.DATA_UPDATE,
  action: 'update_resident_phone',
  resource: 'residents',
  resourceType: 'personal_info',
  resourceId: 'resident_001',
  userId: 'admin_001',
  userName: '管理员',
  userRole: 'village_admin',
  ip: '192.168.1.50',
  status: 'success',
  dataType: 'personal',
  sensitivity: 'sensitive',
  beforeState: {
    phone: '13812345678',
    updatedAt: '2024-01-01T10:00:00Z'
  },
  afterState: {
    phone: '138****5678',
    updatedAt: '2024-01-01T12:00:00Z'
  },
  changedFields: ['phone', 'updatedAt'],
  metadata: {
    modificationReason: '用户联系方式更新',
    approvedBy: 'party_secretary'
  }
};
```

#### 安全事件
```javascript
const securityEvent = {
  type: OPERATION_TYPES.UNAUTHORIZED_ACCESS,
  action: 'unauthorized_data_access',
  resource: 'financial_records',
  resourceType: 'sensitive_data',
  userId: 'user_999',
  userName: '未知用户',
  userRole: 'resident',
  ip: '10.0.0.99',
  status: 'blocked',
  dataType: 'financial',
  sensitivity: 'confidential',
  securityEvent: true,
  riskLevel: 'high',
  threatDetected: true,
  errorMessage: '用户尝试访问无权限的财务数据',
  metadata: {
    attemptedResource: 'bank_account_list',
    accessDenied: true,
    blockedBy: 'access_control_system'
  }
};
```

### 审计查询功能

#### 按用户查询
```javascript
// 查询特定用户的操作日志
const userAuditLogs = await auditLogger.queryLogs({
  userId: 'user_001',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  limit: 100
});
```

#### 按操作类型查询
```javascript
// 查询所有数据导出操作
const exportAuditLogs = await auditLogger.queryLogs({
  type: OPERATION_TYPES.DATA_EXPORT,
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  limit: 50
});
```

#### 按风险级别查询
```javascript
// 查询高风险安全事件
const securityAuditLogs = await auditLogger.queryLogs({
  status: OPERATION_STATUS.BLOCKED,
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  limit: 100
});
```

### 审计报告生成

#### 月度安全报告
```javascript
const monthlySecurityReport = await auditLogger.generateReport(
  '2024-01-01',
  '2024-01-31',
  'security'
);

// 报告内容
const report = {
  period: { startDate: '2024-01-01', endDate: '2024-01-31' },
  totalEvents: 15420,
  eventsByType: {
    'login': 5230,
    'data_update': 8920,
    'data_export': 120,
    'security_breach': 2,
    'unauthorized_access': 15
  },
  eventsByRisk: {
    'high': 25,
    'medium': 450,
    'low': 14945
  },
  blockedAttempts: 150,
  suspiciousActivities: [
    {
      timestamp: '2024-01-15T14:30:00Z',
      userId: 'user_999',
      ip: '10.0.0.99',
      operation: 'unauthorized_access',
      riskLevel: 'high'
    }
  ],
  recommendations: [
    {
      priority: 'high',
      type: 'access_control',
      message: '检测到异常访问模式，建议加强访问控制'
    }
  ]
};
```

## 🔐 4. 数据加密保护

### 加密算法体系

#### 对称加密 (AES-256-GCM)
```javascript
// 数据加密
const encryptedData = encryptionService.aesEncrypt('敏感数据内容');

// 输出示例
{
  algorithm: 'aes-256-gcm',
  encrypted: 'a1b2c3d4e5f6...',
  iv: '1234567890abcdef',
  tag: 'fedcba0987654321',
  encoding: 'hex'
}

// 数据解密
const decryptedData = encryptionService.aesDecrypt(encryptedData);
// 返回: '敏感数据内容'
```

#### 非对称加密 (RSA-2048)
```javascript
// 生成密钥对
const keyPair = encryptionService.generateRSAKeyPair();

// 公钥加密
const encryptedMessage = encryptionService.rsaEncrypt(
  '重要消息内容',
  keyPair.publicKey
);

// 私钥解密
const decryptedMessage = encryptionService.rsaDecrypt(
  encryptedMessage,
  keyPair.privateKey
);
```

#### 密码哈希 (PBKDF2)
```javascript
// 密码哈希
const passwordHash = encryptionService.hash('userPassword123');

// 输出示例
{
  hash: 'a1b2c3d4e5f6...',
  salt: '1234567890abcdef...',
  algorithm: 'sha256',
  iterations: 100000
}

// 密码验证
const isValid = encryptionService.verifyHash(
  'userPassword123',
  passwordHash
);
```

### 字段级加密策略

#### 数据库存储加密
```javascript
// 用户模型加密中间件
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },           // 明文存储
  phone: { type: String, required: true, encrypt: true }, // 加密存储
  idCard: { type: String, required: true, encrypt: true }, // 加密存储
  email: { type: String, encrypt: true }                  // 加密存储
});

// 自动加密/解密中间件
userSchema.pre('save', function(next) {
  if (this.isModified('phone')) {
    this.phone = encryptionService.aesEncrypt(this.phone);
  }
  if (this.isModified('idCard')) {
    this.idCard = encryptionService.aesEncrypt(this.idCard);
  }
  next();
});

userSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.phone && typeof doc.phone === 'object') {
        doc.phone = encryptionService.aesDecrypt(doc.phone);
      }
    });
  }
});
```

#### API传输加密
```javascript
// 响应加密中间件
app.use('/api/v1/sensitive/*',
  securityMiddleware.encryptResponse('sensitive')
);

// 请求解密中间件
app.use('/api/v1/sensitive/*',
  securityMiddleware.decryptRequest('sensitive')
);
```

### 密钥管理

#### 主密钥配置
```bash
# 环境变量配置
export ENCRYPTION_MASTER_KEY=3a1b2c3d4e5f6789012345678901234567890abcdef12345678901234567890ab

# 生产环境建议使用密钥管理服务
# export KMS_KEY_ID=projects/project-id/locations/location/keyRings/key-ring/cryptoKeys/key-name
```

#### 密钥轮转策略
```javascript
// 自动密钥轮转 (30天)
const encryptionService = new EncryptionService({
  keyRotationInterval: 30 * 24 * 60 * 60 * 1000,
  rotationStrategy: 'time_based'
});

// 手动密钥轮转
await encryptionService.rotateKeys();
```

## 🚨 5. 安全监控与响应

### 实时安全监控

#### 异常行为检测
```javascript
// 可疑活动检测
const suspiciousPatterns = {
  // 短时间内大量登录失败
  multipleFailedLogins: {
    threshold: 5,
    window: 5 * 60 * 1000, // 5分钟
    action: 'block_ip'
  },

  // 异常数据访问
  unusualDataAccess: {
    threshold: 100,
    window: 1 * 60 * 60 * 1000, // 1小时
    action: 'alert_admin'
  },

  // 批量数据导出
  bulkDataExport: {
    threshold: 1000,
    window: 10 * 60 * 1000, // 10分钟
    action: 'require_approval'
  }
};
```

#### 安全事件告警
```javascript
// 安全告警规则
const securityAlerts = {
  // 高风险事件立即通知
  highRiskEvents: [
    OPERATION_TYPES.SECURITY_BREACH,
    OPERATION_TYPES.UNAUTHORIZED_ACCESS
  ],

  // 中风险事件每日汇总
  mediumRiskEvents: [
    OPERATION_TYPES.SUSPICIOUS_ACTIVITY,
    OPERATION_TYPES.DATA_EXPORT
  ],

  // 通知渠道
  notificationChannels: ['email', 'sms', 'webhook', 'slack']
};
```

### 应急响应流程

#### 安全事件处理流程
```javascript
// 1. 事件检测
const detectSecurityEvent = async (event) => {
  if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
    // 立即响应
    await handleHighRiskEvent(event);
  } else {
    // 记录并监控
    await logSecurityEvent(event);
    await updateRiskProfile(event);
  }
};

// 2. 高风险事件处理
const handleHighRiskEvent = async (event) => {
  // 阻止相关IP
  await securityMiddleware.blockIP(event.ip, 24 * 60 * 60 * 1000);

  // 通知管理员
  await sendSecurityAlert(event);

  // 启动应急响应
  await initiateEmergencyResponse(event);

  // 记录事件
  await auditLogger.log(event, {
    securityEvent: true,
    riskLevel: 'critical'
  });
};

// 3. 应急响应措施
const initiateEmergencyResponse = async (event) => {
  const response = {
    event,
    actions: [],
    timestamp: new Date()
  };

  switch (event.type) {
    case OPERATION_TYPES.SECURITY_BREACH:
      response.actions.push('isolate_affected_systems');
      response.actions.push('rotate_all_keys');
      response.actions.push('notify_security_team');
      break;

    case OPERATION_TYPES.UNAUTHORIZED_ACCESS:
      response.actions.push('lock_user_account');
      response.actions.push('invalidate_sessions');
      response.actions.push('force_password_reset');
      break;
  }

  return response;
};
```

### 合规性保障

#### 数据保护合规
```javascript
// GDPR合规检查
const gdprCompliance = {
  // 数据最小化原则
  dataMinimization: (data) => {
    const allowedFields = ['name', 'email', 'phone'];
    return Object.keys(data)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});
  },

  // 存储期限限制
  retentionPeriods: {
    personal: 7 * 365 * 24 * 60 * 60 * 1000, // 7年
    financial: 10 * 365 * 24 * 60 * 60 * 1000, // 10年
    audit: 10 * 365 * 24 * 60 * 60 * 1000   // 10年
  },

  // 用户权利保障
  userRights: ['access', 'rectification', 'erasure', 'portability']
};

// 等级保护合规
const levelProtection = {
  // 三级保护要求
  level3Requirements: {
    authentication: 'multi_factor',
    encryption: 'aes256_minimum',
    audit: 'comprehensive_logging',
    backup: 'daily_backup',
    access_control: 'role_based',
    security_training: 'mandatory'
  }
};
```

## 📋 6. 安全配置指南

### 环境变量配置
```bash
# 加密配置
ENCRYPTION_MASTER_KEY=your-super-secret-master-key-256-bits
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_KEY_ROTATION_INTERVAL=2592000000

# JWT配置
JWT_SECRET=your-jwt-secret-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# 安全配置
ENABLE_TWO_FACTOR_AUTH=true
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900000
SESSION_TIMEOUT=3600000

# 审计配置
AUDIT_LOG_LEVEL=detailed
AUDIT_RETENTION_PERIOD=31536000000
AUDIT_EXPORT_ENCRYPTION=true
```

### 中间件集成示例

```javascript
const express = require('express');
const { securityMiddleware } = require('./securityMiddleware');

const app = express();

// 综合安全中间件配置
app.use('/api/v1/residents/*', securityMiddleware.comprehensive({
  requireAuth: true,
  permissions: [
    { permission: 'read', resourceType: 'resident_info' },
    { permission: 'write', resourceType: 'resident_info' }
  ],
  roles: [ROLES.VILLAGE_ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.VILLAGE_OFFICER],
  rateLimitOptions: {
    windowMs: 60 * 1000,
    max: 60
  },
  auditOperations: {
    type: OPERATION_TYPES.DATA_UPDATE,
    action: 'resident_info_management',
    resource: 'residents',
    sensitivity: 'sensitive'
  },
  encryptResponse: true,
  decryptRequest: true,
  dataAccessType: 'personal'
}));
```

### 数据库安全配置

```javascript
// MongoDB安全配置
const mongoOptions = {
  authSource: 'admin',
  ssl: true,
  sslValidate: true,
  sslCA: fs.readFileSync('/path/to/ca.pem'),
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
};

// Redis安全配置
const redisOptions = {
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  tls: true,
  rejectUnauthorized: true,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};
```

## 🔧 7. 安全最佳实践

### 开发安全实践

#### 1. 安全编码规范
```javascript
// ❌ 错误示例 - SQL注入风险
const unsafeQuery = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ 正确示例 - 使用参数化查询
const safeQuery = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(safeQuery, [userId]);
```

#### 2. 输入验证
```javascript
const { body, validationResult } = require('express-validator');

// 输入验证中间件
const validateUserInput = [
  body('name').isLength({ min: 2, max: 50 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('phone').isMobilePhone('zh-CN'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];
```

#### 3. 输出编码
```javascript
const xss = require('xss');

// XSS防护中间件
const xssProtection = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    if (data && typeof data === 'object') {
      // 对输出内容进行XSS过滤
      data = JSON.parse(xss(JSON.stringify(data)));
    }
    return originalJson.call(this, data);
  };

  next();
};
```

### 运维安全实践

#### 1. 定期安全检查
```bash
#!/bin/bash
# security-check.sh - 定期安全检查脚本

echo "🔒 开始安全检查..."

# 依赖包漏洞扫描
echo "📦 检查依赖包漏洞..."
npm audit --audit-level high

# 代码安全扫描
echo "🔍 运行代码安全扫描..."
npm run security:scan

# 密钥轮转检查
echo "🔐 检查密钥轮转状态..."
node -e "console.log(require('./src/security/encryption').getEncryptionStatus())"

# 权限配置检查
echo "👥 检查权限配置..."
node -e "console.log(require('./src/security/accessControl').checkPermissions())"

# 审计日志检查
echo "📋 检查审计日志..."
node -e "console.log(require('./src/security/auditLogger').getQueueStatus())"

echo "✅ 安全检查完成"
```

#### 2. 安全监控告警
```javascript
// security-monitor.js - 安全监控服务
const securityMonitor = {
  async start() {
    // 每小时安全检查
    setInterval(async () => {
      await this.performSecurityCheck();
    }, 60 * 60 * 1000);

    // 每日安全报告
    setInterval(async () => {
      await this.generateDailySecurityReport();
    }, 24 * 60 * 60 * 1000);
  },

  async performSecurityCheck() {
    const checks = [
      'authentication_events',
      'unauthorized_access',
      'data_export_activities',
      'failed_login_attempts',
      'suspicious_activities'
    ];

    for (const check of checks) {
      const result = await this.checkSecurityMetric(check);
      if (result.alert) {
        await this.sendSecurityAlert(result);
      }
    }
  }
};
```

## 📊 8. 安全指标监控

### 安全KPI指标

| 指标类别 | 指标名称 | 正常值 | 告警阈值 |
|----------|----------|--------|----------|
| **认证安全** | 登录失败率 | < 1% | > 5% |
| **访问控制** | 未授权访问次数 | 0 | > 10/天 |
| **数据保护** | 敏感数据访问异常 | 0 | > 5/天 |
| **系统安全** | 安全事件数量 | 0 | > 1/天 |
| **合规审计** | 审计日志完整性 | 100% | < 99% |

### 安全仪表板
```javascript
// 安全仪表板API
app.get('/api/v1/security/dashboard', async (req, res) => {
  const securityStatus = {
    overview: {
      totalUsers: await User.countDocuments(),
      activeSessions: await Session.countDocuments(),
      blockedIPs: securityMiddleware.blockedIPs.size,
      securityEvents: await AuditLog.countDocuments({
        securityEvent: true,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    },

    authentication: {
      successfulLogins: await AuditLog.countDocuments({
        type: OPERATION_TYPES.LOGIN,
        status: OPERATION_STATUS.SUCCESS,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      failedLogins: await AuditLog.countDocuments({
        type: OPERATION_TYPES.LOGIN,
        status: OPERATION_STATUS.FAILURE,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      suspiciousLogins: await AuditLog.countDocuments({
        type: OPERATION_TYPES.SUSPICIOUS_ACTIVITY,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    },

    dataProtection: {
      encryptedFields: await EncryptedData.countDocuments(),
      encryptionStatus: encryptionService.getEncryptionStatus(),
      dataAccessViolations: await AuditLog.countDocuments({
        type: OPERATION_TYPES.UNAUTHORIZED_ACCESS,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    },

    audit: {
      totalAuditLogs: await AuditLog.countDocuments(),
      auditQueueSize: auditLogger.getQueueStatus().queueSize,
      logRetention: await this.calculateLogRetention(),
      complianceScore: await this.calculateComplianceScore()
    }
  };

  res.json({
    success: true,
    data: securityStatus,
    timestamp: new Date().toISOString()
  });
});
```

---

## 📞 技术支持与维护

### 联系方式
- **安全团队邮箱**: security@smart-village.com
- **安全事件报告**: security-alert@smart-village.com
- **技术咨询**: 18886990223@163.com

### 安全应急响应
- **紧急安全事件**: 立即致电 +86-188-8699-0223
- **数据泄露报告**: security-breach@smart-village.com
- **安全漏洞报告**: vulnerability@smart-village.com

---

**文档版本**: v1.0.0
**更新时间**: 2024年12月14日
**安全等级**: 等级保护三级
**维护单位**: Smart Village Security Team