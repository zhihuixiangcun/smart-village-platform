# 🔐 安全性指南

## 📖 文档概述

本文档详细描述了智慧村庄综合服务平台的安全架构、安全策略、安全实施方案和安全运维规范。

## 🎯 安全目标

### 核心安全原则
- **机密性 (Confidentiality)**: 确保敏感数据不被未授权访问
- **完整性 (Integrity)**: 确保数据不被未授权修改
- **可用性 (Availability)**: 确保系统服务持续可用
- **可追溯性 (Accountability)**: 确保所有操作可审计追踪
- **最小权限 (Least Privilege)**: 用户仅获得必要的最小权限

## 🏗️ 安全架构

### 多层防护体系
```
┌─────────────────────────────────────────────────────┐
│                    物理安全层                         │
│ • 机房访问控制  • 设备物理保护  • 环境监控             │
├─────────────────────────────────────────────────────┤
│                    网络安全层                         │
│ • 防火墙策略   • VPN访问      • DDoS防护              │
│ • 入侵检测     • 流量监控     • 网络隔离              │
├─────────────────────────────────────────────────────┤
│                  主机安全层                          │
│ • 操作系统加固  • 病毒防护    • 补丁管理              │
│ • 访问控制     • 日志审计     • 文件完整性检查         │  
├─────────────────────────────────────────────────────┤
│                  应用安全层                          │
│ • 身份认证     • 权限控制     • 输入验证              │
│ • 会话管理     • 错误处理     • 安全编码              │
├─────────────────────────────────────────────────────┤
│                  数据安全层                          │
│ • 数据加密     • 访问控制     • 数据脱敏              │
│ • 备份保护     • 密钥管理     • 隐私保护              │
└─────────────────────────────────────────────────────┘
```

## 🔐 身份认证与授权

### JWT认证机制
```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthenticationService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.tokenExpiry = process.env.JWT_EXPIRY || '24h';
    this.refreshTokenExpiry = '7d';
  }
  
  // 生成访问令牌
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      village: user.village,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      issuer: 'village-platform',
      audience: 'village-users'
    });
  }
  
  // 生成刷新令牌
  generateRefreshToken(userId) {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    
    // 存储到Redis，设置过期时间
    this.redisClient.setex(
      `refresh_token:${userId}`, 
      7 * 24 * 60 * 60, // 7天
      refreshToken
    );
    
    return refreshToken;
  }
  
  // 验证访问令牌
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'village-platform',
        audience: 'village-users'
      });
      
      return { valid: true, payload: decoded };
    } catch (error) {
      return { 
        valid: false, 
        error: error.name === 'TokenExpiredError' ? 'expired' : 'invalid'
      };
    }
  }
  
  // 刷新令牌
  async refreshAccessToken(refreshToken, userId) {
    const storedToken = await this.redisClient.get(`refresh_token:${userId}`);
    
    if (storedToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }
    
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return this.generateAccessToken(user);
  }
}
```

### 多因素认证 (MFA)
```javascript
// src/services/mfaService.js
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

class MFAService {
  // 生成TOTP密钥
  generateSecret(username) {
    const secret = speakeasy.generateSecret({
      name: username,
      service: '智慧村庄平台',
      length: 32
    });
    
    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url
    };
  }
  
  // 生成二维码
  async generateQRCode(otpauthUrl) {
    return await qrcode.toDataURL(otpauthUrl);
  }
  
  // 验证TOTP码
  verifyToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // 允许前后2个时间窗口的误差
    });
  }
  
  // 生成短信验证码
  generateSMSCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  // 发送短信验证码
  async sendSMSCode(phone, code) {
    // 存储验证码到Redis，5分钟过期
    await this.redisClient.setex(`sms_code:${phone}`, 300, code);
    
    // 调用短信服务发送验证码
    return await this.smsService.send(phone, `您的验证码是：${code}，5分钟内有效`);
  }
  
  // 验证短信验证码
  async verifySMSCode(phone, code) {
    const storedCode = await this.redisClient.get(`sms_code:${phone}`);
    return storedCode === code;
  }
}
```

