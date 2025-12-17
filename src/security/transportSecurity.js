/**
 * 智慧村庄平台 - 数据传输安全
 * 提供HTTPS加密、API接口鉴权和防SQL注入保护
 */

const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const logger = require('../utils/logger');

/**
 * HTTPS安全配置
 */
const httpsConfig = {
  // SSL/TLS 配置
  ssl: {
    key: process.env.SSL_KEY_PATH,
    cert: process.env.SSL_CERT_PATH,
    ca: process.env.SSL_CA_PATH,
    requestCert: true,
    rejectUnauthorized: true,
    hsts: true,
    ciphers: [
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'AES256-GCM-SHA384',
      'AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'HIGH:!aNULL:!MD5:!RC4'
    ],
    honorCipherOrder: true,
    minVersion: 'TLSv1.2'
  },

  // HTTP安全头配置
  headers: {
    // HSTS (HTTP严格传输安全)
    strictTransportSecurity: {
      maxAge: 31536000, // 1年
      includeSubDomains: true,
      preload: true
    },

    // 内容安全策略
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://apis.google.com",
          "https://maps.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:"
        ],
        connectSrc: [
          "'self'",
          "https:",
          "ws:",
          "wss:"
        ],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        childSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    },

    // XSS保护
    xssProtection: {
      value: '1; mode=block; report=/xss-report'
    },

    // MIME类型嗅探保护
    xContentTypeOptions: {
      value: 'nosniff'
    },

    // 点击劫持保护
    xFrameOptions: {
      value: 'DENY'
    },

    // 引用策略
    referrerPolicy: {
      value: 'strict-origin-when-cross-origin'
    },

    // 权限策略
    permissionsPolicy: {
      features: ['geolocation', 'camera', 'microphone']
    }
  }
};

/**
 * API接口鉴权系统
 */
class APISecurity {
  constructor() {
    this.apiKeys = new Map();
    this.apiSessions = new Map();
    this.rateLimiters = new Map();
    this.blacklistedTokens = new Set();
    this.suspiciousPatterns = new Set();

    this.initializeSuspiciousPatterns();
  }

