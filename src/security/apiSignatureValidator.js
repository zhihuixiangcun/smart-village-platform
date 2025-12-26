const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const moment = require('moment');

/**
 * API签名验证系统
 * 提供HMAC-SHA256签名、时间戳验证、防重放攻击等功能
 */
class APISignatureValidator {
  constructor() {
    // 签名算法配置
    this.config = {
      algorithm: 'sha256',
      timestampTolerance: 300, // 5分钟时间窗口
      nonceTTL: 86400, // 24小时nonce有效期
      maxRequestSize: 10 * 1024 * 1024, // 10MB最大请求大小
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      requiredHeaders: [
        'x-api-key',
        'x-timestamp',
        'x-nonce',
        'x-signature'
      ]
    };

    // API密钥存储（生产环境应使用数据库或安全存储）
    this.apiKeys = new Map();
    this.nonces = new Map(); // 防重放攻击nonce存储
    this.requestLogs = new Map(); // 请求日志

    // 初始化默认API密钥
    this.initializeDefaultKeys();

    // 定期清理过期nonce
    this.startNonceCleanup();
  }

  /**
   * 初始化默认API密钥
   */
  initializeDefaultKeys() {
    // 生产环境应从安全存储加载
    this.addApiKey('smart-village-frontend', 'frontend_api_key_2024', [
      '/api/v1/residents',
      '/api/v1/announcements',
      '/api/v1/services',
      '/api/v1/notifications'
    ], ['GET', 'POST']);

    this.addApiKey('smart-village-admin', 'admin_api_key_2024', [
      '/api/v1/admin',
      '/api/v1/users',
      '/api/v1/system'
    ], ['GET', 'POST', 'PUT', 'DELETE']);

    this.addApiKey('smart-village-mobile', 'mobile_api_key_2024', [
      '/api/v1/mobile',
      '/api/v1/ocr',
      '/api/v1/policy-calculator'
    ], ['GET', 'POST']);
  }

  /**
   * 添加API密钥
   */
  addApiKey(keyId, secretKey, allowedPaths = [], allowedMethods = []) {
    this.apiKeys.set(keyId, {
      id: keyId,
      secretKey,
      allowedPaths,
      allowedMethods,
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0,
      isActive: true
    });
  }

  /**
   * 生成请求签名
   */
  generateSignature(method, path, query, body, timestamp, nonce, secretKey) {
    // 构建待签名字符串
    const canonicalRequest = this.buildCanonicalRequest(method, path, query, body, timestamp, nonce);

    // 生成HMAC-SHA256签名
    const signature = crypto
      .createHmac(this.config.algorithm, secretKey)
      .update(canonicalRequest, 'utf8')
      .digest('base64');

    return signature;
  }

  /**
   * 构建规范请求字符串
   */
  buildCanonicalRequest(method, path, query, body, timestamp, nonce) {
    // 标准化路径
    const canonicalPath = path.split('?')[0];

    // 标准化查询参数
    const canonicalQuery = this.canonicalizeQuery(query);

    // 标准化请求体
    const canonicalBody = this.canonicalizeBody(body);

    // 构建规范请求
    const canonicalRequest = [
      method.toUpperCase(),
      canonicalPath,
      canonicalQuery,
      canonicalBody,
      timestamp,
      nonce
    ].join('\n');

    return canonicalRequest;
  }

  /**
   * 标准化查询参数
   */
  canonicalizeQuery(query) {
    if (!query || typeof query !== 'object') {
      return '';
    }

    const sortedKeys = Object.keys(query).sort();
    const canonicalPairs = sortedKeys.map(key => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(query[key]);
      return `${encodedKey}=${encodedValue}`;
    });