### 基于角色的访问控制 (RBAC)
```javascript
// src/models/Permission.js
const permissionSchema = {
  code: String,           // 权限代码
  name: String,           // 权限名称
  resource: String,       // 资源标识
  action: String,         // 操作类型
  conditions: Object      // 条件限制
};

// src/models/Role.js
const roleSchema = {
  code: String,           // 角色代码
  name: String,           // 角色名称
  permissions: [String],  // 权限列表
  isSystem: Boolean,      // 是否系统角色
  description: String
};

// 权限定义
const PERMISSIONS = {
  // 村民管理权限
  'resident:read': '查看村民信息',
  'resident:write': '编辑村民信息',
  'resident:delete': '删除村民信息',
  'resident:export': '导出村民数据',
  
  // 财务管理权限
  'finance:read': '查看财务信息',
  'finance:write': '编辑财务信息',
  'finance:approve': '财务审批',
  'finance:report': '生成财务报表',
  
  // 村务管理权限
  'village:read': '查看村务信息',
  'village:write': '编辑村务信息',
  'village:publish': '发布公告通知',
  'village:vote': '发起投票决议',
  
  // 系统管理权限
  'system:user': '用户管理',
  'system:role': '角色管理',
  'system:config': '系统配置',
  'system:audit': '审计日志'
};

// 角色定义
const ROLES = {
  'village.resident': {
    name: '普通村民',
    permissions: [
      'resident:read:self',
      'village:read:public',
      'service:use'
    ]
  },
  
  'village.committee.accountant': {
    name: '村委会计',
    permissions: [
      'resident:read',
      'finance:read',
      'finance:write',
      'finance:report',
      'village:read'
    ]
  },
  
  'village.committee.director': {
    name: '村主任',
    permissions: [
      'resident:read',
      'resident:write',
      'finance:read',
      'finance:approve',
      'village:read',
      'village:write',
      'village:publish'
    ]
  },
  
  'village.committee.secretary': {
    name: '村支书',
    permissions: [
      '*' // 所有权限
    ]
  },
  
  'system.admin': {
    name: '系统管理员',
    permissions: [
      'system:user',
      'system:role',
      'system:config',
      'system:audit'
    ]
  }
};
```

### 权限检查中间件
```javascript
// src/middleware/permission.js
const checkPermission = (requiredPermissions) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user || !user.permissions) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 检查是否有超级权限
    if (user.permissions.includes('*')) {
      return next();
    }
    
    // 检查具体权限
    const hasPermission = requiredPermissions.some(permission => {
      return user.permissions.includes(permission);
    });
    
    if (!hasPermission) {
      // 记录权限越权尝试
      logger.warn('Permission denied', {
        userId: user.id,
        requiredPermissions,
        userPermissions: user.permissions,
        resource: req.path,
        ip: req.ip
      });
      
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
};

// 使用示例
router.get('/residents', 
  authenticate, 
  checkPermission(['resident:read']),
  getResidents
);

router.post('/finance/approve', 
  authenticate,
  checkPermission(['finance:approve']),
  approveFinance
);
```

## 🔒 数据安全

### 敏感数据加密
```javascript
// src/utils/encryption.js
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.masterKey = process.env.ENCRYPTION_KEY;
  }
  
  // 加密敏感数据
  encrypt(plaintext, associatedData = '') {
    const key = crypto.scryptSync(this.masterKey, 'salt', this.keyLength);
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, key, { iv });
    
    cipher.setAAD(Buffer.from(associatedData, 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }
  
  // 解密敏感数据
  decrypt(encryptedData, associatedData = '') {
    const key = crypto.scryptSync(this.masterKey, 'salt', this.keyLength);
    const decipher = crypto.createDecipher(
      this.algorithm, 
      key, 
      { 
        iv: Buffer.from(encryptedData.iv, 'hex'),
        authTag: Buffer.from(encryptedData.tag, 'hex')
      }
    );
    
    decipher.setAAD(Buffer.from(associatedData, 'utf8'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // 哈希处理（不可逆）
  hash(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
    return {
      hash: hash.toString('hex'),
      salt: salt
    };
  }
  
  // 验证哈希
  verifyHash(data, hash, salt) {
    const computed = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
    return computed.toString('hex') === hash;
  }
}

// 敏感字段处理
class SensitiveDataHandler {
  constructor() {
    this.encryptionService = new EncryptionService();
  }
  
  // 身份证号加密存储
  encryptIdCard(idCard) {
    return this.encryptionService.encrypt(idCard, 'idcard');
  }
  
  // 身份证号脱敏显示
  maskIdCard(encryptedIdCard) {
    if (!encryptedIdCard || !encryptedIdCard.encrypted) {
      return '***';
    }
    
    try {
      const idCard = this.encryptionService.decrypt(encryptedIdCard, 'idcard');
      return idCard.substring(0, 6) + '********' + idCard.substring(14);
    } catch (error) {
      return '***';
    }
  }
  
  // 手机号脱敏
  maskPhone(phone) {
    if (!phone || phone.length < 11) return '***';
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }
  
  // 地址脱敏
  maskAddress(address) {
    if (!address) return '***';
    const parts = address.split(/[省市县区]/);
    if (parts.length > 2) {
      return parts[0] + '省***市***区' + '***';
    }
    return '***';
  }
}
```

