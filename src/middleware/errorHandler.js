/**
 * 智慧村庄平台 - 统一错误处理中间件
 * 提供标准化的错误响应格式和错误日志记录
 */

const logger = require('../utils/logger');

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * 认证错误类
 */
class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 授权错误类
 */
class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 资源未找到错误类
 */
class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 冲突错误类
 */
class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 业务逻辑错误类
 */
class BusinessError extends AppError {
  constructor(message, details = {}) {
    super(message, 422, 'BUSINESS_ERROR', details);
  }
}

/**
 * 实时计算相关错误类
 */
class RealtimeError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, 'REALTIME_ERROR', details);
  }
}

/**
 * 数据处理错误类
 */
class DataProcessingError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, 'DATA_PROCESSING_ERROR', details);
  }
}

/**
 * 错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  const errorContext = {
    requestId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    villageId: req.user?.villageId,
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
    query: req.query,
    params: req.params
  };

  // 记录错误
  logger.error('Request Error', {
    error: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    ...errorContext
  });

  // MongoDB 错误处理
  if (err.name === 'CastError') {
    const message = '资源未找到';
    error = new NotFoundError(message);
  }

  // MongoDB 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' 已存在`;
    error = new ConflictError(message, { field, value });
  }

  // MongoDB 验证错误
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    const message = '数据验证失败';
    error = new ValidationError(message, { errors });
  }

  // JWT 错误处理
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的访问令牌';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = '访问令牌已过期';
    error = new AuthenticationError(message);
  }

  // Multer 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = '文件大小超出限制';
    error = new ValidationError(message, {
      maxSize: err.limit,
      receivedSize: err.field ? req.files[err.field]?.size : 'unknown'
    });
  }

  // 速率限制错误
  if (err.status === 429) {
    const message = '请求过于频繁，请稍后重试';
    error = new AppError(message, 429, 'RATE_LIMIT_EXCEEDED', {
      retryAfter: err.retryAfter
    });
  }

  // 实时计算引擎错误
  if (err.service === 'realtime') {
    error = new RealtimeError(err.message, {
      component: err.component,
      operation: err.operation
    });
  }

  // 数据处理错误
  if (err.service === 'dataProcessing') {
    error = new DataProcessingError(err.message, {
      dataType: err.dataType,
      operation: err.operation
    });
  }

  // 构建错误响应
  const response = {
    success: false,
    error: error.message || '服务器内部错误',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.id
  };

  // 开发环境添加详细错误信息
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = error.details || {};

    if (err.originalError) {
      response.originalError = {
        message: err.originalError.message,
        stack: err.originalError.stack
      };
    }
  } else {
    // 生产环境只包含必要的错误详情
    if (error.details && Object.keys(error.details).length > 0) {
      response.details = error.details;
    }
  }

  // 发送错误响应
  res.status(error.statusCode || 500).json(response);
};

/**
 * 清理请求体中的敏感信息
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'credential', 'private', 'confidential'
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  }

  // 清理嵌套对象中的敏感字段
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeRequestBody(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * 异步错误捕获包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 错误处理
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`路径 ${req.originalUrl} 不存在`);
  next(error);
};

/**
 * 验证错误创建器
 */
const createValidationError = (message, errors = []) => {
  return new ValidationError(message, { errors });
};

/**
 * 业务错误创建器
 */
const createBusinessError = (message, details = {}) => {
  return new BusinessError(message, details);
};

/**
 * 实时计算错误创建器
 */
const createRealtimeError = (message, component = null, operation = null) => {
  return new RealtimeError(message, { component, operation });
};

/**
 * 数据处理错误创建器
 */
const createDataProcessingError = (message, dataType = null, operation = null) => {
  return new DataProcessingError(message, { dataType, operation });
};

module.exports = {
  // 中间件
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // 错误类
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError,
  RealtimeError,
  DataProcessingError,

  // 错误创建器
  createValidationError,
  createBusinessError,
  createRealtimeError,
  createDataProcessingError
};