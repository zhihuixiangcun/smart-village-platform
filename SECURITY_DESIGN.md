# 智慧村庄平台系统安全方案设计

## 🛡️ 安全方案概览

**文档版本**: v1.0  
**创建时间**: 2024年9月11日  
**适用范围**: 智慧村庄综合服务平台第三阶段  
**安全等级**: 中高级 (政务系统标准)

---

## 🎯 安全目标和原则

### 安全目标
- **数据机密性**: 敏感数据加密存储，传输过程加密保护
- **系统完整性**: 防止数据被篡改，确保业务逻辑正确执行  
- **服务可用性**: 系统稳定运行，抵御DDoS等攻击
- **身份认证**: 确保用户身份真实可信
- **访问控制**: 精细化权限管理，最小权限原则
- **审计追溯**: 完整记录系统操作，支持安全审计

### 安全原则
```
🔒 纵深防护原则: 多层安全防护，避免单点失效
🔐 最小权限原则: 用户和系统组件仅获得必需的最小权限  
🔍 默认安全原则: 系统默认配置采用最安全的选项
📝 安全审计原则: 关键操作全程记录，支持事后审计
🛠️ 安全开发原则: 从设计阶段就考虑安全，而非事后补救
♻️ 持续改进原则: 定期安全评估，持续优化安全策略
```

---

## 🔐 身份认证和授权架构

### 1. 多因素身份认证 (MFA)

#### 认证方式设计
```javascript
// 身份认证策略配置
const authenticationStrategy = {
  // 主认证方式
  primary: {
    method: 'username_password',
    passwordPolicy: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true, 
      requireNumbers: true,
      requireSpecialChars: true,
      passwordHistory: 5,        // 记住最近5个密码
      maxFailedAttempts: 5,      // 最多失败5次
      lockoutDuration: 30        // 锁定30分钟
    },
    sessionManagement: {
      jwtSecret: process.env.JWT_SECRET,
      accessTokenExpiry: '15m',   // 访问令牌15分钟
      refreshTokenExpiry: '7d',   // 刷新令牌7天
      maxConcurrentSessions: 3    // 最多3个并发会话
    }
  },
  
  // 二次认证方式
  secondary: {
    smsVerification: {
      enabled: true,
      codeLength: 6,
      expiry: 300,               // 验证码5分钟有效
      rateLimit: 5               // 每日最多发送5次
    },
    emailVerification: {
      enabled: true,
      tokenExpiry: 3600          // 邮件验证1小时有效
    },
    totpAuthenticator: {
      enabled: false,            // 二期功能
      issuer: 'Village Platform'
    }
  },
  
  // 生物识别认证 (移动端)
  biometric: {
    fingerprint: true,
    faceId: true,
    fallbackToPassword: true
  }
}
```

#### JWT令牌安全设计
```javascript
// JWT安全配置
const jwtSecurityConfig = {
  // 令牌加密
  encryption: {
    algorithm: 'RS256',          // RSA非对称加密
    publicKey: process.env.JWT_PUBLIC_KEY,
    privateKey: process.env.JWT_PRIVATE_KEY,
    keyRotation: '90d'           // 90天轮换密钥
  },
  
  // 令牌载荷
  payload: {
    iss: 'village-platform',    // 签发者
    aud: 'village-users',       // 受众
    sub: 'user_id',             // 主题(用户ID)
    exp: 'expiration_time',     // 过期时间
    iat: 'issued_at',           // 签发时间
    jti: 'jwt_id',              // 令牌唯一ID
    custom: {
      role: 'user_role',
      permissions: 'user_permissions',
      villageId: 'current_village',
      sessionId: 'session_id'
    }
  },
  
  // 令牌验证
  validation: {
    verifyIssuer: true,
    verifyAudience: true,
    verifyExpiration: true,
    clockTolerance: 60,          // 时钟偏差容忍60秒
    blacklistCheck: true         // 检查令牌黑名单
  }
}
```

### 2. 基于角色的访问控制 (RBAC)