### 数据脱敏策略
```javascript
// src/middleware/dataMasking.js
const dataMaskingRules = {
  // 根据用户权限和数据关系决定脱敏级别
  getMaskingLevel(user, targetUserId, dataType) {
    // 自己的数据 - 完全访问
    if (user.id === targetUserId) {
      return 'full';
    }
    
    // 家庭成员 - 部分访问
    if (user.familyMembers && user.familyMembers.includes(targetUserId)) {
      return 'family';
    }
    
    // 村委会成员 - 工作需要访问
    if (user.role.includes('committee')) {
      return 'official';
    }
    
    // 其他情况 - 高度脱敏
    return 'public';
  },
  
  // 应用脱敏规则
  applyMasking(data, level, dataType) {
    const rules = {
      idCard: {
        full: data => data,
        family: data => this.maskIdCard(data),
        official: data => this.maskIdCard(data),
        public: data => '***'
      },
      phone: {
        full: data => data,
        family: data => data,
        official: data => this.maskPhone(data),
        public: data => '***'
      },
      address: {
        full: data => data,
        family: data => data,
        official: data => this.maskAddress(data),
        public: data => '***'
      },
      income: {
        full: data => data,
        family: data => data,
        official: data => data,
        public: data => null
      }
    };
    
    const rule = rules[dataType];
    if (!rule || !rule[level]) {
      return '***';
    }
    
    return rule[level](data);
  }
};

// 自动数据脱敏中间件
const autoDataMasking = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && typeof data === 'object' && req.user) {
      const maskedData = maskSensitiveData(data, req.user);
      return originalJson.call(this, maskedData);
    }
    return originalJson.call(this, data);
  };
  
  next();
};

function maskSensitiveData(data, user) {
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, user));
  }
  
  if (data && typeof data === 'object') {
    const masked = { ...data };
    
    // 对每个敏感字段应用脱敏
    for (const field in masked) {
      if (sensitiveFields.includes(field)) {
        const level = dataMaskingRules.getMaskingLevel(
          user, 
          data.userId || data.id, 
          field
        );
        masked[field] = dataMaskingRules.applyMasking(
          masked[field], 
          level, 
          field
        );
      }
    }
    
    return masked;
  }
  
  return data;
}

const sensitiveFields = [
  'idCard', 'phone', 'address', 'bankAccount', 
  'income', 'medicalInfo', 'familyInfo'
];
```

## 🛡️ 应用安全

### 输入验证与防护
```javascript
// src/middleware/inputValidation.js
const validator = require('validator');
const xss = require('xss');

class InputValidator {
  // 通用验证规则
  static validate(data, rules) {
    const errors = [];
    
    for (const field in rules) {
      const value = data[field];
      const rule = rules[field];
      
      // 必填验证
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // 跳过空值的其他验证
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }
      
      // 类型验证
      if (rule.type && !this.validateType(value, rule.type)) {
        errors.push(`${field} must be ${rule.type}`);
      }
      
      // 长度验证
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be at most ${rule.maxLength} characters`);
      }
      
      // 正则验证
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      
      // 自定义验证
      if (rule.custom && !rule.custom(value)) {
        errors.push(`${field} failed custom validation`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  static validateType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'email':
        return validator.isEmail(value);
      case 'phone':
        return /^1[3-9]\d{9}$/.test(value);
      case 'idCard':
        return this.validateIdCard(value);
      case 'url':
        return validator.isURL(value);
      default:
        return true;
    }
  }
  
  // 身份证号验证
  static validateIdCard(idCard) {
    if (!/^\d{17}[\dXx]$/.test(idCard)) {
      return false;
    }
    
    // 校验码验证
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * weights[i];
    }
    
    const checkCode = checkCodes[sum % 11];
    return checkCode === idCard[17].toUpperCase();
  }
}

