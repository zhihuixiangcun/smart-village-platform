/**
 * 统一API响应工具
 * 提供标准化的成功和错误响应格式
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 返回数据
 * @param {String} message - 成功消息
 * @param {Number} code - HTTP状态码
 */
function successResponse(res, data = null, message = '操作成功', code = 200) {
  return res.status(code).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
}

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {String} message - 错误消息
 * @param {Number} code - HTTP状态码
 * @param {String} errorCode - 业务错误码
 */
function errorResponse(res, message = '操作失败', code = 400, errorCode = null) {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    response.code = errorCode;
  }

  return res.status(code).json(response);
}

/**
 * 分页响应
 * @param {Object} res - Express响应对象
 * @param {Array} data - 数据列表
 * @param {Object} pagination - 分页信息
 * @param {String} message - 成功消息
 */
function paginatedResponse(res, data, pagination, message = '获取成功') {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || 0,
      totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
    },
    message,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};