#### 权限模型设计
```javascript
// RBAC权限模型
const rbacModel = {
  // 角色定义
  roles: {
    'super_admin': {
      name: '超级管理员',
      description: '系统最高权限',
      permissions: ['*:*'],      // 所有权限
      inherits: []
    },
    'village_director': {
      name: '村主任', 
      description: '村委会主任',
      permissions: [
        'daily_expense_management:*',
        'project_management:*',
        'budget_management:read,approve',
        'report_generation:*',
        'user_management:read,update'
      ],
      inherits: ['village_committee']
    },
    'village_secretary': {
      name: '村支书',
      description: '村党支部书记',
      permissions: [
        'daily_expense_management:*',
        'project_management:*',
        'budget_management:*',
        'report_generation:*',
        'user_management:*',
        'system_config:read,update'
      ],
      inherits: ['village_director']
    },
    'finance_manager': {
      name: '财务管理员',
      description: '村财务负责人',
      permissions: [
        'daily_expense_management:*',
        'budget_management:*',
        'report_generation:create,read',
        'project_management:read'
      ],
      inherits: ['village_committee']
    },
    'project_manager': {
      name: '项目经理',
      description: '项目负责人',
      permissions: [
        'project_management:*',
        'daily_expense_management:read',
        'report_generation:create,read'
      ],
      inherits: ['village_committee']
    },
    'village_committee': {
      name: '村委会成员',
      description: '基础村委会权限',
      permissions: [
        'daily_expense_management:read,create',
        'project_management:read',
        'report_generation:read'
      ],
      inherits: []
    }
  },
  
  // 资源定义
  resources: {
    'daily_expense_management': {
      name: '日常开支管理',
      actions: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'export']
    },
    'project_management': {
      name: '项目管理',
      actions: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'assign']
    },
    'budget_management': {
      name: '预算管理',
      actions: ['create', 'read', 'update', 'delete', 'approve', 'allocate']
    },
    'report_generation': {
      name: '报表生成',
      actions: ['create', 'read', 'export', 'schedule']
    },
    'user_management': {
      name: '用户管理',
      actions: ['create', 'read', 'update', 'delete', 'assign_role']
    },
    'system_config': {
      name: '系统配置',
      actions: ['read', 'update', 'backup', 'restore']
    }
  },
  
  // 动态权限检查
  permissionCheck: {
    contextual: true,            // 支持上下文权限
    dataLevel: true,             // 支持数据级权限
    timeBasedAccess: true,       // 支持时间限制
    ipRestriction: true          // 支持IP限制
  }
}
```

#### 权限中间件实现
```javascript
// 权限验证中间件
class PermissionMiddleware {
  // 检查资源权限
  static requirePermission(resource, action, options = {}) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        const { contextual = false, dataLevel = false } = options;
        
        // 基础权限检查
        if (!user.hasPermission(resource, action)) {
          return res.status(403).json({
            success: false,
            message: '权限不足',
            code: 'INSUFFICIENT_PERMISSION'
          });
        }
        
        // 上下文权限检查
        if (contextual) {
          const contextValid = await this.checkContextualPermission(
            user, resource, action, req
          );
          if (!contextValid) {
            return res.status(403).json({
              success: false,
              message: '上下文权限不足',
              code: 'CONTEXTUAL_PERMISSION_DENIED'
            });
          }
        }
        
        // 数据级权限检查
        if (dataLevel) {
          const dataAccess = await this.checkDataLevelPermission(
            user, resource, req.params.id
          );
          if (!dataAccess) {
            return res.status(403).json({
              success: false,
              message: '数据访问权限不足', 
              code: 'DATA_ACCESS_DENIED'
            });
          }
        }
        
        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          message: '权限检查失败',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    }
  }
  
  // 上下文权限检查
  static async checkContextualPermission(user, resource, action, req) {
    // 检查时间限制
    if (user.timeRestrictions) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour < user.timeRestrictions.startHour || 
          currentHour > user.timeRestrictions.endHour) {
        return false;
      }
    }
    
    // 检查IP限制
    if (user.ipRestrictions && user.ipRestrictions.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress;
      if (!user.ipRestrictions.includes(clientIP)) {
        return false;
      }
    }
    
    // 检查村庄权限
    if (req.body.villageId || req.params.villageId) {
      const villageId = req.body.villageId || req.params.villageId;
      if (!user.villages.includes(villageId)) {
        return false;
      }
    }
    
    return true;
  }
  
  // 数据级权限检查
  static async checkDataLevelPermission(user, resource, resourceId) {
    // 检查数据所有权
    if (resourceId) {
      const ResourceModel = require(`../models/${resource}`);
      const resourceData = await ResourceModel.findById(resourceId);
      
      if (resourceData) {
        // 检查是否为数据创建者
        if (resourceData.createdBy && 
            resourceData.createdBy.toString() === user._id.toString()) {
          return true;
        }
        
        // 检查是否在同一村庄
        if (resourceData.villageId && 
            user.villages.includes(resourceData.villageId.toString())) {
          return true;
        }
      }
    }
    
    return false;
  }
}
```

---

## 🔒 数据安全保护

### 1. 数据加密策略

#### 传输加密
```javascript
// HTTPS/TLS配置
const tlsConfig = {
  // SSL/TLS证书配置
  certificate: {
    cert: process.env.SSL_CERT,
    key: process.env.SSL_KEY,
    ca: process.env.SSL_CA,
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384'
    ].join(':'),
    honorCipherOrder: true,
    minVersion: 'TLSv1.2',      // 最低TLS 1.2
    maxVersion: 'TLSv1.3'       // 最高TLS 1.3
  },
  
  // HSTS配置
  hsts: {
    maxAge: 31536000,           // 1年
    includeSubDomains: true,
    preload: true
  },
  
  // 其他安全头
  securityHeaders: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin'
  }
}
```