// XSS防护
const xssProtection = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {
        p: [],
        br: [],
        strong: [],
        em: []
      }
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

// SQL注入防护
const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
    /(\'|\"|;|--|\*|\|)/,
    /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)\b)/i
  ];
  
  const checkForSqlInjection = (str) => {
    return sqlPatterns.some(pattern => pattern.test(str));
  };
  
  const scanObject = (obj, path = '') => {
    for (const key in obj) {
      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string' && checkForSqlInjection(value)) {
        logger.warn('SQL injection attempt detected', {
          path: currentPath,
          value: value,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(400).json({ 
          error: 'Invalid input detected' 
        });
      }
      
      if (typeof value === 'object' && value !== null) {
        const result = scanObject(value, currentPath);
        if (result) return result;
      }
    }
  };
  
  if (req.body && typeof req.body === 'object') {
    const result = scanObject(req.body);
    if (result) return result;
  }
  
  if (req.query && typeof req.query === 'object') {
    const result = scanObject(req.query);
    if (result) return result;
  }
  
  next();
};
```

### API安全防护
```javascript
// src/middleware/apiSecurity.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 速率限制配置
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// 不同类型的速率限制
const rateLimiters = {
  // 通用API限制
  general: createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests'),
  
  // 登录接口限制
  login: createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts'),
  
  // 短信验证码限制
  sms: createRateLimiter(60 * 1000, 1, 'SMS sent too frequently'),
  
  // 文件上传限制
  upload: createRateLimiter(60 * 60 * 1000, 50, 'Too many file uploads'),
  
  // 敏感操作限制
  sensitive: createRateLimiter(5 * 60 * 1000, 10, 'Too many sensitive operations')
};

// 安全头设置
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "wss:", "https:"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
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
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// 请求大小限制
const requestSizeLimit = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (req.headers['content-length'] > maxSize) {
    return res.status(413).json({ 
      error: 'Request entity too large' 
    });
  }
  
  next();
};

// API密钥验证（针对第三方集成）
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // 验证API密钥
  if (!isValidApiKey(apiKey)) {
    logger.warn('Invalid API key', {
      apiKey: apiKey.substring(0, 8) + '...',
      ip: req.ip,
      path: req.path
    });
    
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

function isValidApiKey(apiKey) {
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}
```

## 🔍 安全监控与审计

### 安全事件监控
```javascript
// src/services/securityMonitoring.js
const EventEmitter = require('events');

class SecurityMonitor extends EventEmitter {
  constructor() {
    super();
    this.suspiciousActivities = new Map();
    this.alertThresholds = {
      loginFailures: 5,        // 连续登录失败次数
      permissionViolations: 3, // 权限违规次数
      unusualAccess: 10        // 异常访问次数
    };
  }
  
  // 记录安全事件
  logSecurityEvent(event) {
    const securityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: event.type,
      severity: event.severity || 'low',
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
      resolved: false
    };
    
    // 持久化存储
    this.saveSecurityEvent(securityEvent);
    
    // 检查是否需要告警
    this.checkAlertConditions(securityEvent);
    
    this.emit('securityEvent', securityEvent);
  }
  
  // 检查告警条件
  checkAlertConditions(event) {
    const key = `${event.userId || event.ip}_${event.type}`;
    
    if (!this.suspiciousActivities.has(key)) {
      this.suspiciousActivities.set(key, {
        count: 1,
        firstOccurrence: event.timestamp,
        events: [event]
      });
    } else {
      const activity = this.suspiciousActivities.get(key);
      activity.count++;
      activity.events.push(event);
      
      // 检查是否达到告警阈值
      const threshold = this.alertThresholds[event.type];
      if (threshold && activity.count >= threshold) {
        this.triggerSecurityAlert(key, activity);
      }
    }
  }
  
  // 触发安全告警
  triggerSecurityAlert(key, activity) {
    const alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      type: 'security_alert',
      severity: 'high',
      title: this.getAlertTitle(activity.events[0].type),
      description: this.getAlertDescription(key, activity),
      events: activity.events,
      resolved: false
    };
    
    // 发送告警通知
    this.sendAlert(alert);
    
    // 自动响应措施
    this.autoResponse(alert);
    
    this.emit('securityAlert', alert);
  }
  
  // 自动响应措施
  autoResponse(alert) {
    const eventType = alert.events[0].type;
    
    switch (eventType) {
      case 'loginFailure':
        // 临时锁定账户
        this.temporaryLockAccount(alert.events[0].userId, 30); // 30分钟
        break;
        
      case 'permissionViolation':
        // 记录审计日志，可能需要人工审查
        this.flagForManualReview(alert);
        break;
        
      case 'unusualAccess':
        // 要求重新认证
        this.requireReAuthentication(alert.events[0].userId);
        break;
        
      case 'suspiciousIP':
        // 临时封禁IP
        this.temporaryBanIP(alert.events[0].ip, 60); // 60分钟
        break;
    }
  }
  
  // 安全事件类型定义
  getAlertTitle(eventType) {
    const titles = {
      loginFailure: '账户暴力破解攻击',
      permissionViolation: '权限越权尝试',
      unusualAccess: '异常访问行为',
      suspiciousIP: '可疑IP地址活动',
      dataExfiltration: '数据泄露风险',
      systemIntrusion: '系统入侵尝试'
    };
    
    return titles[eventType] || '未知安全事件';
  }
}

