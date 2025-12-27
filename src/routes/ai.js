/**
 * AI智能问答路由
 * 提供AI智能问答、政策解读、生活指导等API路由
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiQuestionAnswerController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');

// 应用中间件
router.use(authMiddleware); // 需要认证
router.use(auditMiddleware); // 审计日志
router.use(rateLimitMiddleware.ai); // AI API限流

/**
 * @api {POST} /api/ai/sessions 创建对话会话
 * @apiName CreateAISession
 * @apiGroup AI
 * @apiDescription 创建AI智能对话会话
 * @apiPermission user
 *
 * @apiParam {String} [context=general] 对话上下文 (general, policy, agriculture, finance, health, law)
 * @apiParam {String} [provider] AI提供商 (openai, wenxin)
 * @apiParam {Number} [temperature] 温度参数 (0-1)
 * @apiParam {Number} [maxTokens] 最大令牌数
 * @apiParam {Boolean} [enableContext=true] 是否启用上下文
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 会话信息
 * @apiSuccess {String} data.sessionId 会话ID
 * @apiSuccess {String} data.context 对话上下文
 * @apiSuccess {String} data.provider AI提供商
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/sessions', aiController.createSession);

/**
 * @api {POST} /api/ai/messages 发送消息
 * @apiName SendAIMessage
 * @apiGroup AI
 * @apiDescription 向AI会话发送消息并获取回答
 * @apiPermission user
 *
 * @apiParam {String} sessionId 会话ID
 * @apiParam {String} message 用户消息
 * @apiParam {String} [provider] AI提供商
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 回答信息
 * @apiSuccess {String} data.answer AI回答
 * @apiSuccess {String} data.sessionId 会话ID
 * @apiSuccess {String} data.context 对话上下文
 * @apiSuccess {Number} data.responseTime 响应时间(ms)
 * @apiSuccess {Number} data.tokens 消耗的令牌数
 * @apiSuccess {String} data.provider AI提供商
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (404) {Boolean} success 会话不存在
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/messages', aiController.sendMessage);

/**
 * @api {POST} /api/ai/smart-question 智能问答
 * @apiName SmartQuestion
 * @apiGroup AI
 * @apiDescription 使用模板进行智能问答
 * @apiPermission user
 *
 * @apiParam {String} category 问答类别
 * @apiParam {Object} params 参数对象
 * @apiParam {String} [provider] AI提供商
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 问答结果
 * @apiSuccess {String} data.answer AI回答
 * @apiSuccess {String} data.sessionId 会话ID
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/smart-question', aiController.smartQuestion);

/**
 * @api {GET} /api/ai/sessions/:sessionId 获取会话信息
 * @apiName GetAISessionInfo
 * @apiGroup AI
 * @apiDescription 获取AI会话详细信息
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 会话信息
 * @apiSuccess {String} data.id 会话ID
 * @apiSuccess {String} data.userId 用户ID
 * @apiSuccess {String} data.context 对话上下文
 * @apiSuccess {Date} data.createdAt 创建时间
 * @apiSuccess {Date} data.lastActivity 最后活动时间
 * @apiSuccess {Number} data.messageCount 消息数量
 * @apiSuccess {Object} data.config 会话配置
 *
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (404) {Boolean} success 会话不存在
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/sessions/:sessionId', aiController.getSessionInfo);

/**
 * @api {DELETE} /api/ai/sessions/:sessionId 结束会话
 * @apiName EndAISession
 * @apiGroup AI
 * @apiDescription 结束AI对话会话
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (404) {Boolean} success 会话不存在
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.delete('/sessions/:sessionId', aiController.endSession);

/**
 * @api {POST} /api/ai/sessions/:sessionId/summary 生成对话摘要
 * @apiName GenerateAISummary
 * @apiGroup AI
 * @apiDescription 为AI对话生成摘要
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 摘要信息
 * @apiSuccess {String} data.summary 摘要内容
 * @apiSuccess {String} data.sessionId 会话ID
 * @apiSuccess {Number} data.messageCount 消息数量
 * @apiSuccess {Number} data.duration 对话时长
 *
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (404) {Boolean} success 会话不存在
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/sessions/:sessionId/summary', aiController.generateSummary);

/**
 * @api {GET} /api/ai/categories 获取支持的问答类别
 * @apiName GetAICategories
 * @apiGroup AI
 * @apiDescription 获取所有支持的AI问答类别
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Array} data 类别列表
 * @apiSuccess {String} data.key 类别键
 * @apiSuccess {String} data.name 类别名称
 * @apiSuccess {String} data.description 类别描述
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/categories', aiController.getSupportedCategories);

/**
 * @api {POST} /api/ai/batch-question 批量智能问答
 * @apiName BatchSmartQuestion
 * @apiGroup AI
 * @apiDescription 批量进行智能问答
 * @apiPermission user
 *
 * @apiParam {Array} questions 问题列表
 * @apiParam {String} [provider] AI提供商
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 问答结果
 * @apiSuccess {Number} data.totalQuestions 总问题数
 * @apiSuccess {Array} data.results 结果列表
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/batch-question', aiController.batchSmartQuestion);

/**
 * @api {POST} /api/ai/analyze-policy 政策分析
 * @apiName AnalyzePolicy
 * @apiGroup AI
 * @apiDescription AI政策内容分析解读
 * @apiPermission user
 *
 * @apiParam {String} policy 政策内容
 * @apiParam {String} [provider] AI提供商
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 分析结果
 * @apiSuccess {String} data.answer 分析内容
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/analyze-policy', aiController.analyzePolicy);

/**
 * @api {POST} /api/ai/agriculture-advice 农业技术咨询
 * @apiName GetAgricultureAdvice
 * @apiGroup AI
 * @apiDescription 获取农业技术指导建议
 * @apiPermission user
 *
 * @apiParam {String} crop 作物名称
 * @apiParam {String} question 具体问题
 * @apiParam {String} [provider] AI提供商
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 建议结果
 * @apiSuccess {String} data.answer 建议内容
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/agriculture-advice', aiController.getAgricultureAdvice);

/**
 * @api {POST} /api/ai/financial-guidance 金融指导
 * @apiName GetFinancialGuidance
 * @apiGroup AI
 * @apiDescription 获取金融服务指导建议
 * @apiPermission user
 *
 * @apiParam {String} financeType 金融类型
 * @apiParam {String} question 具体问题
 * @apiParam {String} [provider] AI提供商
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 指导结果
 * @apiSuccess {String} data.answer 指导内容
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/financial-guidance', aiController.getFinancialGuidance);

/**
 * @api {GET} /api/ai/stats 获取AI服务统计
 * @apiName GetAIStats
 * @apiGroup AI
 * @apiDescription 获取AI智能问答服务统计信息
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 统计信息
 * @apiSuccess {Number} data.totalQuestions 总问题数
 * @apiSuccess {Number} data.successfulAnswers 成功回答数
 * @apiSuccess {String} data.successRate 成功率
 * @apiSuccess {Number} data.totalTokens 总令牌数
 * @apiSuccess {String} data.averageResponseTime 平均响应时间
 * @apiSuccess {Object} data.providerUsage 提供商使用统计
 * @apiSuccess {Object} data.categoryUsage 分类使用统计
 * @apiSuccess {Number} data.activeSessions 活跃会话数
 *
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/stats', aiController.getStats);

/**
 * @api {POST} /api/ai/stats/reset 重置统计信息
 * @apiName ResetAIStats
 * @apiGroup AI
 * @apiDescription 重置AI智能问答服务统计信息
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/stats/reset', aiController.resetStats);

/**
 * @api {POST} /api/ai/cleanup-sessions 清理过期会话
 * @apiName CleanupAISessions
 * @apiGroup AI
 * @apiDescription 清理过期的AI对话会话
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/cleanup-sessions', aiController.cleanupSessions);

// 错误处理中间件
router.use((error, req, res, next) => {
  const logger = require('../config/logger');

  logger.error('AI问答路由错误:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user ? req.user.id : 'anonymous'
  });

  // 参数验证错误
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: `参数验证失败: ${error.message}`
    });
  }

  // 限流错误
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试'
    });
  }

  // 默认错误处理
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

module.exports = router;