#### 存储加密
```javascript
// 数据加密服务
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY;
  }
  
  // 敏感字段加密
  encryptSensitiveField(plaintext) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey);
    cipher.setAAD(Buffer.from('village-platform', 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm
    };
  }
  
  // 敏感字段解密
  decryptSensitiveField(encryptedData) {
    const { encrypted, iv, authTag, algorithm } = encryptedData;
    
    const decipher = crypto.createDecipher(algorithm, this.masterKey);
    decipher.setAAD(Buffer.from('village-platform', 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // 密码哈希
  hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
  
  // 密码验证
  verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
  
  // 数据脱敏
  maskSensitiveData(data, fieldMasks) {
    const maskedData = { ...data };
    
    Object.keys(fieldMasks).forEach(field => {
      if (maskedData[field]) {
        maskedData[field] = fieldMasks[field](maskedData[field]);
      }
    });
    
    return maskedData;
  }
}

// 字段脱敏规则
const dataMaskingRules = {
  phone: (value) => value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
  idCard: (value) => value.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2'),
  bankAccount: (value) => value.replace(/(\d{4})\d+(\d{4})/, '$1****$2'),
  email: (value) => value.replace(/(.{2}).+(.{2}@.+)/, '$1****$2')
};
```

### 2. 数据库安全配置

#### MongoDB安全配置
```javascript
// MongoDB安全配置
const mongoSecurityConfig = {
  // 认证配置
  authentication: {
    mechanism: 'SCRAM-SHA-256',
    database: 'admin',
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD
  },
  
  // 连接安全
  connection: {
    ssl: true,
    sslValidate: true,
    sslCA: process.env.MONGO_SSL_CA,
    sslCert: process.env.MONGO_SSL_CERT,
    sslKey: process.env.MONGO_SSL_KEY
  },
  
  // 访问控制
  accessControl: {
    enableAuth: true,
    users: [
      {
        user: 'app_user',
        pwd: process.env.MONGO_APP_PASSWORD,
        roles: [
          { role: 'readWrite', db: 'village_platform' }
        ]
      },
      {
        user: 'backup_user', 
        pwd: process.env.MONGO_BACKUP_PASSWORD,
        roles: [
          { role: 'backup', db: 'admin' }
        ]
      }
    ]
  },
  
  // 审计日志
  auditLog: {
    destination: 'file',
    format: 'JSON',
    path: '/var/log/mongodb/audit.log',
    filter: {
      atype: { $in: ['authenticate', 'createUser', 'dropUser', 'createRole', 'dropRole'] }
    }
  },
  
  // 网络安全
  network: {
    bindIp: '127.0.0.1,10.0.0.0/8',  // 限制访问IP
    port: 27017,
    maxIncomingConnections: 1000,
    unixDomainSocket: {
      enabled: false                   // 禁用Unix套接字
    }
  }
}
```

---

## 🛡️ 应用安全防护

### 1. 输入验证和注入防护

#### 输入验证框架
```javascript
// 统一输入验证中间件
class InputValidationMiddleware {
  // SQL注入防护
  static preventSQLInjection(req, res, next) {
    const sqlInjectionPattern = /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b)|('|\-\-|;|\||\*|\%)/i;
    
    const checkValue = (value) => {
      if (typeof value === 'string' && sqlInjectionPattern.test(value)) {
        return false;
      }
      return true;
    };
    
    const validateObject = (obj) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object') {
            if (!validateObject(obj[key])) return false;
          } else if (!checkValue(obj[key])) {
            return false;
          }
        }
      }
      return true;
    };
    
    if (!validateObject(req.body) || !validateObject(req.query) || !validateObject(req.params)) {
      return res.status(400).json({
        success: false,
        message: '输入包含不安全字符',
        code: 'INVALID_INPUT'
      });
    }
    
    next();
  }
  
  // XSS防护
  static preventXSS(req, res, next) {
    const xss = require('xss');
    
    const sanitizeValue = (value) => {
      if (typeof value === 'string') {
        return xss(value);
      }
      return value;
    };
    
    const sanitizeObject = (obj) => {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object') {
            sanitized[key] = sanitizeObject(obj[key]);
          } else {
            sanitized[key] = sanitizeValue(obj[key]);
          }
        }
      }
      return sanitized;
    };
    
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    
    next();
  }
  
  // CSRF防护
  static csrfProtection() {
    const csrf = require('csurf');
    return csrf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      }
    });
  }
}
```