// 安全事件记录中间件
const securityEventLogger = (eventType) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // 记录安全相关的请求
      if (eventType || req.path.includes('/auth') || req.path.includes('/admin')) {
        securityMonitor.logSecurityEvent({
          type: eventType || 'api_access',
          userId: req.user?.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseSize: Buffer.byteLength(data, 'utf8')
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};
```

### 审计日志系统
```javascript
// src/services/auditLogger.js
class AuditLogger {
  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/audit.log',
          maxsize: 10485760, // 10MB
          maxFiles: 10
        }),
        new winston.transports.MongoDB({
          db: process.env.MONGO_URI,
          collection: 'audit_logs',
          options: { useUnifiedTopology: true }
        })
      ]
    });
  }
  
  // 记录操作审计
  logOperation(operation) {
    const auditRecord = {
      timestamp: new Date(),
      traceId: operation.traceId || this.generateTraceId(),
      userId: operation.userId,
      userRole: operation.userRole,
      action: operation.action,
      resource: operation.resource,
      resourceId: operation.resourceId,
      oldValue: operation.oldValue,
      newValue: operation.newValue,
      result: operation.result,
      ip: operation.ip,
      userAgent: operation.userAgent,
      sessionId: operation.sessionId,
      risk: this.calculateRiskScore(operation)
    };
    
    this.logger.info('Audit Log', auditRecord);
    
    // 高风险操作立即告警
    if (auditRecord.risk >= 8) {
      this.alertHighRiskOperation(auditRecord);
    }
  }
  
  // 计算风险分值
  calculateRiskScore(operation) {
    let score = 0;
    
    // 操作类型风险
    const actionRisks = {
      delete: 5,
      update: 3,
      export: 4,
      approve: 3,
      reject: 2,
      read: 1
    };
    score += actionRisks[operation.action] || 0;
    
    // 资源敏感性
    const resourceRisks = {
      user: 4,
      finance: 5,
      system_config: 8,
      sensitive_data: 7
    };
    score += resourceRisks[operation.resource] || 0;
    
    // 时间风险（非工作时间）
    const hour = new Date().getHours();
    if (hour < 8 || hour > 18) {
      score += 2;
    }
    
    // IP地址风险（非内网）
    if (operation.ip && !operation.ip.startsWith('192.168.')) {
      score += 3;
    }
    
    return Math.min(score, 10);
  }
  
  // 生成审计报告
  async generateAuditReport(startDate, endDate, filters = {}) {
    const query = {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // 应用过滤条件
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.minRisk) query.risk = { $gte: filters.minRisk };
    
    const auditLogs = await this.queryAuditLogs(query);
    
    const report = {
      period: { start: startDate, end: endDate },
      totalOperations: auditLogs.length,
      userActivity: this.aggregateUserActivity(auditLogs),
      resourceAccess: this.aggregateResourceAccess(auditLogs),
      riskAnalysis: this.analyzeRisks(auditLogs),
      anomalies: this.detectAnomalies(auditLogs),
      compliance: this.checkCompliance(auditLogs)
    };
    
    return report;
  }
}

