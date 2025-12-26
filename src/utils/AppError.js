/**
 * 应用错误基类
 * 统一错误处理机制
 */

class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode
      }
    };
  }
}

// ============ 常用错误类型 ============

/**
 * 400 Bad Request - 请求参数错误
 */
class BadRequestError extends AppError {
  constructor(message = '请求参数错误', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

/**
 * 401 Unauthorized - 未认证
 */
class UnauthorizedError extends AppError {
  constructor(message = '未授权访问', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

/**
 * 403 Forbidden - 禁止访问
 */
class ForbiddenError extends AppError {
  constructor(message = '权限不足', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

/**
 * 404 Not Found - 资源不存在
 */
class NotFoundError extends AppError {
  constructor(message = '资源不存在', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

/**
 * 409 Conflict - 资源冲突
 */
class ConflictError extends AppError {
  constructor(message = '资源冲突', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

/**
 * 422 Unprocessable Entity - 验证失败
 */
class ValidationError extends AppError {
  constructor(message = '数据验证失败', errors = [], code = 'VALIDATION_ERROR') {
    super(message, 422, code);
    this.errors = errors;
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        errors: this.errors
      }
    };
  }
}

/**
 * 429 Too Many Requests - 请求过于频繁
 */
class RateLimitError extends AppError {
  constructor(message = '请求过于频繁，请稍后再试', retryAfter = 60, code = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, code);
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        retryAfter: this.retryAfter
      }
    };
  }
}

/**
 * 500 Internal Server Error - 服务器错误
 */
class InternalServerError extends AppError {
  constructor(message = '服务器内部错误', code = 'INTERNAL_ERROR') {
    super(message, 500, code);
    this.isOperational = false;
  }
}

/**
 * 503 Service Unavailable - 服务不可用
 */
class ServiceUnavailableError extends AppError {
  constructor(message = '服务暂时不可用', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
    this.isOperational = false;
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
};