#### 文件上传安全
```javascript
// 文件上传安全配置
const fileUploadSecurity = {
  // 文件类型白名单
  allowedFileTypes: {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
    compressed: ['.zip', '.rar']
  },
  
  // 文件大小限制
  fileSizeLimit: {
    image: 10 * 1024 * 1024,      // 10MB
    document: 50 * 1024 * 1024,   // 50MB
    total: 100 * 1024 * 1024      // 100MB
  },
  
  // 病毒扫描
  virusScanning: {
    enabled: true,
    quarantinePath: '/quarantine/',
    scanTimeout: 30000            // 30秒扫描超时
  },
  
  // 文件存储
  storage: {
    path: '/uploads/',
    nameGeneration: 'uuid',       // 使用UUID重命名
    preventExecution: true,       // 防止文件执行
    segregateByType: true         // 按类型分目录存储
  }
}

// 文件上传中间件
const secureFileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(fileUploadSecurity.storage.path, 
        fileUploadSecurity.storage.segregateByType ? getFileCategory(file.mimetype) : '');
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = uuidv4() + ext;
      cb(null, filename);
    }
  }),
  
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const category = getFileCategory(file.mimetype);
    
    if (!fileUploadSecurity.allowedFileTypes[category] || 
        !fileUploadSecurity.allowedFileTypes[category].includes(ext)) {
      return cb(new Error('不允许的文件类型'));
    }
    
    cb(null, true);
  },
  
  limits: {
    fileSize: fileUploadSecurity.fileSizeLimit.total
  }
});
```

### 2. 攻击防护和监控

#### 访问频率限制
```javascript
// 访问频率限制配置
const rateLimitConfig = {
  // 全局限制
  global: {
    windowMs: 15 * 60 * 1000,     // 15分钟窗口
    max: 1000,                    // 最多1000次请求
    message: '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // API限制
  api: {
    windowMs: 1 * 60 * 1000,      // 1分钟窗口
    max: 60,                      // 最多60次请求
    keyGenerator: (req) => {
      return req.ip + ':' + req.user?.id;
    }
  },
  
  // 登录限制
  auth: {
    windowMs: 15 * 60 * 1000,     // 15分钟窗口
    max: 5,                       // 最多5次登录尝试
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      return req.ip + ':login';
    }
  },
  
  // 文件上传限制
  upload: {
    windowMs: 60 * 60 * 1000,     // 1小时窗口
    max: 100,                     // 最多100个文件
    keyGenerator: (req) => {
      return req.user.id + ':upload';
    }
  }
}

// 智能频率限制
class IntelligentRateLimit {
  constructor() {
    this.suspiciousIPs = new Set();
    this.blacklistedIPs = new Set();
  }
  
  // 检测异常访问模式
  detectAnomalousPattern(req, res, next) {
    const ip = req.ip;
    const userAgent = req.get('User-Agent');
    const referer = req.get('Referer');
    
    // 检查可疑特征
    const suspiciousPatterns = [
      /bot|crawler|spider/i.test(userAgent),
      !referer && req.method === 'POST',
      req.url.includes('../') || req.url.includes('..\\'),
      Object.keys(req.query).length > 10
    ];
    
    const suspiciousCount = suspiciousPatterns.filter(Boolean).length;
    
    if (suspiciousCount >= 2) {
      this.suspiciousIPs.add(ip);
      
      // 记录可疑访问
      securityLogger.warn('Suspicious access pattern detected', {
        ip,
        userAgent,
        url: req.url,
        suspiciousCount
      });
      
      // 增加限制
      res.set('X-RateLimit-Limit', '10');
      res.set('X-RateLimit-Remaining', '10');
    }
    
    next();
  }
  
  // 动态调整限制
  adjustLimitByRisk(req, res, next) {
    const ip = req.ip;
    let maxRequests = rateLimitConfig.api.max;
    
    if (this.blacklistedIPs.has(ip)) {
      return res.status(403).json({
        success: false,
        message: 'IP地址已被封禁',
        code: 'IP_BLACKLISTED'
      });
    }
    
    if (this.suspiciousIPs.has(ip)) {
      maxRequests = Math.floor(maxRequests * 0.5); // 减少50%限制
    }
    
    req.rateLimit = { max: maxRequests };
    next();
  }
}
```

---

## 📊 安全审计和监控

### 1. 安全审计日志