  /**
   * 初始化可疑模式
   */
  initializeSuspiciousPatterns() {
    // SQL注入模式
    this.suspiciousPatterns.add(/('|(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+)/i);
    this.suspiciousPatterns.add(/('|(<|>|\*|\/|\\|\=|\-\-|\+\+|--))/i);
    this.suspiciousPatterns.add(/('|(\b(OR|AND)\s+\w+\s*=\s*'|\w+\s+IN\s*\([^)]*\))/i));

    // XSS模式
    this.suspiciousPatterns.add(/('|(<script|javascript:|on\w+\s*=)/i));
    this.suspiciousPatterns.add(/('|(eval|Function|setTimeout|setInterval)\s*\(/i));

    // 路径遍历模式
    this.suspiciousPatterns.add(/'|(\.\.\/|\.\.\\|%2e%2e%2f|\.\.%2f)/i));

    // NoSQL注入模式
    this.suspiciousPatterns.add(/('|(\$where|\$ne|\$gt|\$lt|\$in|\$exists|\$regex)/i));
  }

  /**
   * JWT Token管理
   */
  generateAPIToken(userId, permissions, expiresIn = '24h') {
    const jwt = require('jsonwebtoken');

    const payload = {
      userId,
      permissions,
      type: 'api_token',
      sessionId: crypto.randomUUID(),
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.parseTime(expiresIn)
    };

    const token = jwt.sign(payload, process.env.JWT_API_SECRET, {
      algorithm: 'HS256',
      expiresIn
    });

    return {
      token,
      type: 'Bearer',
      expiresIn,
      metadata: {
        createdAt: new Date(payload.issuedAt).toISOString(),
        expiresAt: new Date(payload.expiresAt).toISOString()
      }
    };
  }

  /**
   * 验证API Token
   */
  async verifyAPIToken(token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_API_SECRET, {
        algorithms: ['HS256']
      });

      // 检查token是否在黑名单
      if (this.blacklistedTokens.has(token)) {
        throw new Error('Token已被吊销');
      }

      // 检查session是否有效
      const session = this.apiSessions.get(decoded.sessionId);
      if (!session || session.status !== 'active' || session.expiresAt < Date.now()) {
        throw new Error('Session已过期');
      }

      // 更新最后访问时间
      session.lastAccessAt = Date.now();
      this.apiSessions.set(decoded.sessionId, session);

      return {
        userId: decoded.userId,
        permissions: decoded.permissions,
        sessionId: decoded.sessionId,
        type: decoded.type,
        issuedAt: decoded.issuedAt,
        expiresAt: decoded.expiresAt
      };

    } catch (error) {
      logger.error('API Token验证失败', {
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      throw error;
    }
  }

  /**
   * 吊销API Token
   */
  revokeAPIToken(token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);

      this.blacklistedTokens.add(token);

      // 清理相关session
      if (decoded.sessionId) {
        const session = this.apiSessions.get(decoded.sessionId);
        if (session) {
          session.status = 'revoked';
          this.apiSessions.set(decoded.sessionId, session);
        }
      }

      logger.info('API Token已吊销', {
        userId: decoded.userId,
        sessionId: decoded.sessionId
      });

    } catch (error) {
      logger.error('API Token吊销失败', {
        error: error.message
      });
    }
  }

  /**
   * 生成API密钥
   */
  generateAPIKey(userId, description = 'API密钥') {
    const keyId = crypto.randomUUID();
    const apiKey = crypto.randomBytes(32).toString('hex');
    const keySecret = crypto.randomBytes(64).toString('hex');

    this.apiKeys.set(keyId, {
      keyId,
      apiKey,
      keySecret,
      userId,
      description,
      createdAt: Date.now(),
      lastUsedAt: null,
      usageCount: 0,
      status: 'active'
    });

    return {
      keyId,
      apiKey,
      description,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 验证API密钥
   */
  async verifyAPIKey(apiKey) {
    for (const [keyId, keyData] of this.apiKeys.entries()) {
      if (keyData.apiKey === apiKey && keyData.status === 'active') {
        // 使用HMAC验证
        const receivedKey = apiKey;
        const expectedKey = crypto
          .createHmac('sha256', keyData.keySecret)
          .update(keyId)
          .digest('hex');

        if (crypto.timingSafeEqual(expectedKey, receivedKey)) {
          // 更新使用统计
          keyData.lastUsedAt = Date.now();
          keyData.usageCount++;
          this.apiKeys.set(keyId, keyData);

          return {
            keyId,
            userId: keyData.userId,
            description: keyData.description,
            usageCount: keyData.usageCount,
            lastUsedAt: new Date(keyData.lastUsedAt).toISOString()
          };
        }
      }
    }

    throw new Error('无效的API密钥');
  }

  /**
   * 创建API会话
   */
  createAPISession(userId, requestInfo) {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      sessionId,
      userId,
      requestInfo: {
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        endpoint: requestInfo.endpoint
      },
      createdAt: Date.now(),
      lastAccessAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24小时
      status: 'active'
    };

    this.apiSessions.set(sessionId, sessionData);

    return {
      sessionId,
      expiresAt: new Date(sessionData.expiresAt).toISOString()
    };
  }

  /**
   * 解析时间字符串
   */
  parseTime(timeStr) {
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return parseInt(timeStr) || 0;
    }
  }
}

/**
 * SQL注入防护
 */
class SQLInjectionProtection {
  constructor() {
    this.sanitizationRules = {
      // 移除危险字符
      remove: /['";\\\/*\\\-=]/g,

      // 替换危险SQL关键字
      replace: {
        'DROP': 'DROP_',
        'DELETE': 'DELETE_',
        'UPDATE': 'UPDATE_',
        'INSERT': 'INSERT_',
        'SELECT': 'SELECT_',
        'UNION': 'UNION_',
        'WHERE': 'WHERE_',
        'FROM': 'FROM_',
        'ORDER BY': 'ORDER_',
        'GROUP BY': 'GROUP_',
        'HAVING': 'HAVING_'
      }
    };
  }

  /**
   * SQL注入检测
   */
  detectSQLInjection(input) {
    if (typeof input !== 'string') {
      return false;
    }

    // 检查常见的SQL注入模式
    const sqlInjectionPatterns = [
      /('|(union|select|insert|update|delete|drop|create|alter|exec|execute|truncate)\s+/i,
      /('|(\b(OR|AND)\s+\w+\s*=\s*'|\w+\s+IN\s*\([^)]*\))/i,
      /('|(<|>|\*|\/|\\|\=|\-\-|\+\+|--)\s*[\d\w]/i),
      /('|(\.\.\/|\.\.\\|%2e%2e%2f|\.\.%2f)/i),
      /('|(\$where|\$ne|\$gt|\$lt|\$in|\$exists|\$regex)/i),
      /('|(\bunion\s+all\s+select|waitfor\s+delay)/i)
    ];

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(input)) {
        logger.warn('检测到可能的SQL注入尝试', {
          input: input.substring(0, 100),
          pattern: pattern.source
        });
        return true;
      }
    }

    return false;
  }

  /**
   * 输入清理
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    let sanitized = input;

    // 移除危险字符
    sanitized = sanitized.replace(this.sanitizationRules.remove, '');

    // 替换危险关键字
    for (const [pattern, replacement] of Object.entries(this.sanitizationRules.replace)) {
      const regex = new RegExp(pattern, 'gi');
      sanitized = sanitized.replace(regex, replacement);
    }

    // 转义特殊字符
    sanitized = sanitized.replace(/'/g, '\\/');

    return sanitized;
  }

  /**
   * NoSQL注入防护
   */
  detectNoSQLInjection(input) {
    if (typeof input !== 'string') {
      return false;
    }

    const noSQLPatterns = [
      /('|(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$exists|\$regex|\$elemMatch|\$all|\$size|\$text|\$gt|\$lt|\$mod|\$sum|\$avg|\$min|\$max)/i),
      /('|(\.|\$)\w+(\.|\$|\w+)*/i),
      /('|(\{|\}|\[|\]|\(|\)|\+)\s*(\$|\.\w+)/i)
    ];

    for (const pattern of noSQLPatterns) {
      if (pattern.test(input)) {
        logger.warn('检测到可能的NoSQL注入尝试', {
          input: input.substring(0, 100),
          pattern: pattern.source
        });
        return true;
      }
    }

    return false;
  }
}

/**
 * 传输安全中间件工厂
 */
class TransportSecurityMiddleware {
  constructor() {
    this.apiSecurity = new APISecurity();
    this.sqlProtection = new SQLInjectionProtection();
    this.slowDownThresholds = {
      slowDown: 200,
      delayAfter: 50
    };
  }

  /**
   * 创建HTTPS安全中间件
   */
  createHTTPSMiddleware() {
    return (req, res, next) => {
      // 强制HTTPS
      if (req.protocol !== 'https' && process.env.NODE_ENV === 'production') {
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        return res.redirect(301, httpsUrl);
      }

      // 安全头配置
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block; report=/xss-report');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

      next();
    };
  }

  /**
   * 创建Helmet安全中间件
   */
  createHelmetMiddleware() {
    return helmet(httpsConfig.headers);
  }

  /**
   * 创建API鉴权中间件
   */
  createAPIAuthMiddleware() {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      const apiKey = req.headers['x-api-key'];
      const sessionId = req.headers['x-session-id'];

      try {
        // 优先使用Session认证
        if (sessionId) {
          const session = this.apiSecurity.apiSessions.get(sessionId);
          if (session && session.status === 'active' && session.expiresAt > Date.now()) {
            session.lastAccessAt = Date.now();
            req.authSession = session;
            req.authType = 'session';
            return next();
          }
        }

        // 其次使用API Key认证
        if (apiKey) {
          const keyData = await this.apiSecurity.verifyAPIKey(apiKey);
          req.authKey = keyData;
          req.authType = 'api_key';
          return next();
        }

        // 最后使用JWT Token认证
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const tokenData = await this.apiSecurity.verifyAPIToken(token);
          req.authToken = tokenData;
          req.authType = 'jwt';
          return next();
        }

        // 没有认证信息
        return res.status(401).json({
          success: false,
          error: '需要认证信息',
          code: 'AUTHENTICATION_REQUIRED',
          availableMethods: ['Bearer Token', 'API Key', 'Session']
        });

      } catch (error) {
        logger.error('API认证失败', {
          error: error.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          success: false,
          error: '认证失败',
          code: 'AUTHENTICATION_FAILED',
          message: error.message
        });
      }
    };
  }

  /**
   * 创建权限验证中间件
   */
  createPermissionMiddleware(requiredPermissions = []) {
    return (req, res, next) => {
      try {
        let userPermissions = [];

        // 从不同认证方式获取权限
        if (req.authSession) {
          const session = req.authSession;
          // 从session获取用户权限
          userPermissions = await this.getUserPermissions(req.authSession.userId);
        } else if (req.authKey) {
          userPermissions = req.authKey.permissions || [];
        } else if (req.authToken) {
          userPermissions = req.authToken.permissions || [];
        }

        // 检查权限
        const hasPermission = requiredPermissions.every(perm =>
          userPermissions.includes(perm) || userPermissions.includes('admin')
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            code: 'INSUFFICIENT_PERMISSIONS',
            requiredPermissions,
            userPermissions
          });
        }

        req.userPermissions = userPermissions;
        next();

      } catch (error) {
        logger.error('权限验证失败', {
          error: error.message,
          ip: req.ip
        });

        return res.status(500).json({
          success: false,
          error: '权限验证失败',
          code: 'PERMISSION_VERIFICATION_ERROR'
        });
      }
    };
  }

  /**
   * 创建速率限制中间件
   */
  createRateLimitMiddleware(options = {}) {
    const {
      windowMs = 15 * 60 * 1000,    // 15分钟
      max = 100,                     // 最大请求数
      message = '请求过于频繁，请稍后再试',
      standardHeaders = true,
      legacyHeaders = false,
      trustProxy = false,
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders,
      legacyHeaders,
      trustProxy,
      skipSuccessfulRequests,
      skipFailedRequests
    });
  }

  /**
   * 创建慢速攻击防护中间件
   */
  createSlowDownMiddleware(options = {}) {
    const {
      windowMs = 15 * 60 * 1000,    // 15分钟窗口
      delayAfter = 50,                // 请求数量阈值
      delayMs = 500,                  // 延迟毫秒数
      maxDelayMs = 20000               // 最大延迟
    } = options;

    return slowDown({
      windowMs,
      delayAfter,
      delayMs,
      maxDelayMs,
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
      }
    });
  }

  /**
   * 创建SQL注入防护中间件
   */
  createSQLInjectionProtectionMiddleware() {
    return (req, res, next) => {
      try {
        // 检查查询参数
        if (req.query) {
          for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
              if (this.sqlProtection.detectSQLInjection(value)) {
                logger.warn('检测到SQL注入尝试', {
                  parameter: key,
                  value: value.substring(0, 100),
                  ip: req.ip,
                  userAgent: req.get('User-Agent')
                });

                return res.status(400).json({
                  success: false,
                  error: '请求参数包含非法字符',
                  code: 'INVALID_PARAMETER',
                  parameter: key
                });
              }
            }
          }
        }

        // 检查请求体
        if (req.body && typeof req.body === 'object') {
          const sanitized = this.sanitizeRequestBody(req.body);
          req.body = sanitized;
        }

        next();

      } catch (error) {
        logger.error('SQL注入防护中间件错误', {
          error: error.message,
          ip: req.ip
        });

        return res.status(500).json({
          success: false,
          error: '安全检查失败',
          code: 'SECURITY_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * 创建NoSQL注入防护中间件
   */
  createNoSQLInjectionProtectionMiddleware() {
    return (req, res, next) => {
      try {
        // 检查查询参数
        if (req.query) {
          for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
              if (this.sqlProtection.detectNoSQLInjection(value)) {
                logger.warn('检测到NoSQL注入尝试', {
                  parameter: key,
                  value: value.substring(0, 100),
                  ip: req.ip,
                  userAgent: req.get('User-Agent')
                });

                return res.status(400).json({
                  success: false,
                  error: '请求参数包含非法字符',
                  code: 'INVALID_PARAMETER',
                  parameter: key
                });
              }
            }
          }
        }

        // 检查MongoDB查询
        if (req.body && typeof req.body === 'object') {
          const sanitized = this.sanitizeMongoQuery(req.body);
          req.body = sanitized;
        }

        next();

      } catch (error) {
        logger.error('NoSQL注入防护中间件错误', {
          error: error.message,
          ip: req.ip
        });

        return res.status(500).json({
          success: false,
          error: '安全检查失败',
          code: 'SECURITY_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * 创建综合安全中间件
   */
  createComprehensiveSecurityMiddleware(options = {}) {
    const {
      enforceHTTPS = true,
      helmetConfig = true,
      rateLimitConfig = true,
      slowDownConfig = true,
      sqlInjectionProtection = true,
      noSQLInjectionProtection = true
    } = options;

    return (req, res, next) => {
      const middlewares = [];

      // HTTPS强制重定向
      if (enforceHTTPS) {
        middlewares.push(this.createHTTPSMiddleware());
      }

      // Helmet安全头
      if (helmetConfig) {
        middlewares.push(this.createHelmetMiddleware());
      }

      // SQL注入防护
      if (sqlInjectionProtection) {
        middlewares.push(this.createSQLInjectionProtectionMiddleware());
      }

      // NoSQL注入防护
      if (noSQLInjectionProtection) {
        middlewares.push(this.createNoSQLInjectionProtectionMiddleware());
      }

      // 慢速防护
      if (rateLimitConfig) {
        middlewares.push(this.createRateLimitMiddleware(rateLimitConfig));
      }

      // 慢速攻击防护
      if (slowDownConfig) {
        middlewares.push(this.createSlowDownMiddleware());
      }

      // 顺序执行中间件
      let index = 0;
      const executeNext = () => {
        if (index >= middlewares.length) {
          return next();
        }
        const middleware = middlewares[index++];
        middleware(req, res, executeNext);
      };

      executeNext();
    };
  }

  /**
   * 清理请求体
   */
  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        // 检测SQL注入
        if (this.sqlProtection.detectSQLInjection(value)) {
          throw new Error(`参数 ${key} 包含SQL注入尝试`);
        }

        // 检测NoSQL注入
        if (this.sqlProtection.detectNoSQLInjection(value)) {
          throw new Error(`参数 ${key} 包含NoSQL注入尝试`);
        }

        // 清理输入
        sanitized[key] = this.sqlProtection.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestBody(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 清理MongoDB查询
   */
  sanitizeMongoQuery(query) {
    if (!query || typeof query !== 'object') {
      return query;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        // 检测NoSQL注入
        if (this.sqlProtection.detectNoSQLInjection(value)) {
          throw new Error(`参数 ${key} 包含NoSQL注入尝试`);
        }

        sanitized[key] = this.sqlProtection.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMongoQuery(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 获取用户权限
   */
  async getUserPermissions(userId) {
    try {
      // 这里应该从数据库获取用户权限
      // const user = await User.findById(userId).populate('permissions');
      // return user.permissions.map(p => p.name);

      // 临时返回模拟权限
      return ['read', 'write', 'delete'];
    } catch (error) {
      logger.error('获取用户权限失败', {
        error: error.message,
        userId
      });
      return [];
    }
  }

  /**
   * 获取安全状态
   */
  getSecurityStatus() {
    return {
      https: {
        enforceHTTPS: process.env.NODE_ENV === 'production',
        sslConfig: {
          hasKey: !!process.env.SSL_KEY_PATH,
          hasCert: !!process.env.SSL_CERT_PATH
        }
      },
      authentication: {
        activeSessions: this.apiSecurity.apiSessions.size,
        blacklistedTokens: this.apiSecurity.blacklistedTokens.size,
        apiKeysCount: this.apiSecurity.apiKeys.size
      },
      rateLimiting: {
        activeLimiters: this.rateLimiters.size
      },
      protection: {
        sqlInjectionEnabled: true,
        noSQLInjectionEnabled: true,
        xssProtectionEnabled: true,
        csrfProtectionEnabled: true
      },
      timestamp: new Date().toISOString()
    };
  }
}

// 创建全局传输安全中间件实例
const transportSecurity = new TransportSecurityMiddleware();

module.exports = {
  transportSecurity,
  TransportSecurityMiddleware,
  httpsConfig,
  APISecurity,
  SQLInjectionProtection
};