// 审计中间件
const auditMiddleware = (action, resource) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // 记录操作结果
      auditLogger.logOperation({
        userId: req.user?.id,
        userRole: req.user?.role,
        action: action,
        resource: resource,
        resourceId: req.params.id,
        oldValue: req.originalData, // 需要在业务逻辑中设置
        newValue: req.body,
        result: res.statusCode < 400 ? 'success' : 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        traceId: req.traceId
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};
```

## 🔧 安全配置管理

### 环境变量安全
```bash
# .env.security
# 安全相关环境变量配置

# 加密密钥（32位随机字符串）
ENCRYPTION_KEY=your-32-character-encryption-key-here
JWT_SECRET=your-super-secret-jwt-signing-key-here
SESSION_SECRET=your-session-secret-key-here

# 数据库安全配置
DB_SSL=true
DB_AUTH_SOURCE=admin
DB_REPLICA_SET=rs0

# Redis安全配置  
REDIS_PASSWORD=your-redis-password-here
REDIS_TLS=true

# API安全配置
RATE_LIMIT_ENABLED=true
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com
TRUST_PROXY=true

# SSL/TLS配置
SSL_CERT_PATH=/etc/ssl/certs/village.crt
SSL_KEY_PATH=/etc/ssl/private/village.key
SSL_CA_PATH=/etc/ssl/certs/ca-certificates.crt

# 外部服务安全配置
SMS_API_KEY=your-sms-api-key
EMAIL_PASSWORD=your-email-app-password
OSS_ACCESS_SECRET=your-oss-secret-key

# 监控和告警
SECURITY_MONITORING=true
ALERT_WEBHOOK=https://hooks.slack.com/services/xxx
ALERT_EMAIL=security@your-domain.com
```

### 生产环境安全检查清单
```yaml
# security-checklist.yml
productionSecurityChecklist:
  infrastructure:
    - [ ] 服务器操作系统已更新到最新版本
    - [ ] 已安装最新安全补丁
    - [ ] 防火墙已正确配置，只开放必要端口
    - [ ] SSH密钥登录已启用，密码登录已禁用
    - [ ] 已配置入侵检测系统(IDS)
    - [ ] 已设置日志监控和告警
    
  application:
    - [ ] 所有依赖包已更新到最新安全版本
    - [ ] 生产环境使用强密码和密钥
    - [ ] 敏感数据已正确加密存储
    - [ ] API接口已实施速率限制
    - [ ] 输入验证和XSS防护已启用
    - [ ] CSRF保护已启用
    - [ ] 安全头已正确设置
    
  database:
    - [ ] 数据库访问已限制到特定IP
    - [ ] 数据库连接已启用TLS加密
    - [ ] 数据库用户权限已最小化
    - [ ] 敏感数据已加密存储
    - [ ] 数据库备份已加密
    - [ ] 慢查询日志已启用
    
  monitoring:
    - [ ] 安全事件监控已启用
    - [ ] 异常访问告警已配置
    - [ ] 审计日志已启用
    - [ ] 日志存储时间符合合规要求
    - [ ] 告警通知渠道已测试
    
  compliance:
    - [ ] 隐私政策已更新并公示
    - [ ] 数据处理已符合《个人信息保护法》
    - [ ] 用户同意机制已实施
    - [ ] 数据删除机制已实施
    - [ ] 安全培训已完成
```

---

## 📞 安全应急联系

### 安全事件报告
- **紧急安全热线**: +86-400-xxx-xxxx (7x24小时)
- **安全团队邮箱**: security@village-platform.com  
- **漏洞报告**: vulnerability@village-platform.com

### 安全更新通知
请关注以下渠道获取最新安全更新：
- **官方网站**: https://security.village-platform.com
- **安全公告**: https://github.com/your-org/smart-village-platform/security/advisories

---

> 🚨 **安全提醒**:
> 1. 定期审查和更新安全配置
> 2. 及时应用安全补丁和更新
> 3. 进行定期安全评估和渗透测试
> 4. 建立安全事件响应流程
> 
> 📅 **最后更新**: 2025年1月
> 
> 🔄 **版本**: v1.0.0