/**
 * 错误信息脱敏中间件
 * 防止敏感信息泄露，统一错误响应格式
 */

const crypto = require('crypto');
const url = require('url');

// 敏感信息模式
const SENSITIVE_PATTERNS = {
  // 身份证号
  idCard: /\b(\d{17}[\dXx])\b/g,
  // 手机号
  phone: /\b(1[3-9]\d{9})\b/g,
  // 邮箱
  email: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
  // 银行卡号
  bankCard: /\b(\d{16,19})\b/g,
  // 密码相关
  password: /password\s*[:=]\s*\S+/gi,
  // Token/密钥
  token: /(?:token|key|secret)\s*[:=]\s*\S+/gi,
  // IP地址（部分脱敏）
  ip: /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.(\d{1,3}))\b/g,
  // 数据库连接字符串
  connectionString: /(?:mongodb|mysql|postgres):\/\/[^@\s]+@/gi
};

// 错误分类
const ERROR_TYPES = {
  VALIDATION: 'validation_error',
  AUTHENTICATION: 'authentication_error', 
  AUTHORIZATION: 'authorization_error',
  DATABASE: 'database_error',
  NETWORK: 'network_error',
  SYSTEM: 'system_error',
  BUSINESS: 'business_error',
  RATE_LIMIT: 'rate_limit_error',
  SECURITY: 'security_error'
};

/**
 * 脱敏处理函数
 */
const Sanitizer = {
  /**
   * 脱敏字符串
   * @param {string} text - 原始文本
   * @returns {string} 脱敏后的文本
   */
  sanitize(text) {
    if (typeof text !== 'string') return text;
    
    let sanitized = text;
    
    // 脱敏身份证号
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.idCard, (match, p1, p2) => {
      return `${p1}****${p2.slice(-4)}`;
    });
    
    // 脱敏手机号
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.phone, (match, p1, p2, p3, p4) => {
      return `${p1}****${p3}${p4}`;
    });
    
    // 脱敏邮箱
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.email, (match, p1, domain) => {
      const namePart = p1.substring(0, 2);
      return `${namePart}***@${domain}`;
    });
    
    // 脱敏银行卡号
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.bankCard, (match) => {
      return `${match.substring(0, 4)}****${match.substring(-4)}`;
    });
    
    // 脱敏IP地址
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.ip, (match, p1, p2, p3, lastPart) => {
      return `${p1}.${p2}.${p3}.***`;
    });
    
    // 移除密码和token信息
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.password, 'password: [HIDDEN]');
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.token, (match) => {
      return match.replace(/\S+/, '[HIDDEN]');
    });
    
    // 脱敏数据库连接字符串
    sanitized = sanitized.replace(SENSITIVE_PATTERNS.connectionString, (match) => {
      return match.replace(/\/\/[^@\s]+@/, '//[HIDDEN]@[HIDDEN]');
    });
    
    return sanitized;
  },
  
  /**
   * 脱敏对象
   * @param {object} obj - 原始对象
   * @param {Array} sensitiveKeys - 敏感字段列表
   * @returns {object} 脱敏后的对象
   */
  sanitizeObject(obj, sensitiveKeys = []) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    const keysToCheck = [
      'password', 'token', 'secret', 'key', 'auth',
      'idCard', 'phone', 'email', 'bankCard',
      'connectionString', 'privateKey', 'apiKey',
      ...sensitiveKeys
    ];
    
    keysToCheck.forEach(key => {
      if (sanitized[key]) {
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = this.sanitize(sanitized[key]);
        } else {
          sanitized[key] = '[HIDDEN]';
        }
      }
    });
    
    return sanitized;
  },
  
  /**
   * 清理堆栈跟踪中的敏感信息
   * @param {string} stack - 堆栈跟踪
   * @returns {string} 清理后的堆栈跟踪
   */
  sanitizeStack(stack) {
    if (!stack) return stack;
    
    let sanitized = stack;
    
    // 移除查询字符串中的敏感信息
    sanitized = sanitized.replace(/\?[^\s]*/g, '?[HIDDEN]');
    
    // 移除请求体中的敏感信息
    sanitized = sanitized.replace(/body:\s*\{[^}]*\}/gi, 'body: {[HIDDEN]}');
    
    return sanitized;
  }
};

/**
 * 错误分类器
 */
