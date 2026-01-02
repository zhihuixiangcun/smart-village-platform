/**
 * API响应工具类
 * 统一处理API响应格式
 */
class ApiResponse {
  /**
   * 成功响应
   * @param {Object} res - Express响应对象
   * @param {Object} options - 响应选项
   * @param {String} options.message - 响应消息
   * @param {Object} options.data - 响应数据
   * @param {Number} options.code - HTTP状态码（默认200）
   */
  static success(res, options = {}) {
    const { message = '操作成功', data = null, code = 200 } = options;

    return res.status(code).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 失败响应
   * @param {Object} res - Express响应对象
   * @param {Object} options - 响应选项
   * @param {String} options.message - 错误消息
   * @param {Object} options.error - 错误详情
   * @param {Number} options.code - HTTP状态码（默认400）
   */
  static error(res, options = {}) {
    const { message = '操作失败', error = null, code = 400 } = options;

    return res.status(code).json({
      success: false,
      message,
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 未找到响应
   * @param {Object} res - Express响应对象
   * @param {Object} options - 响应选项
   * @param {String} options.message - 错误消息
   */
  static notFound(res, options = {}) {
    const { message = '资源未找到' } = options;

    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 未授权响应
   * @param {Object} res - Express响应对象
   * @param {Object} options - 响应选项
   * @param {String} options.message - 错误消息
   */
  static unauthorized(res, options = {}) {
    const { message = '未授权访问' } = options;

    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 禁止访问响应
   * @param {Object} res - Express响应对象
   * @param {Object} options - 响应选项
   * @param {String} options.message - 错误消息
   */
  static forbidden(res, options = {}) {
    const { message = '禁止访问' } = options;

    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 服务器错误响应
   * @param {Object} res - Express响应对象
   * @param {Object} options - 响应选项
   * @param {String} options.message - 错误消息
   */
  static internalError(res, options = {}) {
    const { message = '服务器内部错误' } = options;

    return res.status(500).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 验证失败响应
   * @param {Object} res - Express响应对象
   * @param {Object} options - 响应选项
   * @param {String} options.message - 错误消息
   * @param {Array} options.errors - 验证错误列表
   */
  static validationError(res, options = {}) {
    const { message = '数据验证失败', errors = [] } = options;

    return res.status(422).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = { ApiResponse };