#### 审计日志架构
```javascript
// 安全审计服务
class SecurityAuditService {
  constructor() {
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: '/var/log/security/audit.log' }),
        new winston.transports.File({ filename: '/var/log/security/security-error.log', level: 'error' })
      ]
    });
  }
  
  // 记录安全事件
  logSecurityEvent(eventType, details, severity = 'info') {
    const auditRecord = {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      userId: details.userId,
      sessionId: details.sessionId,
      ip: details.ip,
      userAgent: details.userAgent,
      resource: details.resource,
      action: details.action,
      result: details.result,
      details: details.additionalInfo,
      riskScore: this.calculateRiskScore(eventType, details)
    };
    
    this.auditLogger.log(severity, 'Security Event', auditRecord);
    
    // 高风险事件实时告警
    if (auditRecord.riskScore >= 8) {
      this.triggerSecurityAlert(auditRecord);
    }
  }
  
  // 计算风险评分
  calculateRiskScore(eventType, details) {
    let riskScore = 0;
    
    // 基础风险分数
    const baseRiskScores = {
      'LOGIN_FAILED': 3,
      'LOGIN_SUCCESS': 1,
      'PASSWORD_CHANGE': 4,
      'PERMISSION_DENIED': 5,
      'DATA_EXPORT': 6,
      'ADMIN_ACTION': 7,
      'SYSTEM_CONFIG_CHANGE': 9,
      'SUSPICIOUS_ACTIVITY': 8
    };
    
    riskScore += baseRiskScores[eventType] || 2;
    
    // 时间因素
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 2; // 非工作时间增加风险
    }
    
    // IP因素
    if (details.ip && this.isUnknownIP(details.ip)) {
      riskScore += 3;
    }
    
    // 频率因素
    if (this.isHighFrequencyAction(details.userId, eventType)) {
      riskScore += 2;
    }
    
    return Math.min(riskScore, 10); // 最高10分
  }
  
  // 触发安全告警
  async triggerSecurityAlert(auditRecord) {
    const alertMessage = {
      title: `高风险安全事件告警 - ${auditRecord.eventType}`,
      content: `
        用户ID: ${auditRecord.userId}
        IP地址: ${auditRecord.ip}
        事件时间: ${auditRecord.timestamp}
        风险评分: ${auditRecord.riskScore}/10
        事件详情: ${JSON.stringify(auditRecord.details)}
      `,
      level: 'critical',
      channels: ['email', 'sms', 'webhook']
    };
    
    await notificationService.sendAlert(alertMessage);
  }
}

// 审计事件类型定义
const auditEventTypes = {
  // 认证相关
  LOGIN_SUCCESS: '登录成功',
  LOGIN_FAILED: '登录失败',
  LOGOUT: '用户登出',
  PASSWORD_CHANGE: '密码修改',
  MFA_ENABLED: '启用多因素认证',
  
  // 权限相关
  PERMISSION_GRANTED: '权限授予',
  PERMISSION_DENIED: '权限拒绝',
  ROLE_CHANGE: '角色变更',
  
  // 数据操作
  DATA_CREATE: '数据创建',
  DATA_READ: '数据读取',
  DATA_UPDATE: '数据更新',
  DATA_DELETE: '数据删除',
  DATA_EXPORT: '数据导出',
  
  // 系统管理
  SYSTEM_CONFIG_CHANGE: '系统配置变更',
  USER_MANAGEMENT: '用户管理操作',
  BACKUP_RESTORE: '备份恢复操作',
  
  // 安全事件
  SUSPICIOUS_ACTIVITY: '可疑活动',
  BRUTE_FORCE_ATTACK: '暴力破解攻击',
  IP_BLACKLISTED: 'IP地址封禁'
};
```

### 2. 实时安全监控

