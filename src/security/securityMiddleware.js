/**
 * 智慧村庄平台 - 综合安全中间件
 * 整合访问控制、数据加密、审计日志等安全功能
 */

const { accessControl, ROLES, PERMISSION_LEVELS, DATA_SCOPES } = require('./accessControl');
const { auditLogger, OPERATION_TYPES, OPERATION_STATUS } = require('./auditLogger');
const { encryptionService, ENCRYPTED_FIELDS } = require('./encryption');
const logger = require('../utils/logger');

/**
 * 安全中间件类
 */
class SecurityMiddleware {
  constructor() {
    this.rateLimiters = new Map();
    this.blockedIPs = new Map();
    this.suspiciousActivities = new Map();
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15分钟
    this.maxRequestsPerMinute = 100;
    this.maxRequestsPerHour = 1000;
  }

  /**
   * 认证中间件
   */
  authenticate() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
          await this.logSecurityEvent(req, OPERATION_TYPES.LOGIN, {
            status: OPERATION_STATUS.FAILURE,
            reason: '缺少访问令牌'
          });

          return res.status(401).json({
            success: false,
            error: '缺少访问令牌',
            code: 'MISSING_TOKEN'
          });
        }

        // 验证JWT令牌
        const user = await this.verifyToken(token);
        if (!user) {
          await this.logSecurityEvent(req, OPERATION_TYPES.LOGIN, {
            status: OPERATION_STATUS.FAILURE,
            reason: '无效的访问令牌'
          });

          return res.status(401).json({
            success: false,
            error: '无效的访问令牌',
            code: 'INVALID_TOKEN'
          });
        }

        // 检查用户状态
        if (!user.status || user.status !== 'active') {
          await this.logSecurityEvent(req, OPERATION_TYPES.LOGIN, {
            status: OPERATION_STATUS.BLOCKED,
            userId: user.id,
            reason: '用户账户已禁用'
          });

          return res.status(403).json({
            success: false,
            error: '用户账户已禁用',
            code: 'ACCOUNT_DISABLED'
          });
        }

        // 检查IP是否被阻止
        if (this.isIPBlocked(req.ip)) {
          await this.logSecurityEvent(req, OPERATION_TYPES.UNAUTHORIZED_ACCESS, {
            status: OPERATION_STATUS.BLOCKED,
            userId: user.id,
            reason: 'IP地址已被阻止'
          });

          return res.status(403).json({
            success: false,
            error: '访问被阻止',
            code: 'IP_BLOCKED'
          });
        }

        // 将用户信息添加到请求对象
        req.user = user;
        req.authTime = Date.now();

        // 记录成功的认证
        await this.logSecurityEvent(req, OPERATION_TYPES.LOGIN, {
          status: OPERATION_STATUS.SUCCESS,
          userId: user.id,
          userRole: user.role
        });

        next();

      } catch (error) {
        logger.error('认证中间件错误', {
          error: error.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        await this.logSecurityEvent(req, OPERATION_TYPES.LOGIN, {
          status: OPERATION_STATUS.FAILURE,
          reason: error.message
        });

        return res.status(401).json({
          success: false,
          error: '认证失败',
          code: 'AUTHENTICATION_ERROR'
        });
      }
    };
  }

  /**
   * 授权中间件
   */
  authorize(permission, resourceType) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: '用户未认证',
            code: 'USER_NOT_AUTHENTICATED'
          });
        }

        // 构建资源对象
        const resource = {
          type: resourceType,
          villageId: req.params.villageId || user.villageId,
          departmentId: req.params.departmentId || user.departmentId,
          gridId: req.params.gridId || user.gridId,
          teamId: req.params.teamId || user.teamId,
          userId: req.params.userId
        };

        // 检查权限
        const hasPermission = accessControl.hasPermission(user, permission, resource);

        // 记录权限检查
        await this.logSecurityEvent(req, 'PERMISSION_CHECK', {
          status: hasPermission ? OPERATION_STATUS.SUCCESS : OPERATION_STATUS.FAILURE,
          userId: user.id,
          userRole: user.role,
          permission,
          resource,
          result: hasPermission
        });

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            code: 'INSUFFICIENT_PERMISSIONS',
            requiredPermission: permission,
            resource: resourceType
          });
        }

        next();

      } catch (error) {
        logger.error('授权中间件错误', {
          error: error.message,
          userId: req.user?.id
        });

        return res.status(500).json({
          success: false,
          error: '权限检查失败',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * 基于角色的授权中间件
   */
  authorizeRole(...allowedRoles) {
    return (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: '用户未认证',
            code: 'USER_NOT_AUTHENTICATED'
          });
        }

        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            code: 'INSUFFICIENT_PERMISSIONS',
            userRole: user.role,
            requiredRoles: allowedRoles
          });
        }

        next();

      } catch (error) {
        logger.error('角色授权中间件错误', {
          error: error.message
        });

        return res.status(500).json({
          success: false,
          error: '角色授权检查失败',
          code: 'ROLE_AUTHORIZATION_ERROR'
        });
      }
    };
  }

  /**
   * 数据访问控制中间件
   */
  dataAccessControl(dataType, sensitivity = 'internal') {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: '用户未认证',
            code: 'USER_NOT_AUTHENTICATED'
          });
        }

        // 检查数据访问权限
        const canAccess = await this.checkDataAccessPermission(user, dataType, req);

        if (!canAccess) {
          await this.logSecurityEvent(req, OPERATION_TYPES.UNAUTHORIZED_ACCESS, {
            status: OPERATION_STATUS.BLOCKED,
            userId: user.id,
            dataType,
            reason: '数据访问权限不足'
          });

          return res.status(403).json({
            success: false,
            error: '数据访问权限不足',
            code: 'DATA_ACCESS_DENIED',
            dataType
          });
        }

        // 设置数据脱敏中间件
        const sanitizationMiddleware = accessControl.createSanitizationMiddleware(sensitivity);
        sanitizationMiddleware(req, res, next);

      } catch (error) {
        logger.error('数据访问控制中间件错误', {
          error: error.message,
          dataType
        });

        return res.status(500).json({
          success: false,
          error: '数据访问控制失败',
          code: 'DATA_ACCESS_CONTROL_ERROR'
        });
      }
    };
  }

  /**
   * 速率限制中间件
   */
  rateLimit(options = {}) {
    const {
      windowMs = 60 * 1000,        // 1分钟
      max = 100,                   // 最大请求数
      message = '请求过于频繁',
      skipSuccessfulRequests = false
    } = options;

    return (req, res, next) => {
      const key = req.ip;
      const now = Date.now();

      // 初始化计数器
      if (!this.rateLimiters.has(key)) {
        this.rateLimiters.set(key, {
          count: 0,
          resetTime: now + windowMs,
          lastReset: now
        });
      }

      const limiter = this.rateLimiters.get(key);

      // 检查是否需要重置计数器
      if (now > limiter.resetTime) {
        limiter.count = 0;
        limiter.resetTime = now + windowMs;
        limiter.lastReset = now;
      }

      limiter.count++;

      // 检查是否超过限制
      if (limiter.count > max) {
        logger.warn('速率限制触发', {
          ip: req.ip,
          endpoint: req.path,
          count: limiter.count,
          max
        });

        return res.status(429).json({
          success: false,
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((limiter.resetTime - now) / 1000)
        });
      }

      // 设置响应头
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - limiter.count),
        'X-RateLimit-Reset': new Date(limiter.resetTime).toISOString()
      });

      next();
    };
  }

  /**
   * 敏感操作验证中间件
   */
  sensitiveOperation(operationType, requireSecondFactor = false) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: '用户未认证',
            code: 'USER_NOT_AUTHENTICATED'
          });
        }

        // 检查操作权限
        const hasPermission = accessControl.hasPermission(user, PERMISSION_LEVELS.WRITE, {
          type: 'sensitive_operation',
          operation: operationType
        });

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足，无法执行敏感操作',
            code: 'SENSITIVE_OPERATION_DENIED'
          });
        }

        // 检查是否需要二次验证
        if (requireSecondFactor && !this.verifySecondFactor(req, user)) {
          return res.status(403).json({
            success: false,
            error: '需要二次验证',
            code: 'SECOND_FACTOR_REQUIRED'
          });
        }

        // 记录敏感操作
        await this.logSecurityEvent(req, operationType, {
          status: OPERATION_STATUS.SUCCESS,
          userId: user.id,
          operation: operationType,
          riskLevel: 'medium'
        });

        next();

      } catch (error) {
        logger.error('敏感操作验证中间件错误', {
          error: error.message,
          operationType
        });

        return res.status(500).json({
          success: false,
          error: '敏感操作验证失败',
          code: 'SENSITIVE_OPERATION_ERROR'
        });
      }
    };
  }

  /**
   * 审计日志中间件
   */
  audit(operation) {
    return (req, res, next) => {
      const originalJson = res.json;
      let responseData = null;

      // 拦截响应数据
      res.json = function(data) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // 监听响应完成
      res.on('finish', async () => {
        try {
          const auditData = {
            type: operation.type,
            action: operation.action,
            resource: operation.resource,
            resourceType: operation.resourceType,
            resourceId: req.params.id || req.body?.id,
            status: res.statusCode >= 200 && res.statusCode < 300 ?
              OPERATION_STATUS.SUCCESS : OPERATION_STATUS.FAILURE,
            errorCode: responseData?.error?.code,
            errorMessage: responseData?.error,
            dataType: operation.dataType,
            dataCount: Array.isArray(req.body) ? req.body.length : 1,
            sensitivity: operation.sensitivity || 'internal',
            beforeState: operation.beforeState,
            afterState: operation.afterState,
            metadata: {
              method: req.method,
              path: req.path,
              queryParams: req.query,
              bodySize: JSON.stringify(req.body || {}).length,
              responseSize: JSON.stringify(responseData || {}).length
            }
          };

          auditLogger.log(operation, auditData);

        } catch (error) {
          logger.error('审计日志记录失败', {
            error: error.message,
            operation
          });
        }
      });

      next();
    };
  }

  /**
   * 数据加密中间件
   */
  encryptResponse(dataType = 'system') {
    return (req, res, next) => {
      const originalJson = res.json;

      res.json = function(data) {
        try {
          if (data.success && data.data) {
            // 加密敏感数据
            const encryptedData = encryptionService.encryptObject(data.data, dataType);
            data.data = encryptedData;
          }
        } catch (error) {
          logger.error('响应数据加密失败', {
            error: error.message,
            dataType
          });
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * 数据解密中间件
   */
  decryptRequest(dataType = 'system') {
    return (req, res, next) => {
      try {
        if (req.body && typeof req.body === 'object') {
          // 解密请求体中的敏感数据
          req.body = encryptionService.decryptObject(req.body, dataType);
        }
      } catch (error) {
        logger.error('请求数据解密失败', {
          error: error.message,
          dataType
        });

        return res.status(400).json({
          success: false,
          error: '请求数据解密失败',
          code: 'REQUEST_DECRYPTION_ERROR'
        });
      }

      next();
    };
  }

  /**
   * 综合安全中间件（整合所有安全功能）
   */
  comprehensive(securityOptions = {}) {
    const {
      requireAuth = true,
      permissions = [],
      roles = [],
      rateLimitOptions = {},
      auditOperations = null,
      encryptResponse = false,
      decryptRequest = false,
      dataAccessType = null
    } = securityOptions;

    return (req, res, next) => {
      const middlewares = [];

      // 添加速率限制
      if (rateLimitOptions.enabled !== false) {
        middlewares.push(this.rateLimit(rateLimitOptions));
      }

      // 添加认证
      if (requireAuth) {
        middlewares.push(this.authenticate());
      }

      // 添加数据解密
      if (decryptRequest) {
        middlewares.push(this.decryptRequest(dataAccessType));
      }

      // 添加角色授权
      if (roles.length > 0) {
        middlewares.push(this.authorizeRole(...roles));
      }

      // 添加权限授权
      if (permissions.length > 0) {
        permissions.forEach(permission => {
          middlewares.push(this.authorize(permission.permission, permission.resourceType));
        });
      }

      // 添加数据访问控制
      if (dataAccessType) {
        middlewares.push(this.dataAccessControl(dataAccessType));
      }

      // 添加审计日志
      if (auditOperations) {
        middlewares.push(this.audit(auditOperations));
      }

      // 添加响应加密
      if (encryptResponse) {
        middlewares.push(this.encryptResponse());
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
   * 验证JWT令牌
   */
  async verifyToken(token) {
    try {
      // 这里应该是实际的JWT验证逻辑
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 从数据库获取用户信息
      // const user = await User.findById(decoded.id);

      // 临时返回模拟用户数据
      return {
        id: decoded.id || 'test-user-001',
        name: decoded.name || '测试用户',
        role: decoded.role || ROLES.RESIDENT,
        villageId: decoded.villageId || 'test-village-001',
        departmentId: decoded.departmentId,
        gridId: decoded.gridId,
        teamId: decoded.teamId,
        status: 'active',
        permissions: decoded.permissions
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * 检查IP是否被阻止
   */
  isIPBlocked(ip) {
    const blocked = this.blockedIPs.get(ip);
    if (!blocked) return false;

    return Date.now() < blocked.expireTime;
  }

  /**
   * 阻止IP地址
   */
  blockIP(ip, duration = this.lockoutDuration) {
    this.blockedIPs.set(ip, {
      blockedAt: Date.now(),
      expireTime: Date.now() + duration
    });

    logger.warn('IP地址已被阻止', {
      ip,
      duration,
      expireTime: new Date(Date.now() + duration).toISOString()
    });
  }

  /**
   * 检查数据访问权限
   */
  async checkDataAccessPermission(user, dataType, req) {
    // 根据数据类型和用户角色检查权限
    const permissionMap = {
      'personal': [ROLES.VILLAGE_ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.VILLAGE_OFFICER, ROLES.RESIDENT],
      'financial': [ROLES.VILLAGE_ADMIN, ROLES.ACCOUNTANT],
      'health': [ROLES.VILLAGE_ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.VILLAGE_OFFICER],
      'system': [ROLES.SUPER_ADMIN, ROLES.VILLAGE_ADMIN]
    };

    const allowedRoles = permissionMap[dataType] || [];
    return allowedRoles.includes(user.role);
  }

  /**
   * 验证二次因子
   */
  verifySecondFactor(req, user) {
    const secondFactorToken = req.headers['x-second-factor'] || req.body.secondFactor;

    // 这里应该是实际的二次因子验证逻辑
    // 例如：短信验证码、TOTP、生物识别等

    return !!secondFactorToken; // 临时实现
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(req, type, data) {
    const operation = {
      type,
      action: type.toLowerCase().replace('_', '_'),
      resource: 'security',
      resourceType: 'security_event'
    };

    const auditData = {
      ...data,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      requestId: req.id,
      sessionId: req.sessionID,
      securityEvent: true,
      riskLevel: this.calculateRiskLevel(type, data)
    };

    auditLogger.log(operation, {
      user: req.user,
      ip: req.ip,
      ...auditData
    });
  }

  /**
   * 计算风险级别
   */
  calculateRiskLevel(type, data) {
    const highRiskTypes = [
      OPERATION_TYPES.SECURITY_BREACH,
      OPERATION_TYPES.UNAUTHORIZED_ACCESS,
      OPERATION_TYPES.SUSPICIOUS_ACTIVITY
    ];

    if (highRiskTypes.includes(type)) {
      return 'high';
    }

    if (data.status === OPERATION_STATUS.BLOCKED || data.reason === '权限不足') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 获取安全状态
   */
  getSecurityStatus() {
    return {
      rateLimiters: this.rateLimiters.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousActivities: this.suspiciousActivities.size,
      encryptionStatus: encryptionService.getEncryptionStatus(),
      accessControlRoles: Object.keys(ROLES).length,
      timestamp: new Date().toISOString()
    };
  }
}

// 创建全局安全中间件实例
const securityMiddleware = new SecurityMiddleware();

module.exports = {
  securityMiddleware,
  accessControl,
  auditLogger,
  encryptionService,
  ROLES,
  PERMISSION_LEVELS,
  DATA_SCOPES
};