const ErrorClassifier = {
  /**
   * 分类错误类型
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   */
  classify(error) {
    if (!error) return ERROR_TYPES.SYSTEM;
    
    const message = error.message || '';
    const name = error.name || '';
    
    // 认证错误
    if (name.includes('JsonWebToken') || 
        message.includes('unauthorized') ||
        message.includes('authentication') ||
        message.includes('login failed')) {
      return ERROR_TYPES.AUTHENTICATION;
    }
    
    // 授权错误
    if (message.includes('forbidden') ||
        message.includes('access denied') ||
        message.includes('permission')) {
      return ERROR_TYPES.AUTHORIZATION;
    }
    
    // 验证错误
    if (name.includes('ValidationError') ||
        message.includes('required') ||
        message.includes('invalid') ||
        message.includes('must be')) {
      return ERROR_TYPES.VALIDATION;
    }
    
    // 数据库错误
    if (name.includes('Mongo') ||
        name.includes('Database') ||
        message.includes('connection') ||
        message.includes('E11000')) { // MongoDB重复键错误
      return ERROR_TYPES.DATABASE;
    }
    
    // 网络错误
    if (name.includes('Network') ||
        message.includes('timeout') ||
        message.includes('ECONNREFUSED') ||
        message.includes('ENOTFOUND')) {
      return ERROR_TYPES.NETWORK;
    }
    
    // 安全错误
    if (message.includes('CSRF') ||
        message.includes('XSS') ||
        message.includes('injection') ||
        message.includes('security')) {
      return ERROR_TYPES.SECURITY;
    }
    
    // 限流错误
    if (message.includes('rate limit') ||
        message.includes('too many requests')) {
      return ERROR_TYPES.RATE_LIMIT;
    }
    
    // 业务逻辑错误
    if (message.includes('not found') ||
        message.includes('already exists') ||
        message.includes('conflict')) {
      return ERROR_TYPES.BUSINESS;
    }
    
    // 默认系统错误
    return ERROR_TYPES.SYSTEM;
  },
  
  /**
   * 生成安全错误代码
   * @param {string} type - 错误类型
   * @returns {string} 错误代码
   */
  generateErrorCode(type) {
    const codes = {
      [ERROR_TYPES.VALIDATION]: 'VAL_001',
      [ERROR_TYPES.AUTHENTICATION]: 'AUTH_001', 
      [ERROR_TYPES.AUTHORIZATION]: 'AUTH_002',
      [ERROR_TYPES.DATABASE]: 'DB_001',
      [ERROR_TYPES.NETWORK]: 'NET_001',
      [ERROR_TYPES.SYSTEM]: 'SYS_001',
      [ERROR_TYPES.BUSINESS]: 'BIZ_001',
      [ERROR_TYPES.RATE_LIMIT]: 'RATE_001',
      [ERROR_TYPES.SECURITY]: 'SEC_001'
    };
    
    return codes[type] || 'SYS_001';
  }
};

/**
 * 标准化错误响应
 */
function createStandardError(error, options = {}) {
  const {
    includeStack = false,
    sanitizeMessage = true,
    includeDetails = false
  } = options;
  
  const errorType = ErrorClassifier.classify(error);
  const errorCode = ErrorClassifier.generateErrorCode(errorType);
  
  let message = error.message || 'An unexpected error occurred';
  if (sanitizeMessage) {
    message = Sanitizer.sanitize(message);
  }
  
  const standardError = {
    success: false,
    error: {
      code: errorCode,
      type: errorType,
      message: message,
      timestamp: new Date().toISOString()
    }
  };
  
  // 开发环境包含更多调试信息
  if (process.env.NODE_ENV === 'development') {
    standardError.error.name = error.name;
    
    if (includeStack && error.stack) {
      standardError.error.stack = Sanitizer.sanitizeStack(error.stack);
    }
    
    if (includeDetails && error.details) {
      standardError.error.details = Sanitizer.sanitizeObject(error.details);
    }
  }
  
  // 生产环境记录完整错误到日志
  if (process.env.NODE_ENV === 'production') {
    console.error('[ERROR]', {
      code: errorCode,
      type: errorType,
      message: error.message,
      name: error.name,
      stack: error.stack,
      details: error.details
    });
  }
  
  return standardError;
}

/**
 * 404错误处理
 */
function handle404(req, res) {
  const error = createStandardError(
    new Error(`Route not found: ${req.method} ${req.url}`),
    { includeDetails: true }
  );
  
  error.error.type = ERROR_TYPES.BUSINESS;
  error.error.code = 'HTTP_404';
  
  return res.status(404).json(error);
}

/**
 * 全局错误处理中间件
 */
function globalErrorHandler(err, req, res, next) {
  // 如果已经发送了响应，跳过
  if (res.headersSent) {
    return next(err);
  }
  
  // 标准化错误响应
  const standardError = createStandardError(err, {
    includeStack: true,
    includeDetails: true
  });
  
  // 根据错误类型设置HTTP状态码
  const statusCode = getStatusCodeForError(standardError.error.type);
  
  res.status(statusCode).json(standardError);
}

/**
 * 根据错误类型获取HTTP状态码
 */
function getStatusCodeForError(errorType) {
  const statusCodes = {
    [ERROR_TYPES.VALIDATION]: 400,
    [ERROR_TYPES.AUTHENTICATION]: 401,
    [ERROR_TYPES.AUTHORIZATION]: 403,
    [ERROR_TYPES.DATABASE]: 500,
    [ERROR_TYPES.NETWORK]: 503,
    [ERROR_TYPES.SYSTEM]: 500,
    [ERROR_TYPES.BUSINESS]: 400,
    [ERROR_TYPES.RATE_LIMIT]: 429,
    [ERROR_TYPES.SECURITY]: 403
  };
  
  return statusCodes[errorType] || 500;
}

/**
 * 异步错误包装器
 */
function asyncErrorWrapper(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 安全响应头中间件
 */
function securityHeaders(req, res, next) {
  // 移除可能泄露服务器信息的头
  res.removeHeader('X-Powered-By');
  
  // 添加安全头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

module.exports = {
  Sanitizer,
  ErrorClassifier,
  createStandardError,
  handle404,
  globalErrorHandler,
  asyncErrorWrapper,
  securityHeaders,
  ERROR_TYPES,
  SENSITIVE_PATTERNS
};