    return canonicalPairs.join('&');
  }

  /**
   * 标准化请求体
   */
  canonicalizeBody(body) {
    if (!body) {
      return '';
    }

    if (typeof body === 'string') {
      return body;
    }

    if (typeof body === 'object') {
      const sortedBody = {};
      Object.keys(body).sort().forEach(key => {
        sortedBody[key] = body[key];
      });
      return JSON.stringify(sortedBody);
    }

    return String(body);
  }

  /**
   * 验证API请求签名
   */
  async validateRequest(req, res, next) {
    try {
      // 检查必需的头部
      const missingHeaders = this.config.requiredHeaders.filter(
        header => !req.headers[header.toLowerCase()]
      );

      if (missingHeaders.length > 0) {
        return res.status(401).json({
          success: false,
          error: 'MISSING_HEADERS',
          message: `缺少必需的头部: ${missingHeaders.join(', ')}`,
          requiredHeaders: this.config.requiredHeaders
        });
      }

      // 提取请求信息
      const apiKey = req.headers['x-api-key'];
      const timestamp = req.headers['x-timestamp'];
      const nonce = req.headers['x-nonce'];
      const signature = req.headers['x-signature'];
      const method = req.method;
      const path = req.originalUrl;
      const query = req.query;
      const body = req.body;

      // 验证API密钥
      const keyInfo = this.apiKeys.get(apiKey);
      if (!keyInfo || !keyInfo.isActive) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_API_KEY',
          message: '无效的API密钥'
        });
      }

      // 验证请求方法
      if (keyInfo.allowedMethods.length > 0 && !keyInfo.allowedMethods.includes(method)) {
        return res.status(403).json({
          success: false,
          error: 'METHOD_NOT_ALLOWED',
          message: '该API密钥不允许使用此HTTP方法'
        });
      }

      // 验证路径权限
      if (keyInfo.allowedPaths.length > 0 && !this.isPathAllowed(path, keyInfo.allowedPaths)) {
        return res.status(403).json({
          success: false,
          error: 'PATH_NOT_ALLOWED',
          message: '该API密钥无权访问此路径'
        });
      }

      // 验证时间戳（防止重放攻击）
      const requestTime = parseInt(timestamp);
      const now = Date.now();
      const timeDiff = Math.abs(now - requestTime);

      if (timeDiff > this.config.timestampTolerance * 1000) {
        return res.status(401).json({
          success: false,
          error: 'TIMESTAMP_OUT_OF_RANGE',
          message: '请求时间戳超出允许范围',
          timeDiff,
          allowedRange: `${this.config.timestampTolerance}秒`
        });
      }

      // 验证nonce（防止重放攻击）
      if (this.isNonceUsed(apiKey, nonce)) {
        return res.status(401).json({
          success: false,
          error: 'NONCE_REUSE',
          message: '检测到重复的nonce，可能存在重放攻击'
        });
      }

      // 验证请求大小
      const requestSize = this.getRequestSize(req);
      if (requestSize > this.config.maxRequestSize) {
        return res.status(413).json({
          success: false,
          error: 'REQUEST_TOO_LARGE',
          message: '请求体过大',
          size: requestSize,
          maxSize: this.config.maxRequestSize
        });
      }

      // 生成预期签名
      const expectedSignature = this.generateSignature(
        method,
        path,
        query,
        body,
        timestamp,
        nonce,
        keyInfo.secretKey
      );

      // 验证签名
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        this.logSecurityEvent(req, 'SIGNATURE_VERIFICATION_FAILED', {
          providedSignature: signature,
          expectedSignature,
          apiKey,
          path
        });

        return res.status(401).json({
          success: false,
          error: 'INVALID_SIGNATURE',
          message: '请求签名验证失败'
        });
      }

      // 记录nonce（防止重用）
      this.recordNonce(apiKey, nonce);

      // 更新API密钥使用统计
      keyInfo.lastUsed = new Date();
      keyInfo.usageCount++;

      // 记录成功请求
      this.logSecurityEvent(req, 'API_REQUEST_VERIFIED', {
        apiKey,
        path,
        method
      });

      // 将API密钥信息附加到请求对象
      req.apiKeyInfo = keyInfo;

      next();

    } catch (error) {
      console.error('API签名验证错误:', error);
      this.logSecurityEvent(req, 'SIGNATURE_VALIDATION_ERROR', {
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '签名验证过程中发生错误'
      });
    }
  }

  /**
   * 检查路径是否被允许
   */
  isPathAllowed(requestPath, allowedPaths) {
    return allowedPaths.some(allowedPath => {
      if (allowedPath.endsWith('*')) {
        return requestPath.startsWith(allowedPath.slice(0, -1));
      }
      return requestPath.startsWith(allowedPath);
    });
  }

  /**
   * 检查nonce是否已使用
   */
  isNonceUsed(apiKey, nonce) {
    const key = `${apiKey}:${nonce}`;
    return this.nonces.has(key);
  }

  /**
   * 记录nonce
   */
  recordNonce(apiKey, nonce) {
    const key = `${apiKey}:${nonce}`;
    const expiry = Date.now() + (this.config.nonceTTL * 1000);
    this.nonces.set(key, expiry);
  }

  /**
   * 获取请求大小
   */
  getRequestSize(req) {
    let size = 0;

    // 计算请求体大小
    if (req.body) {
      size += JSON.stringify(req.body).length;
    }

    // 计算查询参数大小
    if (req.query) {
      size += JSON.stringify(req.query).length;
    }

    return size;
  }

  /**
   * 记录安全事件
   */
  logSecurityEvent(req, eventType, details = {}) {
    const event = {
      timestamp: new Date(),
      eventType,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.originalUrl,
      headers: {
        'x-api-key': req.headers['x-api-key'],
        'x-timestamp': req.headers['x-timestamp'],
        'x-nonce': req.headers['x-nonce']
      },
      details
    };

    // 存储安全事件日志
    const logKey = `security_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.requestLogs.set(logKey, event);

    // 控制台输出安全事件
    console.warn('🔒 安全事件:', {
      type: eventType,
      ip: event.ip,
      path: event.path,
      details
    });

    // 如果是高风险事件，可以触发告警
    if (['SIGNATURE_VERIFICATION_FAILED', 'NONCE_REUSE', 'INVALID_API_KEY'].includes(eventType)) {
      this.triggerSecurityAlert(event);
    }
  }

  /**
   * 触发安全告警
   */
  triggerSecurityAlert(event) {
    console.error('🚨 安全告警:', {
      event: event.eventType,
      ip: event.ip,
      path: event.path,
      userAgent: event.userAgent,
      timestamp: event.timestamp,
      details: event.details
    });

    // 这里可以集成邮件、短信、Slack等通知系统
    // 例如：sendSecurityAlertEmail(event);
  }

  /**
   * 启动nonce清理任务
   */
  startNonceCleanup() {
    // 每小时清理一次过期nonce
    setInterval(() => {
      this.cleanupExpiredNonces();
      this.cleanupOldLogs();
    }, 60 * 60 * 1000);
  }

  /**
   * 清理过期nonce
   */
  cleanupExpiredNonces() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.nonces.entries()) {
      if (expiry < now) {
        this.nonces.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期的nonce`);
    }
  }

  /**
   * 清理旧的请求日志
   */
  cleanupOldLogs() {
    const maxLogs = 10000; // 保留最近10000条日志
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天

    let cleanedCount = 0;

    for (const [key, log] of this.requestLogs.entries()) {
      if (now - log.timestamp.getTime() > maxAge || this.requestLogs.size > maxLogs) {
        this.requestLogs.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 条旧的请求日志`);
    }
  }

  /**
   * 获取API密钥统计信息
   */
  getApiKeyStats() {
    const stats = [];

    for (const [keyId, keyInfo] of this.apiKeys.entries()) {
      stats.push({
        keyId,
        isActive: keyInfo.isActive,
        usageCount: keyInfo.usageCount,
        lastUsed: keyInfo.lastUsed,
        createdAt: keyInfo.createdAt,
        allowedMethods: keyInfo.allowedMethods,
        allowedPathsCount: keyInfo.allowedPaths.length
      });
    }

    return stats;
  }

  /**
   * 获取安全事件日志
   */
  getSecurityEvents(limit = 100, eventType = null) {
    let events = Array.from(this.requestLogs.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    if (eventType) {
      events = events.filter(event => event.eventType === eventType);
    }

    return events.slice(0, limit);
  }

  /**
   * 撤销API密钥
   */
  revokeApiKey(keyId) {
    const keyInfo = this.apiKeys.get(keyId);
    if (keyInfo) {
      keyInfo.isActive = false;
      keyInfo.revokedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * 生成临时API密钥
   */
  generateTemporaryApiKey(validMinutes = 60, allowedPaths = [], allowedMethods = ['GET']) {
    const keyId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const secretKey = this.generateSecretKey();

    const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000);

    this.apiKeys.set(keyId, {
      id: keyId,
      secretKey,
      allowedPaths,
      allowedMethods,
      createdAt: new Date(),
      expiresAt,
      usageCount: 0,
      isActive: true,
      isTemporary: true
    });

    return {
      keyId,
      secretKey,
      expiresAt
    };
  }

  /**
   * 生成随机密钥
   */
  generateSecretKey(length = 64) {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * 验证临时密钥是否过期
   */
  validateTemporaryKey(keyId) {
    const keyInfo = this.apiKeys.get(keyId);
    if (keyInfo && keyInfo.isTemporary && keyInfo.expiresAt) {
      return new Date() < keyInfo.expiresAt;
    }
    return false;
  }
}

module.exports = new APISignatureValidator();