#### 安全监控仪表板
```javascript
// 安全监控服务
class SecurityMonitoringService {
  constructor() {
    this.metrics = {
      failedLogins: new Map(),
      suspiciousIPs: new Map(), 
      highRiskEvents: [],
      systemHealth: {
        cpu: 0,
        memory: 0,
        disk: 0,
        connections: 0
      }
    };
    
    this.thresholds = {
      failedLoginThreshold: 10,      // 失败登录阈值
      suspiciousIPThreshold: 20,     // 可疑IP阈值
      highRiskEventThreshold: 5,     // 高风险事件阈值
      responseTimeThreshold: 5000    // 响应时间阈值(ms)
    };
    
    // 启动监控
    this.startMonitoring();
  }
  
  // 启动实时监控
  startMonitoring() {
    // 每分钟更新指标
    setInterval(() => {
      this.updateSecurityMetrics();
    }, 60000);
    
    // 每5分钟检查威胁
    setInterval(() => {
      this.analyzeThreatPatterns();
    }, 300000);
    
    // 每小时生成安全报告
    setInterval(() => {
      this.generateHourlySecurityReport();
    }, 3600000);
  }
  
  // 更新安全指标
  updateSecurityMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // 统计最近1小时的安全事件
    const recentEvents = this.getAuditEvents(oneHourAgo, now);
    
    this.metrics.failedLogins.clear();
    this.metrics.suspiciousIPs.clear();
    this.metrics.highRiskEvents = [];
    
    recentEvents.forEach(event => {
      if (event.eventType === 'LOGIN_FAILED') {
        const count = this.metrics.failedLogins.get(event.ip) || 0;
        this.metrics.failedLogins.set(event.ip, count + 1);
      }
      
      if (event.riskScore >= 7) {
        this.metrics.highRiskEvents.push(event);
      }
      
      if (event.eventType === 'SUSPICIOUS_ACTIVITY') {
        const count = this.metrics.suspiciousIPs.get(event.ip) || 0;
        this.metrics.suspiciousIPs.set(event.ip, count + 1);
      }
    });
  }
  
  // 威胁模式分析
  analyzeThreatPatterns() {
    // 检测暴力破解攻击
    this.metrics.failedLogins.forEach((count, ip) => {
      if (count >= this.thresholds.failedLoginThreshold) {
        this.handleBruteForceAttack(ip, count);
      }
    });
    
    // 检测可疑IP活动
    this.metrics.suspiciousIPs.forEach((count, ip) => {
      if (count >= this.thresholds.suspiciousIPThreshold) {
        this.handleSuspiciousIPActivity(ip, count);
      }
    });
    
    // 检测批量高风险事件
    if (this.metrics.highRiskEvents.length >= this.thresholds.highRiskEventThreshold) {
      this.handleHighRiskEventCluster(this.metrics.highRiskEvents);
    }
  }
  
  // 处理暴力破解攻击
  async handleBruteForceAttack(ip, attemptCount) {
    // 自动封禁IP
    await this.blacklistIP(ip, '暴力破解攻击', 24 * 60 * 60); // 封禁24小时
    
    // 发送告警通知
    await notificationService.sendAlert({
      title: '检测到暴力破解攻击',
      content: `IP地址 ${ip} 在1小时内失败登录 ${attemptCount} 次，已自动封禁24小时`,
      level: 'critical',
      channels: ['email', 'sms']
    });
    
    // 记录安全事件
    securityAuditService.logSecurityEvent('BRUTE_FORCE_ATTACK', {
      ip,
      attemptCount,
      action: 'IP_BLACKLISTED'
    }, 'critical');
  }
  
  // IP黑名单管理
  async blacklistIP(ip, reason, durationSeconds) {
    const blacklistEntry = {
      ip,
      reason,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + durationSeconds * 1000)
    };
    
    // 存储到Redis
    await redisClient.setex(
      `blacklist:${ip}`, 
      durationSeconds, 
      JSON.stringify(blacklistEntry)
    );
    
    // 更新防火墙规则
    await this.updateFirewallRules('block', ip);
  }
  
  // 生成安全监控仪表板数据
  generateDashboardData() {
    return {
      summary: {
        totalEvents: this.getTotalEventsLastHour(),
        failedLogins: Array.from(this.metrics.failedLogins.values()).reduce((a, b) => a + b, 0),
        suspiciousIPs: this.metrics.suspiciousIPs.size,
        highRiskEvents: this.metrics.highRiskEvents.length,
        systemHealth: this.metrics.systemHealth
      },
      charts: {
        eventTimeline: this.generateEventTimeline(),
        riskDistribution: this.generateRiskDistribution(),
        topAttackers: this.getTopAttackerIPs(),
        threatCategories: this.getThreatCategories()
      },
      alerts: this.getActiveAlerts()
    };
  }
}
```

---

## 🚨 应急响应和恢复

### 1. 安全事件响应流程

#### 事件响应等级
```javascript
// 安全事件响应等级定义
const incidentResponseLevels = {
  LEVEL_1: {
    name: '低级别事件',
    description: '常规安全事件，无需紧急处理',
    examples: ['失败登录尝试', '权限拒绝', '轻微配置错误'],
    responseTime: '4小时内',
    escalation: false,
    actions: ['记录日志', '监控趋势']
  },
  
  LEVEL_2: {
    name: '中级别事件', 
    description: '需要关注的安全事件',
    examples: ['可疑访问模式', '配置变更', '账户锁定'],
    responseTime: '1小时内',
    escalation: true,
    actions: ['详细分析', '加强监控', '通知管理员']
  },
  
  LEVEL_3: {
    name: '高级别事件',
    description: '严重安全威胁',
    examples: ['暴力破解攻击', '数据泄露风险', '系统入侵'],
    responseTime: '15分钟内',
    escalation: true,
    actions: ['立即响应', '隔离威胁', '通知所有相关人员']
  },
  
  LEVEL_4: {
    name: '关键级事件',
    description: '系统安全严重受损',
    examples: ['成功入侵', '大规模数据泄露', '系统完全妥协'],
    responseTime: '立即',
    escalation: true,
    actions: ['紧急响应', '系统隔离', '启动应急预案', '通知监管部门']
  }
};

// 自动化事件响应
class IncidentResponseSystem {
  constructor() {
    this.responseTeam = {
      securityManager: 'security@village-platform.com',
      systemAdmin: 'admin@village-platform.com',
      legalTeam: 'legal@village-platform.com'
    };
  }
  
  // 事件分类和响应
  async handleSecurityIncident(incident) {
    const level = this.classifyIncident(incident);
    const responseLevel = incidentResponseLevels[level];
    
    // 记录事件
    await this.logIncident(incident, level);
    
    // 执行自动响应措施
    await this.executeAutomaticResponse(incident, level);
    
    // 通知响应团队
    if (responseLevel.escalation) {
      await this.notifyResponseTeam(incident, level);
    }
    
    // 启动响应流程
    await this.initiateResponseWorkflow(incident, level);
  }
  
  // 事件分类
  classifyIncident(incident) {
    let riskScore = incident.riskScore || 0;
    
    // 基于风险评分分类
    if (riskScore >= 9) return 'LEVEL_4';
    if (riskScore >= 7) return 'LEVEL_3';
    if (riskScore >= 5) return 'LEVEL_2';
    return 'LEVEL_1';
  }
  
  // 自动响应措施
  async executeAutomaticResponse(incident, level) {
    switch (level) {
      case 'LEVEL_4':
        // 关键级：立即隔离
        await this.isolateCompromisedSystems();
        await this.enableEmergencyMode();
        await this.backupCriticalData();
        break;
        
      case 'LEVEL_3':
        // 高级别：限制访问
        await this.restrictSuspiciousAccess(incident.ip);
        await this.enableEnhancedMonitoring();
        await this.preserveEvidence(incident);
        break;
        
      case 'LEVEL_2':
        // 中级别：加强监控
        await this.increaseMonitoringFrequency();
        await this.flagSuspiciousActivity(incident);
        break;
        
      case 'LEVEL_1':
        // 低级别：记录和监控
        await this.updateThreatIntelligence(incident);
        break;
    }
  }
  
  // 系统隔离
  async isolateCompromisedSystems() {
    // 启用只读模式
    await systemConfigService.enableReadOnlyMode();
    
    // 断开外部连接
    await networkService.restrictOutboundConnections();
    
    // 通知所有用户
    await notificationService.broadcastEmergencyNotice({
      message: '系统检测到安全威胁，已启动应急模式',
      level: 'critical'
    });
  }
}
```

