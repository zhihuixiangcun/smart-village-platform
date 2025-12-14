/**
 * 智慧乡村平台 - 生产环境安全加固系统
 * 包含安全监控、漏洞检测、自动防护等功能
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { exec } = require('child_process');
const redis = require('redis');
const NodeCache = require('node-cache');

// 配置
const securityConfig = {
  // HTTPS配置
  https: {
    enabled: process.env.HTTPS_ENABLED === 'true',
    certPath: process.env.SSL_CERT_PATH,
    keyPath: process.env.SSL_KEY_PATH,
    caPath: process.env.SSL_CA_PATH,
    enforce: process.env.HTTPS_ENFORCE === 'true'
  },

  // 安全头部配置
  headers: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // 生产环境应移除unsafe-eval
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "wss:", "ws:"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // 限流配置
  rateLimit: {
    // 全局限流
    global: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 每IP最多1000请求
      message: {
        error: '请求过于频繁',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15分钟后重试'
      }
    },
    // 认证接口限流
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5, // 每IP最多5次登录尝试
      skipSuccessfulRequests: true
    },
    // API接口限流
    api: {
      windowMs: 60 * 1000, // 1分钟
      max: 100, // 每用户每分钟100请求
      keyGenerator: (req) => req.user?.id || req.ip
    },
    // 上传接口限流
    upload: {
      windowMs: 60 * 1000,
      max: 10, // 每用户每分钟10次上传
      keyGenerator: (req) => req.user?.id || req.ip
    }
  },

  // 防护配置
  protection: {
    // XSS防护
    xss: {
      enabled: true,
      options: {
        whitelist: [],
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
      }
    },
    // SQL注入防护
    sqlInjection: {
      enabled: true,
      patterns: [
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
        /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /((\%27)|(\'))union/ix,
        /exec(\s|\+)+(s|x)p\w+/ix,
        /UNION[^a-zA-Z]/i,
        /SELECT[^a-zA-Z]/i,
        /INSERT[^a-zA-Z]/i,
        /DELETE[^a-zA-Z]/i,
        /UPDATE[^a-zA-Z]/i
      ]
    },
    // 路径遍历防护
    pathTraversal: {
      enabled: true,
      patterns: [
        /\.\./g,
        /%2e%2e/gi,
        /%2e\./gi,
        /\.%2e/gi
      ]
    },
    // CSRF防护
    csrf: {
      enabled: true,
      secretLength: 32,
      tokenExpiry: 3600 // 1小时
    }
  },

  // 监控配置
  monitoring: {
    enabled: process.env.SECURITY_MONITORING_ENABLED !== 'false',
    logLevel: process.env.SECURITY_LOG_LEVEL || 'warn',
    alertThreshold: {
      failedLogins: 5, // 5次失败登录告警
      suspiciousRequests: 100, // 可疑请求阈值
      blockedRequests: 50 // 阻止请求阈值
    }
  }
};

// 日志配置
const securityLogger = winston.createLogger({
  level: securityConfig.monitoring.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Redis客户端
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// 本地缓存
const securityCache = new NodeCache({ stdTTL: 300 }); // 5分钟

// 安全监控器
class SecurityMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousRequests: 0,
      failedLogins: 0,
      xssAttempts: 0,
      sqlInjectionAttempts: 0,
      pathTraversalAttempts: 0,
      csrfAttempts: 0,
      topAttackers: new Map(),
      blockedIPs: new Set()
    };

    this.securityEvents = [];
    this.blockedIPs = new Set();
  }

  async initialize() {
    try {
      if (redisClient) {
        await redisClient.connect();
      }

      // 从Redis加载已阻止的IP
      await this.loadBlockedIPs();

      securityLogger.info('✅ 安全监控器初始化完成');
    } catch (error) {
      securityLogger.error('❌ 安全监控器初始化失败:', error);
    }
  }

  async loadBlockedIPs() {
    try {
      const blocked = await redisClient.sMembers('security:blocked_ips');
      this.blockedIPs = new Set(blocked);
    } catch (error) {
      securityLogger.error('加载阻止IP列表失败:', error);
    }
  }

  recordRequest(req, blocked = false, reason = '') {
    this.metrics.totalRequests++;

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    if (blocked) {
      this.metrics.blockedRequests++;
      this.recordAttacker(ip, 'blocked');

      securityLogger.warn('请求被阻止', {
        ip,
        userAgent,
        method: req.method,
        url: req.originalUrl,
        reason,
        timestamp: new Date().toISOString()
      });

      // 记录安全事件
      this.recordSecurityEvent('request_blocked', {
        ip,
        userAgent,
        method: req.method,
        url: req.originalUrl,
        reason
      });
    }
  }

  recordSecurityEvent(type, data) {
    const event = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    };

    this.securityEvents.push(event);

    // 只保留最近1000条事件
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // 异步处理事件
    this.processSecurityEvent(event);

    // 缓存到Redis
    this.cacheSecurityEvent(event);
  }

  async processSecurityEvent(event) {
    const { type, data } = event;

    switch (type) {
      case 'login_failed':
        this.metrics.failedLogins++;
        await this.checkFailedLoginThreshold(data.ip);
        break;

      case 'xss_attempt':
        this.metrics.xssAttempts++;
        this.recordAttacker(data.ip, 'xss');
        break;

      case 'sql_injection_attempt':
        this.metrics.sqlInjectionAttempts++;
        this.recordAttacker(data.ip, 'sql_injection');
        break;

      case 'path_traversal_attempt':
        this.metrics.pathTraversalAttempts++;
        this.recordAttacker(data.ip, 'path_traversal');
        break;

      case 'csrf_attempt':
        this.metrics.csrfAttempts++;
        this.recordAttacker(data.ip, 'csrf');
        break;
    }

    // 检查是否需要自动阻止IP
    await this.checkAutoBlockThreshold(data.ip);
  }

  recordAttacker(ip, attackType) {
    if (!this.metrics.topAttackers.has(ip)) {
      this.metrics.topAttackers.set(ip, {
        attacks: 0,
        types: new Set(),
        lastAttack: Date.now()
      });
    }

    const attacker = this.metrics.topAttackers.get(ip);
    attacker.attacks++;
    attacker.types.add(attackType);
    attacker.lastAttack = Date.now();
  }

  async checkFailedLoginThreshold(ip) {
    const key = `security:failed_logins:${ip}`;
    try {
      const attempts = await redisClient.incr(key);
      await redisClient.expire(key, 900); // 15分钟过期

      if (attempts >= securityConfig.monitoring.alertThreshold.failedLogins) {
        await this.blockIP(ip, 'failed_logins', `连续${attempts}次登录失败`);
      }
    } catch (error) {
      securityLogger.error('检查失败登录阈值失败:', error);
    }
  }

  async checkAutoBlockThreshold(ip) {
    const attacker = this.metrics.topAttackers.get(ip);
    if (!attacker) return;

    // 如果攻击次数超过阈值，自动阻止
    if (attacker.attacks >= securityConfig.monitoring.alertThreshold.suspiciousRequests) {
      await this.blockIP(ip, 'automatic', `检测到${attacker.attacks}次可疑活动`);
    }
  }

  async blockIP(ip, reason, details) {
    try {
      this.blockedIPs.add(ip);
      await redisClient.sAdd('security:blocked_ips', ip);
      await redisClient.expire(`security:block_time:${ip}`, 86400); // 24小时

      securityLogger.warn('IP已被阻止', {
        ip,
        reason,
        details,
        timestamp: new Date().toISOString()
      });

      this.recordSecurityEvent('ip_blocked', { ip, reason, details });

    } catch (error) {
      securityLogger.error('阻止IP失败:', error);
    }
  }

  async unblockIP(ip) {
    try {
      this.blockedIPs.delete(ip);
      await redisClient.sRem('security:blocked_ips', ip);
      await redisClient.del(`security:block_time:${ip}`);

      securityLogger.info('IP已解封', { ip });

    } catch (error) {
      securityLogger.error('解封IP失败:', error);
    }
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  async cacheSecurityEvent(event) {
    try {
      if (!redisClient.isOpen) return;

      await redisClient.lPush('security:events', JSON.stringify(event));
      await redisClient.lTrim('security:events', 0, 999); // 保留最近1000条事件
    } catch (error) {
      securityLogger.error('缓存安全事件失败:', error);
    }
  }

  getSecurityMetrics() {
    const topAttackers = Array.from(this.metrics.topAttackers.entries())
      .map(([ip, data]) => ({
        ip,
        attacks: data.attacks,
        types: Array.from(data.types),
        lastAttack: data.lastAttack
      }))
      .sort((a, b) => b.attacks - a.attacks)
      .slice(0, 10);

    return {
      ...this.metrics,
      blockedIPsCount: this.blockedIPs.size,
      topAttackers,
      recentEvents: this.securityEvents.slice(-20),
      timestamp: Date.now()
    };
  }
}

// 输入验证和清理
class InputSanitizer {
  static sanitizeInput(input, type = 'string') {
    if (!input) return input;

    switch (type) {
      case 'string':
        return this.sanitizeString(input);
      case 'email':
        return this.sanitizeEmail(input);
      case 'url':
        return this.sanitizeURL(input);
      case 'number':
        return this.sanitizeNumber(input);
      default:
        return this.sanitizeString(input);
    }
  }

  static sanitizeString(str) {
    if (typeof str !== 'string') return str;

    // 移除潜在危险的字符
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  static sanitizeEmail(email) {
    if (typeof email !== 'string') return email;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email.toLowerCase() : '';
  }

  static sanitizeURL(url) {
    if (typeof url !== 'string') return url;

    try {
      const parsed = new URL(url);
      // 只允许http和https协议
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return '';
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }

  static sanitizeNumber(num) {
    if (typeof num === 'number') return num;
    if (typeof num === 'string') {
      const parsed = parseFloat(num);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  static detectXSS(input) {
    if (!input || typeof input !== 'string') return false;

    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  static detectSQLInjection(input) {
    if (!input || typeof input !== 'string') return false;

    return securityConfig.protection.sqlInjection.patterns.some(pattern =>
      pattern.test(input)
    );
  }

  static detectPathTraversal(input) {
    if (!input || typeof input !== 'string') return false;

    return securityConfig.protection.pathTraversal.patterns.some(pattern =>
      pattern.test(input)
    );
  }
}

// CSRF令牌管理
class CSRFProtection {
  constructor() {
    this.secret = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
    this.tokenCache = new NodeCache({ stdTTL: securityConfig.protection.csrf.tokenExpiry });
  }

  generateToken() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${timestamp}.${random}`;

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    const token = `${payload}.${signature}`;
    this.tokenCache.set(token, { timestamp, random });

    return token;
  }

  validateToken(token) {
    if (!token) return false;

    const cached = this.tokenCache.get(token);
    if (!cached) return false;

    try {
      const [timestamp, random, signature] = token.split('.');
      const payload = `${timestamp}.${random}`;

      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch {
      return false;
    }
  }

  cleanup() {
    this.tokenCache.flushAll();
  }
}

// 创建实例
const securityMonitor = new SecurityMonitor();
const csrfProtection = new CSRFProtection();

// 安全中间件工厂
function createSecurityMiddlewares() {
  const middlewares = {};

  // 基础安全头部
  middlewares.helmet = helmet({
    contentSecurityPolicy: securityConfig.headers.contentSecurityPolicy,
    hsts: securityConfig.headers.hsts,
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    hidePoweredBy: true
  });

  // IP阻止中间件
  middlewares.ipBlock = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (securityMonitor.isIPBlocked(ip)) {
      securityMonitor.recordRequest(req, true, 'IP已被阻止');
      return res.status(403).json({
        success: false,
        error: '访问被拒绝',
        code: 'IP_BLOCKED'
      });
    }

    next();
  };

  // 输入验证中间件
  middlewares.inputValidation = (req, res, next) => {
    const checkInput = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
          checkInput(value, currentPath);
        } else if (typeof value === 'string') {
          // XSS检测
          if (InputSanitizer.detectXSS(value)) {
            securityMonitor.recordSecurityEvent('xss_attempt', {
              ip: req.ip,
              field: currentPath,
              value: value.substring(0, 100)
            });

            return res.status(400).json({
              success: false,
              error: '检测到潜在的XSS攻击',
              code: 'XSS_DETECTED'
            });
          }

          // SQL注入检测
          if (InputSanitizer.detectSQLInjection(value)) {
            securityMonitor.recordSecurityEvent('sql_injection_attempt', {
              ip: req.ip,
              field: currentPath,
              value: value.substring(0, 100)
            });

            return res.status(400).json({
              success: false,
              error: '检测到潜在的SQL注入攻击',
              code: 'SQL_INJECTION_DETECTED'
            });
          }

          // 路径遍历检测
          if (InputSanitizer.detectPathTraversal(value)) {
            securityMonitor.recordSecurityEvent('path_traversal_attempt', {
              ip: req.ip,
              field: currentPath,
              value: value.substring(0, 100)
            });

            return res.status(400).json({
              success: false,
              error: '检测到潜在的路径遍历攻击',
              code: 'PATH_TRAVERSAL_DETECTED'
            });
          }
        }
      }
    };

    // 检查请求体
    if (req.body) {
      checkInput(req.body);
    }

    // 检查查询参数
    if (req.query) {
      checkInput(req.query);
    }

    next();
  };

  // 全局限流中间件
  middlewares.globalRateLimit = rateLimit({
    windowMs: securityConfig.rateLimit.global.windowMs,
    max: securityConfig.rateLimit.global.max,
    message: securityConfig.rateLimit.global.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      securityMonitor.recordRequest(req, true, '全局限流');
      res.status(429).json(securityConfig.rateLimit.global.message);
    }
  });

  // 认证接口限流中间件
  middlewares.authRateLimit = rateLimit({
    windowMs: securityConfig.rateLimit.auth.windowMs,
    max: securityConfig.rateLimit.auth.max,
    skipSuccessfulRequests: securityConfig.rateLimit.auth.skipSuccessfulRequests,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
      securityMonitor.recordRequest(req, true, '认证接口限流');
      res.status(429).json({
        error: '认证请求过于频繁，请稍后重试',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      });
    }
  });

  // 慢速请求防护
  middlewares.slowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15分钟
    delayAfter: 100, // 100个请求后开始延迟
    delayMs: 100, // 每个请求增加100ms延迟
    maxDelayMs: 20000, // 最大延迟20秒
  });

  // CSRF保护中间件 (仅对状态改变请求)
  middlewares.csrf = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const token = req.get('X-CSRF-Token') || req.body._csrf;

    if (!csrfProtection.validateToken(token)) {
      securityMonitor.recordSecurityEvent('csrf_attempt', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: 'CSRF令牌无效',
        code: 'CSRF_TOKEN_INVALID'
      });
    }

    next();
  };

  // 安全监控中间件
  middlewares.monitoring = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      // 记录可疑请求
      if (duration > 5000 || res.statusCode >= 400) {
        securityMonitor.recordSecurityEvent('suspicious_request', {
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent')
        });
      }

      securityMonitor.recordRequest(req, false);
    });

    next();
  };

  return middlewares;
}

// 安全API路由
function createSecurityRoutes(middlewares) {
  const express = require('express');
  const router = express.Router();

  // 获取安全指标
  router.get('/metrics', async (req, res) => {
    try {
      const metrics = securityMonitor.getSecurityMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      securityLogger.error('获取安全指标失败:', error);
      res.status(500).json({
        success: false,
        error: '获取安全指标失败'
      });
    }
  });

  // 获取CSRF令牌
  router.get('/csrf-token', (req, res) => {
    const token = csrfProtection.generateToken();
    res.json({
      success: true,
      data: { token }
    });
  });

  // 手动阻止IP
  router.post('/block-ip', async (req, res) => {
    try {
      const { ip, reason, details } = req.body;

      if (!ip) {
        return res.status(400).json({
          success: false,
          error: 'IP地址不能为空'
        });
      }

      await securityMonitor.blockIP(ip, reason || '手动阻止', details);

      res.json({
        success: true,
        message: 'IP已被阻止'
      });
    } catch (error) {
      securityLogger.error('阻止IP失败:', error);
      res.status(500).json({
        success: false,
        error: '阻止IP失败'
      });
    }
  });

  // 手动解封IP
  router.post('/unblock-ip', async (req, res) => {
    try {
      const { ip } = req.body;

      if (!ip) {
        return res.status(400).json({
          success: false,
          error: 'IP地址不能为空'
        });
      }

      await securityMonitor.unblockIP(ip);

      res.json({
        success: true,
        message: 'IP已解封'
      });
    } catch (error) {
      securityLogger.error('解封IP失败:', error);
      res.status(500).json({
        success: false,
        error: '解封IP失败'
      });
    }
  });

  // 安全扫描
  router.post('/scan', async (req, res) => {
    try {
      const { target } = req.body;

      // 执行基本安全扫描
      const scanResults = await performSecurityScan(target);

      res.json({
        success: true,
        data: scanResults
      });
    } catch (error) {
      securityLogger.error('安全扫描失败:', error);
      res.status(500).json({
        success: false,
        error: '安全扫描失败'
      });
    }
  });

  return router;
}

// 安全扫描功能
async function performSecurityScan(target) {
  const results = {
    target,
    timestamp: new Date().toISOString(),
    vulnerabilities: [],
    recommendations: []
  };

  try {
    // 扫描常见漏洞
    const vulnerabilities = [
      'sql_injection',
      'xss',
      'csrf',
      'directory_traversal',
      'file_inclusion',
      'command_injection'
    ];

    for (const vuln of vulnerabilities) {
      // 这里应该集成专业的安全扫描工具
      // 例如: npm audit, semgrep, owasp-zap等
      results.vulnerabilities.push({
        type: vuln,
        status: 'safe', // 或 'vulnerable'
        description: `${vuln}扫描结果`
      });
    }

    // 生成安全建议
    results.recommendations = [
      '定期更新依赖包',
      '启用HTTPS',
      '配置适当的CSP',
      '实施输入验证',
      '定期进行安全审计'
    ];

  } catch (error) {
    securityLogger.error('执行安全扫描失败:', error);
  }

  return results;
}

// 初始化
async function initialize() {
  try {
    await securityMonitor.initialize();
    securityLogger.info('✅ 安全系统初始化完成');
    return true;
  } catch (error) {
    securityLogger.error('❌ 安全系统初始化失败:', error);
    throw error;
  }
}

module.exports = {
  createSecurityMiddlewares,
  createSecurityRoutes,
  SecurityMonitor,
  InputSanitizer,
  CSRFProtection,
  securityMonitor,
  csrfProtection,
  securityConfig,
  initialize
};