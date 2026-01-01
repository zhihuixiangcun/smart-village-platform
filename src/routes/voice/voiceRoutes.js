/**
 * 语音交互API路由
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const voiceService = require('../../services/voice/voiceInteractionService');
const logger = require('../../utils/logger');
const { body, validationResult } = require('express-validator');

// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  }
});

/**
 * 初始化语音服务
 */
router.post('/initialize', async (req, res) => {
  try {
    await voiceService.initialize();

    logger.info('语音服务初始化成功', {
      userId: req.headers['x-user-id'],
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '语音服务初始化成功',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('语音服务初始化失败:', error);
    res.status(500).json({
      success: false,
      error: '语音服务初始化失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 语音识别
 */
router.post('/recognize', upload.single('audio'), [
  body('language').optional().isString().isLength({ max: 10 }),
  body('dialect').optional().isString().isLength({ max: 20 }),
  body('sampleRate').optional().isInt({ min: 8000, max: 48000 }),
  body('format').optional().isString().isIn(['wav', 'mp3', 'webm', 'ogg'])
], async (req, res) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '请求参数错误',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传音频文件',
        timestamp: new Date().toISOString()
      });
    }

    const config = {
      language: req.body.language || 'zh-CN',
      dialect: req.body.dialect || 'auto',
      sampleRate: req.body.sampleRate || 16000,
      format: req.body.format || 'wav'
    };

    logger.info('开始语音识别', {
      userId: req.headers['x-user-id'],
      config,
      fileSize: req.file.size,
      timestamp: new Date().toISOString()
    });

    const result = await voiceService.recognizeSpeech(req.file.buffer, config);

    logger.info('语音识别完成', {
      userId: req.headers['x-user-id'],
      text: result.text,
      confidence: result.confidence,
      duration: Date.now() - new Date().getTime(),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('语音识别失败:', error);
    res.status(500).json({
      success: false,
      error: '语音识别失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 文本转语音
 */
router.post('/synthesize', [
  body('text').notEmpty().isString().isLength({ min: 1, max: 1000 }),
  body('voice').optional().isString().isIn(['male', 'female']),
  body('language').optional().isString().isLength({ max: 10 }),
  body('dialect').optional().isString().isLength({ max: 20 }),
  body('speed').optional().isFloat({ min: 0.5, max: 2.0 }),
  body('pitch').optional().isFloat({ min: 0.5, max: 2.0 }),
  body('volume').optional().isFloat({ min: 0.0, max: 1.0 }),
  body('emotion').optional().isString().isIn(['neutral', 'happy', 'sad', 'angry', 'excited'])
], async (req, res) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '请求参数错误',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { text } = req.body;
    const options = {
      voice: req.body.voice || 'female',
      language: req.body.language || 'zh-CN',
      dialect: req.body.dialect || '普通话',
      speed: req.body.speed || 1.0,
      pitch: req.body.pitch || 1.0,
      volume: req.body.volume || 1.0,
      emotion: req.body.emotion || 'neutral'
    };

    logger.info('开始语音合成', {
      userId: req.headers['x-user-id'],
      textLength: text.length,
      options,
      timestamp: new Date().toISOString()
    });

    const result = await voiceService.synthesizeSpeech(text, options);

    logger.info('语音合成完成', {
      userId: req.headers['x-user-id'],
      duration: result.duration,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('语音合成失败:', error);
    res.status(500).json({
      success: false,
      error: '语音合成失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 语音命令处理
 */
router.post('/command', [
  body('text').notEmpty().isString().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '请求参数错误',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { text } = req.body;

    logger.info('处理语音命令', {
      userId: req.headers['x-user-id'],
      text,
      timestamp: new Date().toISOString()
    });

    const commandResult = voiceService.parseVoiceCommand(text);

    // 执行命令
    const executionResult = await this.executeVoiceCommand(commandResult, req);

    logger.info('语音命令执行完成', {
      userId: req.headers['x-user-id'],
      intent: commandResult.intent,
      success: executionResult.success,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        command: commandResult,
        execution: executionResult
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('语音命令处理失败:', error);
    res.status(500).json({
      success: false,
      error: '语音命令处理失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 方言检测
 */
router.post('/detect-dialect', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传音频文件',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('开始方言检测', {
      userId: req.headers['x-user-id'],
      fileSize: req.file.size,
      timestamp: new Date().toISOString()
    });

    // 调用方言检测服务
    const dialectResult = await voiceService.detectDialect(req.file.buffer);

    logger.info('方言检测完成', {
      userId: req.headers['x-user-id'],
      dialect: dialectResult.dialect,
      confidence: dialectResult.confidence,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: dialectResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('方言检测失败:', error);
    res.status(500).json({
      success: false,
      error: '方言检测失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 获取支持的方言列表
 */
router.get('/dialects', (req, res) => {
  try {
    const dialects = [
      { code: 'zh', name: '普通话', region: '全国' },
      { code: 'yue', name: '粤语', region: '广东、广西、香港、澳门' },
      { code: 'nan', name: '闽南语', region: '福建、台湾、潮汕' },
      { code: 'hak', name: '客家话', region: '广东、江西、福建' },
      { code: 'wuu', name: '吴语', region: '江苏、浙江、上海' },
      { code: 'hsn', name: '湘语', region: '湖南' },
      { code: 'gan', name: '赣语', region: '江西' },
      { code: 'zh-northeast', name: '东北话', region: '东北三省' },
      { code: 'zh-sichuan', name: '四川话', region: '四川、重庆' },
      { code: 'zh-shandong', name: '山东话', region: '山东' },
      { code: 'zh-henan', name: '河南话', region: '河南' },
      { code: 'zh-hubei', name: '湖北话', region: '湖北' },
      { code: 'zh-jiangzhe', name: '江浙话', region: '江苏、浙江' },
      { code: 'zh-anhui', name: '安徽话', region: '安徽' }
    ];

    res.json({
      success: true,
      data: {
        dialects,
        total: dialects.length,
        supported: dialects.filter(d => d.code.startsWith('zh')).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取方言列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取方言列表失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 获取语音服务状态
 */
router.get('/status', (req, res) => {
  try {
    const status = {
      initialized: voiceService.isInitialized(),
      recording: voiceService.isRecording,
      pythonService: voiceService.pythonService !== null,
      models: voiceService.models || {},
      supportedFormats: ['wav', 'mp3', 'webm', 'ogg'],
      features: {
        speechRecognition: true,
        textToSpeech: true,
        dialectDetection: true,
        voiceCommand: true,
        wakeWordDetection: true,
        streaming: true
      }
    };

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取语音服务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取语音服务状态失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 实时语音转文字（WebSocket升级处理）
 */
router.get('/stream', (req, res) => {
  // 这里应该升级到WebSocket连接
  // 实现实时语音流处理
  res.json({
    success: false,
    error: '请使用WebSocket连接进行实时语音处理',
    websocketUrl: `ws://localhost:${process.env.MAIN_PORT || 3001}/voice/ws/stream`,
    timestamp: new Date().toISOString()
  });
});

/**
 * 清理语音服务资源
 */
router.post('/cleanup', (req, res) => {
  try {
    voiceService.cleanup();

    logger.info('语音服务资源清理完成', {
      userId: req.headers['x-user-id'],
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '语音服务资源清理完成',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('语音服务资源清理失败:', error);
    res.status(500).json({
      success: false,
      error: '语音服务资源清理失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 执行语音命令
 */
async function executeVoiceCommand(command, req) {
  try {
    const { intent, entities } = command;
    const userId = req.headers['x-user-id'];
    const villageId = req.headers['x-village-id'];

    // 根据意图执行不同的操作
    switch (intent) {
    case '村民信息':
      return await handleResidentQuery(entities, userId, villageId);

    case '查询公告':
      return await handleAnnouncementQuery(entities, userId, villageId);

    case '政策查询':
      return await handlePolicyQuery(entities, userId, villageId);

    case '补贴查询':
      return await handleSubsidyQuery(entities, userId, villageId);

    case '提交申请':
      return await handleSubmitApplication(entities, userId, villageId);

    case '打开首页':
      return { action: 'navigate', target: '/home', message: '正在打开首页' };

    case '打开个人中心':
      return { action: 'navigate', target: '/profile', message: '正在打开个人中心' };

    case '打开服务大厅':
      return { action: 'navigate', target: '/services', message: '正在打开服务大厅' };

    default:
      return {
        action: 'unknown',
        message: '抱歉，我不理解这个指令。您可以说"帮助"查看支持的指令。'
      };
    }

  } catch (error) {
    logger.error('语音命令执行失败:', error);
    return {
      success: false,
      action: 'error',
      message: '指令执行失败，请稍后重试',
      error: error.message
    };
  }
}

/**
 * 处理村民信息查询
 */
async function handleResidentQuery(entities, userId, villageId) {
  try {
    // 这里应该调用实际的村民信息服务
    // 暂时返回模拟数据
    return {
      success: true,
      action: 'query_residents',
      message: '正在查询村民信息...',
      data: {
        total: 1250,
        families: 380,
        specialGroups: {
          elderly: 156,
          children: 89,
          disabled: 23
        }
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 处理公告查询
 */
async function handleAnnouncementQuery(entities, userId, villageId) {
  try {
    // 这里应该调用实际的公告服务
    return {
      success: true,
      action: 'query_announcements',
      message: '正在查询最新公告...',
      data: {
        announcements: [
          {
            title: '关于2024年度医保缴费的通知',
            date: '2024-12-15',
            urgent: true
          },
          {
            title: '文化站活动安排',
            date: '2024-12-10',
            urgent: false
          }
        ]
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 处理政策查询
 */
async function handlePolicyQuery(entities, userId, villageId) {
  try {
    // 这里应该调用实际的政策服务
    return {
      success: true,
      action: 'query_policies',
      message: '正在查询相关政策...',
      data: {
        policies: [
          {
            title: '2024年农业补贴政策',
            category: '农业',
            effectiveDate: '2024-01-01'
          }
        ]
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 处理补贴查询
 */
async function handleSubsidyQuery(entities, userId, villageId) {
  try {
    // 这里应该调用实际的补贴服务
    return {
      success: true,
      action: 'query_subsidies',
      message: '正在查询您的补贴情况...',
      data: {
        subsidies: [
          {
            type: '耕地地力保护补贴',
            amount: 1200,
            status: '已发放',
            date: '2024-06-15'
          }
        ]
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 处理申请提交
 */
async function handleSubmitApplication(entities, userId, villageId) {
  try {
    const serviceType = entities.find(e => e.type === 'service_type')?.value;

    if (!serviceType) {
      return {
        success: false,
        action: 'submit_application',
        message: '请说明您要办理的具体业务类型'
      };
    }

    // 这里应该调用实际的申请服务
    return {
      success: true,
      action: 'submit_application',
      message: `正在为您办理${serviceType}相关业务...`,
      data: {
        applicationId: `APP${Date.now()}`,
        status: 'processing',
        estimatedTime: '3-5个工作日'
      }
    };
  } catch (error) {
    throw error;
  }
}

module.exports = router;