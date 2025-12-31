/**
 * AI智能问答路由
 * 处理农业知识问答、政策计算、AI填表等接口
 */

const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const rateLimit = require('../middleware/rateLimit');

// AI问答接口
router.post('/chat',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 30, // 最多30次请求
    message: {
      success: false,
      message: '请求过于频繁，请稍后再试'
    }
  }),
  aiChatController.chat
);

// 语音问答接口
router.post('/voice',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 10, // 最多10次语音请求
    message: {
      success: false,
      message: '语音请求过于频繁，请稍后再试'
    }
  }),
  aiChatController.upload.single('audio'),
  aiChatController.voiceChat
);

// 政策计算器
router.post('/policy/calculate',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 20, // 最多20次计算请求
    message: {
      success: false,
      message: '计算请求过于频繁，请稍后再试'
    }
  }),
  aiChatController.calculatePolicy
);

// AI填表助手
router.post('/form/fill',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 15, // 最多15次填表请求
    message: {
      success: false,
      message: '填表请求过于频繁，请稍后再试'
    }
  }),
  aiChatController.fillForm
);

// Get conversation history (no auth required for now)
router.get('/history', aiChatController.getConversationHistory);

// 农业知识搜索
router.get('/search/agriculture',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 50, // 最多50次搜索请求
    message: {
      success: false,
      message: '搜索请求过于频繁，请稍后再试'
    }
  }),
  aiChatController.searchAgriculture
);

// 获取热门问答
router.get('/popular', aiChatController.getPopularQA);

// Submit feedback (no auth required for now)
router.post('/feedback', aiChatController.submitFeedback);

// 获取支持的方言列表
router.get('/dialects', aiChatController.getSupportedDialects);

// AI健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'AI智能问答系统',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      chat: true,
      voice: true,
      policyCalculator: true,
      formAssistant: true,
      agricultureSearch: true,
      dialectSupport: true
    }
  });
});

// AI功能统计
router.get('/stats', async (req, res) => {
  try {
    // 这里可以添加AI服务使用统计
    const stats = {
      dailyQueries: 0,
      weeklyQueries: 0,
      monthlyQueries: 0,
      totalQueries: 0,
      topIntents: [
        '种植咨询',
        '病虫害防治',
        '政策咨询',
        '施肥建议',
        '市场价格'
      ],
      averageResponseTime: '1.2秒',
      userSatisfaction: '4.6/5.0'
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});

module.exports = router;