/**
 * 限流中间件
 * 封装 express-rate-limit 提供便捷的 create 函数
 */

const rateLimit = require('express-rate-limit');

/**
 * 创建限流中间件
 * @param {Object} options - 限流配置选项
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 最大请求次数
 * @param {string|Object} options.message - 超限消息
 * @param {Function} options.skip - 跳过条件函数
 * @param {Function} options.handler - 自定义处理函数
 * @returns {Function} Express中间件
 */
function create(options = {}) {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000, // 默认1分钟
    max: options.max || 100, // 默认100次
    message: options.message || {
      success: false,
      message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` 头中
    legacyHeaders: false, // 禁用 `X-RateLimit-*` 头
    skip: options.skip,
    handler: options.handler || ((req, res) => {
      const message = typeof options.message === 'string'
        ? { success: false, message: options.message }
        : options.message || { success: false, message: '请求过于频繁，请稍后再试' };

      res.status(429).json(message);
    })
  });
}

/**
 * 预设的限流配置
 */
const presets = {
  // 严格限制（用于敏感操作）
  strict: create({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5,
    message: '敏感操作请求过于频繁，请稍后再试'
  }),

  // 中等限制（用于一般API）
  medium: create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 30,
    message: '请求过于频繁，请稍后再试'
  }),

  // 宽松限制（用于公共接口）
  loose: create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 100,
    message: '请求过于频繁，请稍后再试'
  }),

  // AI聊天专用
  aiChat: create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 30,
    message: 'AI聊天请求过于频繁，请稍后再试'
  }),

  // 语音识别专用
  voice: create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 10,
    message: '语音请求过于频繁，请稍后再试'
  }),

  // 搜索专用
  search: create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 50,
    message: '搜索请求过于频繁，请稍后再试'
  }),

  // 文件上传专用
  upload: create({
    windowMs: 10 * 60 * 1000, // 10分钟
    max: 20,
    message: '文件上传请求过于频繁，请稍后再试'
  })
};

module.exports = {
  create,
  ...presets
};
