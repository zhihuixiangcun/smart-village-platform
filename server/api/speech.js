/**
 * 语音API路由 - Speech API Routes
 *
 * 端点：
 * - POST /api/speech/recognize - 语音识别（音频转文字）
 * - POST /api/speech/synthesize - 语音合成（文字转音频）
 * - GET /api/speech/dialects - 获取支持的方言列表
 * - POST /api/speech/command - 解析语音命令
 * - GET /api/speech/health - 健康检查
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { speechService, SUPPORTED_DIALECTS } = require('../services/speechService');

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/pcm', 'audio/mp3', 'audio/x-wav'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|pcm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  }
});

/**
 * POST /api/speech/recognize
 * 语音识别：将音频转换为文字
 */
router.post('/recognize', upload.single('audio'), async (req, res) => {
  try {
    const { buffer } = req.file || {};
    const {
      dialect = 'mandarin',
      format = 'pcm',
      rate = 16000
    } = req.body;

    // 验证输入
    if (!buffer) {
      return res.status(400).json({
        success: false,
        message: '请上传音频文件'
      });
    }

    if (!speechService.isValidDialect(dialect)) {
      return res.status(400).json({
        success: false,
        message: '不支持的方言类型',
        supportedDialects: Object.keys(SUPPORTED_DIALECTS)
      });
    }

    // 执行语音识别
    const result = await speechService.recognize(buffer, {
      dialect,
      format,
      rate: parseInt(rate)
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          text: result.text,
          confidence: result.confidence,
          dialect: result.dialect,
          duration: result.duration
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: '语音识别失败，请重试'
      });
    }
  } catch (error) {
    console.error('语音识别API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/speech/synthesize
 * 语音合成：将文字转换为音频
 */
router.post('/synthesize', async (req, res) => {
  try {
    const {
      text,
      person = 0, // 发音人：0-女声，1-男声
      speed = 5, // 语速：0-15
      pitch = 5, // 音调：0-15
      volume = 5, // 音量：0-15
      format = 'mp3'
    } = req.body;

    // 验证输入
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供要转换的文本'
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        success: false,
        message: '文本长度不能超过2000个字符'
      });
    }

    // 执行语音合成
    const result = await speechService.synthesize(text, {
      person: parseInt(person),
      speed: parseInt(speed),
      pitch: parseInt(pitch),
      volume: parseInt(volume),
      format
    });

    if (result.success) {
      // 设置响应头
      res.set({
        'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        'Content-Disposition': `attachment; filename="speech_${Date.now()}.${format}"`,
        'Content-Length': result.audioData.length
      });

      // 发送音频数据
      res.send(result.audioData);
    } else {
      res.status(400).json({
        success: false,
        message: '语音合成失败，请重试'
      });
    }
  } catch (error) {
    console.error('语音合成API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/speech/dialects
 * 获取支持的方言列表
 */
router.get('/dialects', (req, res) => {
  try {
    const dialects = speechService.getSupportedDialects();
    res.json({
      success: true,
      data: dialects
    });
  } catch (error) {
    console.error('获取方言列表API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * POST /api/speech/command
 * 解析语音命令
 */
router.post('/command', (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供要解析的文本'
      });
    }

    const command = speechService.parseCommand(text);

    if (command) {
      res.json({
        success: true,
        data: command
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: '未识别到有效命令'
      });
    }
  } catch (error) {
    console.error('解析语音命令API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * GET /api/speech/health
 * 健康检查
 */
router.get('/health', (req, res) => {
  const hasCredentials = !!(speechService.apiKey && speechService.secretKey);

  res.json({
    success: true,
    status: 'ok',
    service: 'speech',
    configured: hasCredentials,
    supportedDialects: Object.keys(SUPPORTED_DIALECTS).length,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/speech/batch-recognize
 * 批量语音识别（用于离线语音批量处理）
 */
router.post('/batch-recognize', upload.array('audios', 10), async (req, res) => {
  try {
    const files = req.files || [];
    const { dialect = 'mandarin' } = req.body;

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请上传至少一个音频文件'
      });
    }

    const results = [];

    // 逐个处理音频文件
    for (const file of files) {
      const result = await speechService.recognize(file.buffer, {
        dialect,
        format: 'pcm',
        rate: 16000
      });

      results.push({
        filename: file.originalname,
        ...result
      });
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      data: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
        results
      }
    });
  } catch (error) {
    console.error('批量语音识别API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