### 2. 数据备份和恢复策略

#### 备份策略配置
```javascript
// 数据备份策略
const backupStrategy = {
  // 备份类型
  types: {
    full: {
      frequency: 'daily',
      time: '02:00',
      retention: 30        // 保留30天
    },
    incremental: {
      frequency: 'hourly',
      retention: 7         // 保留7天
    },
    differential: {
      frequency: 'every_6_hours', 
      retention: 14        // 保留14天
    }
  },
  
  // 备份存储
  storage: {
    primary: {
      type: 'local',
      path: '/backup/primary/',
      encryption: true
    },
    secondary: {
      type: 'cloud',
      provider: 'alicloud_oss',
      bucket: 'village-platform-backup',
      encryption: true
    },
    offsite: {
      type: 'tape',
      location: '异地存储中心',
      frequency: 'weekly'
    }
  },
  
  // 备份验证
  validation: {
    checksum: true,
    testRestore: 'monthly',
    integrityCheck: 'weekly'
  }
};

// 备份服务
class BackupService {
  // 创建备份
  async createBackup(type = 'full') {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      // 创建备份元数据
      const backupMetadata = {
        id: backupId,
        type,
        timestamp,
        status: 'in_progress',
        size: 0,
        checksum: null
      };
      
      // 执行数据库备份
      const dbBackupResult = await this.backupDatabase(backupId);
      
      // 备份文件系统
      const filesBackupResult = await this.backupFiles(backupId);
      
      // 备份配置文件
      const configBackupResult = await this.backupConfigurations(backupId);
      
      // 计算总大小和校验和
      backupMetadata.size = dbBackupResult.size + filesBackupResult.size + configBackupResult.size;
      backupMetadata.checksum = this.calculateBackupChecksum(backupId);
      backupMetadata.status = 'completed';
      
      // 保存备份元数据
      await this.saveBackupMetadata(backupMetadata);
      
      // 上传到云存储
      await this.uploadToCloudStorage(backupId);
      
      return backupMetadata;
      
    } catch (error) {
      await this.handleBackupError(backupId, error);
      throw error;
    }
  }
  
  // 恢复系统
  async restoreSystem(backupId, options = {}) {
    const backup = await this.getBackupMetadata(backupId);
    
    if (!backup) {
      throw new Error('备份不存在');
    }
    
    // 验证备份完整性
    const isValid = await this.validateBackup(backup);
    if (!isValid) {
      throw new Error('备份文件已损坏');
    }
    
    try {
      // 停止服务
      if (options.stopServices) {
        await systemService.stopAllServices();
      }
      
      // 恢复数据库
      if (options.restoreDatabase !== false) {
        await this.restoreDatabase(backup);
      }
      
      // 恢复文件
      if (options.restoreFiles !== false) {
        await this.restoreFiles(backup);
      }
      
      // 恢复配置
      if (options.restoreConfig !== false) {
        await this.restoreConfigurations(backup);
      }
      
      // 重启服务
      if (options.stopServices) {
        await systemService.startAllServices();
      }
      
      return {
        success: true,
        backupId,
        timestamp: new Date(),
        message: '系统恢复完成'
      };
      
    } catch (error) {
      await this.handleRestoreError(backupId, error);
      throw error;
    }
  }
}
```

