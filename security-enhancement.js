/**
 * 智慧村庄平台安全增强模块
 * 实现权限控制、安全策略和防护机制
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');

class SecurityEnhancer {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
    this.saltRounds = 12;
    this.maxLoginAttempts = 5;
    this.lockoutTime = 15 * 60 * 1000; // 15分钟
    this.failedAttempts = new Map(); // 存储失败登录尝试
    this.userSessions = new Map(); // 存储用户会话
    this.auditLog = []; // 审计日志
  }

  // JWT令牌管理
  generateToken(payload) {
    const tokenPayload = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      villageId: payload.villageId,
      permissions: payload.permissions || [],
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      algorithm: 'HS256'
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  refreshToken(oldToken) {
    try {
      const decoded = jwt.verify(oldToken, this.jwtSecret, { ignoreExpiration: true });
      delete decoded.iat;
      delete decoded.exp;
      return this.generateToken(decoded);
    } catch (error) {
      throw new Error('Cannot refresh token');
    }
  }

  // 密码安全
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return { valid: false, message: '密码长度至少8位' };
    }
    if (!hasUpperCase) {
      return { valid: false, message: '密码必须包含大写字母' };
    }
    if (!hasLowerCase) {
      return { valid: false, message: '密码必须包含小写字母' };
    }
    if (!hasNumbers) {
      return { valid: false, message: '密码必须包含数字' };
    }
    if (!hasSpecialChar) {
      return { valid: false, message: '密码必须包含特殊字符' };
    }

    return { valid: true };
  }

  // 登录保护
  async checkLoginAttempts(identifier) {
    const attempts = this.failedAttempts.get(identifier);

    if (attempts && attempts.count >= this.maxLoginAttempts) {
      const timePassed = Date.now() - attempts.lastAttempt;

      if (timePassed < this.lockoutTime) {
        const remainingTime = Math.ceil((this.lockoutTime - timePassed) / 60000);
        throw new Error(`账户已锁定，请${remainingTime}分钟后再试`);
      } else {
        this.failedAttempts.delete(identifier);
      }
    }
  }

  recordFailedLogin(identifier) {
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.failedAttempts.set(identifier, attempts);
  }

  clearFailedLogin(identifier) {
    this.failedAttempts.delete(identifier);
  }

  // 权限控制
  checkPermission(userPermission, requiredPermission) {
    // 管理员拥有所有权限
    if (userPermission === 'admin') {
      return true;
    }

    // 精确匹配
    if (userPermission === requiredPermission) {
      return true;
    }

    // 通配符权限
    if (userPermission === '*') {
      return true;
    }

    // 分层级权限 (例如: user:read 可以访问 user)
    if (requiredPermission.startsWith(userPermission + ':')) {
      return true;
    }

    return false;
  }

  hasAnyRole(userRole, allowedRoles) {
    return allowedRoles.includes(userRole);
  }

  // 输入验证
  sanitizeInput(input, type = 'string') {
    if (typeof input !== 'string') {
      return input;
    }

    switch (type) {
      case 'email':
        return validator.normalizeEmail(input.trim());
      case 'phone':
        return validator.escape(input.replace(/[^\d]/g, ''));
      case 'number':
        return validator.escape(input);
      case 'html':
        return validator.escape(input);
      case 'sql':
        return input.replace(/['"\\;]/g, '');
      default:
        return validator.escape(input.trim());
    }
  }

  validateInput(input, rules) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = input[field];

      // 必填验证
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} 是必填项`);
        continue;
      }

      // 跳过空值的可选字段
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // 类型验证
      if (rule.type && typeof value !== rule.type) {
        errors.push(`${field} 必须是 ${rule.type} 类型`);
        continue;
      }

      // 字符串验证
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} 长度不能少于 ${rule.minLength} 个字符`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} 长度不能超过 ${rule.maxLength} 个字符`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${field} 格式不正确`);
        }
      }

      // 数值验证
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${field} 不能小于 ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${field} 不能大于 ${rule.max}`);
        }
      }

      // 自定义验证
      if (rule.validate && !rule.validate(value)) {
        errors.push(`${field} 验证失败`);
      }
    }

    return errors;
  }

  // 审计日志
  logAudit(event, userId, details = {}) {
    const logEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      event,
      userId,
      details,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown'
    };

    this.auditLog.push(logEntry);

    // 只保留最近10000条记录
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    console.log(`🔒 审计日志: ${event} - 用户: ${userId} - IP: ${logEntry.ip}`);
  }

  getAuditLog(filters = {}) {
    let filteredLogs = this.auditLog;

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }
    if (filters.event) {
      filteredLogs = filteredLogs.filter(log => log.event === filters.event);
    }
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }

    return filteredLogs;
  }

  // 会话管理
  createSession(userId, sessionData) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId,
      data: sessionData,
      createdAt: new Date(),
      lastAccessed: new Date(),
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent
    };

    this.userSessions.set(sessionId, session);
    return sessionId;
  }

  getSession(sessionId) {
    const session = this.userSessions.get(sessionId);
    if (session) {
      session.lastAccessed = new Date();
      return session;
    }
    return null;
  }

  destroySession(sessionId) {
    this.userSessions.delete(sessionId);
  }

  cleanupExpiredSessions() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const [sessionId, session] of this.userSessions.entries()) {
      if (now - session.lastAccessed > maxAge) {
        this.userSessions.delete(sessionId);
      }
    }
  }

  // 中间件生成器
  authenticateToken() {
    return (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
          return res.status(401).json({
            success: false,
            error: '缺少访问令牌',
            code: 'MISSING_TOKEN'
          });
        }

        const decoded = this.verifyToken(token);
        req.user = decoded;

        // 记录API访问
        this.logAudit('API_ACCESS', decoded.id, {
          endpoint: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        next();
      } catch (error) {
        return res.status(403).json({
          success: false,
          error: '无效的访问令牌',
          code: 'INVALID_TOKEN'
        });
      }
    };
  }

  requirePermission(permission) {
    return (req, res, next) => {
      try {
        const userPermissions = req.user.permissions || [];
        const userRole = req.user.role;

        if (userRole === 'admin') {
          return next();
        }

        const hasPermission = userPermissions.some(p => this.checkPermission(p, permission));

        if (!hasPermission) {
          this.logAudit('PERMISSION_DENIED', req.user.id, {
            requiredPermission: permission,
            userPermissions,
            endpoint: req.path
          });

          return res.status(403).json({
            success: false,
            error: '权限不足',
            code: 'PERMISSION_DENIED',
            requiredPermission: permission
          });
        }

        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          error: '权限验证失败',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }

  requireRole(roles) {
    return (req, res, next) => {
      try {
        const userRole = req.user.role;

        if (!this.hasAnyRole(userRole, Array.isArray(roles) ? roles : [roles])) {
          this.logAudit('ROLE_ACCESS_DENIED', req.user.id, {
            requiredRoles: Array.isArray(roles) ? roles : [roles],
            userRole,
            endpoint: req.path
          });

          return res.status(403).json({
            success: false,
            error: '角色权限不足',
            code: 'ROLE_ACCESS_DENIED'
          });
        }

        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          error: '角色验证失败',
          code: 'ROLE_CHECK_ERROR'
        });
      }
    };
  }

  validateRequestBody(validationRules) {
    return (req, res, next) => {
      try {
        const errors = this.validateInput(req.body, validationRules);

        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            error: '请求参数验证失败',
            code: 'VALIDATION_ERROR',
            details: errors
          });
        }

        // 清理输入数据
        for (const [field, value] of Object.entries(req.body)) {
          if (typeof value === 'string') {
            req.body[field] = this.sanitizeInput(value);
          }
        }

        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          error: '数据验证失败',
          code: 'VALIDATION_SYSTEM_ERROR'
        });
      }
    };
  }

  // 限流配置
  createRateLimiter(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 限制每个IP 15分钟内最多100个请求
      message: {
        success: false,
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.logAudit('RATE_LIMIT_EXCEEDED', req.user?.id || 'anonymous', {
          ip: req.ip,
          endpoint: req.path,
          userAgent: req.get('User-Agent')
        });

        res.status(429).json(options.message || defaultOptions.message);
      }
    };

    return rateLimit({ ...defaultOptions, ...options });
  }

  // 安全头配置
  getSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  // CORS配置
  getCorsOptions() {
    return {
      origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',')
          : ['http://localhost:3000'];

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('不允许的CORS来源'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count']
    };
  }

  // 敏感数据脱敏
  maskSensitiveData(data, userRole) {
    const sensitiveFields = ['password', 'idCard', 'bankCard', 'phone', 'email'];
    const adminFields = ['salary', 'bonus', 'performance'];

    if (userRole !== 'admin') {
      for (const field of sensitiveFields) {
        if (data[field]) {
          if (field === 'phone') {
            data[field] = data[field].replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
          } else if (field === 'email') {
            data[field] = data[field].replace(/(.{2}).*(@.*)/, '$1****$2');
          } else if (field === 'idCard') {
            data[field] = data[field].replace(/(.{6}).*(.{4})/, '$1********$2');
          } else {
            data[field] = '***';
          }
        }
      }
    }

    // 普通用户不能看到管理字段
    if (userRole === 'villager') {
      for (const field of adminFields) {
        delete data[field];
      }
    }

    return data;
  }

  // 数据加密
  encrypt(text, key = process.env.ENCRYPTION_KEY) {
    if (!key) {
      throw new Error('加密密钥未配置');
    }

    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
    if (!key) {
      throw new Error('加密密钥未配置');
    }

    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(
      algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = SecurityEnhancer;