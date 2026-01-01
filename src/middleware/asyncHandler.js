/**
 * 异步错误处理中间件
 * 用于包装异步路由处理器，自动捕获和处理错误
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