---

## 📋 安全配置清单

### 1. 生产环境安全配置

#### 服务器安全配置
```bash
#!/bin/bash
# 生产环境安全配置脚本

# 1. 操作系统安全加固
echo "开始操作系统安全加固..."

# 更新系统
apt-get update && apt-get upgrade -y

# 配置防火墙
ufw enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# 禁用不必要的服务
systemctl disable telnet
systemctl disable ftp
systemctl disable rsh
systemctl disable rlogin

# 配置SSH安全
cat >> /etc/ssh/sshd_config << EOF
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# 重启SSH服务
systemctl restart sshd

# 2. 应用安全配置
echo "配置应用安全..."

# Node.js 安全配置
cat > /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

# 3. 日志配置
echo "配置安全日志..."

# 创建日志目录
mkdir -p /var/log/village-platform/security
chown app:app /var/log/village-platform/security
chmod 750 /var/log/village-platform/security

# 配置日志轮转
cat > /etc/logrotate.d/village-platform << EOF
/var/log/village-platform/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 app app
    postrotate
        /bin/kill -USR1 `cat /var/run/village-platform.pid 2> /dev/null` 2> /dev/null || true
    endscript
}
EOF

echo "安全配置完成"
```

#### 应用配置模板
```javascript
// 生产环境安全配置
module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    trustProxy: true,
    timeout: 30000
  },
  
  // 安全配置
  security: {
    // CORS配置
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://village.example.com'],
      credentials: true,
      optionsSuccessStatus: 200
    },
    
    // Helmet安全头
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.example.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    },
    
    // 会话配置
    session: {
      name: 'village.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,  // 24小时
        sameSite: 'strict'
      },
      store: 'redis'
    }
  },
  
  // 数据库配置
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI,
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ssl: true,
        sslValidate: true,
        authSource: 'admin',
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000
      }
    },
    
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      tls: true,
      db: 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100
    }
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    transports: [
      {
        type: 'file',
        filename: '/var/log/village-platform/app.log',
        maxsize: 100 * 1024 * 1024,  // 100MB
        maxFiles: 10,
        tailable: true
      },
      {
        type: 'file',
        level: 'error',
        filename: '/var/log/village-platform/error.log',
        maxsize: 50 * 1024 * 1024,   // 50MB
        maxFiles: 5
      }
    ]
  }
};
```

### 2. 安全检查清单

#### 部署前安全检查
```markdown
## 🔍 部署前安全检查清单

### 应用代码安全
- [ ] 代码审查完成，无明显安全漏洞
- [ ] 依赖包安全扫描通过
- [ ] 敏感信息已移除（密码、密钥等）
- [ ] 错误处理不暴露敏感信息
- [ ] 输入验证覆盖所有用户输入
- [ ] 输出编码防止XSS攻击
- [ ] SQL注入防护措施就位
- [ ] CSRF保护机制启用

### 配置安全
- [ ] 生产环境配置文件安全
- [ ] 数据库连接加密配置
- [ ] 会话管理安全配置
- [ ] 文件上传安全限制
- [ ] API访问频率限制
- [ ] 错误日志不包含敏感信息

### 认证授权
- [ ] 强密码策略启用
- [ ] 多因素认证可用
- [ ] 会话超时配置合理
- [ ] 权限控制粒度适当
- [ ] 默认账户已删除或禁用
- [ ] 特权账户定期审查

### 网络安全
- [ ] HTTPS强制启用
- [ ] 防火墙规则配置正确
- [ ] 不必要端口已关闭
- [ ] DDoS防护措施就位
- [ ] 入侵检测系统启用
- [ ] 网络流量监控配置

### 数据保护
- [ ] 敏感数据加密存储
- [ ] 数据传输加密
- [ ] 数据备份策略实施
- [ ] 个人信息脱敏处理
- [ ] 数据访问日志记录
- [ ] 数据保留策略明确

### 监控审计
- [ ] 安全事件监控启用
- [ ] 审计日志完整记录
- [ ] 异常告警机制就位
- [ ] 日志轮转配置正确
- [ ] 安全仪表板可用
- [ ] 事件响应流程测试

### 合规性检查
- [ ] 符合数据保护法规要求
- [ ] 隐私政策更新并公布
- [ ] 用户同意机制完善
- [ ] 数据处理记录完整
- [ ] 安全培训材料准备
- [ ] 应急响应预案制定
```

---

**📅 文档创建时间**: 2024年9月11日  
**📋 文档版本**: v1.0  
**🔄 更新频率**: 月度更新  
**👥 维护团队**: 安全架构组

*本安全方案将根据威胁环境变化和系统发展持续更新优化*