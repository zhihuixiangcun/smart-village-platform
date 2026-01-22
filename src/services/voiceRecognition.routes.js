/**
 * 语音识别API路由
 * 集成语音识别服务到Express应用
 */

const express = require('express');
const multer = require('multer');
const VoiceRecognitionService = require('./voiceRecognition');

const router = express.Router();

// 创建服务实例
const voiceRecognition = new VoiceRecognitionService();

// 配置文件上传
const upload = multer({
  dest: 'temp/audio/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许音频文件
    const allowedMimes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/x-pn-wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/x-mpeg-3',
      'audio/mp4'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持音频文件格式'));
    }
  }
});

/**
 * GET /api/voice/health
 * 健康检查接口
 */
router.get('/health', async (req, res) => {
  try {
    const health = await voiceRecognition.healthCheck();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voice/dialects
 * 获取支持的方言列表
 */
router.get('/dialects', (req, res) => {
  try {
    const dialects = voiceRecognition.getSupportedDialects();
    res.json({
      success: true,
      data: {
        total: dialects.length,
        dialects
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voice/stats
 * 获取服务统计信息
 */
router.get('/stats', (req, res) => {
  try {
    const stats = voiceRecognition.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/recognize
 * 上传音频文件进行识别
 */
router.post('/recognize', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传音频文件'
      });
    }

    // 获取参数
    const { dialect = 'mandarin', userId } = req.body;

    // 执行识别
    const result = await voiceRecognition.speechToText(req.file.path, {
      dialect,
      userId: userId || req.user?.id || 'unknown'
    });

    // 返回结果
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/recognize/base64
 * 使用base64编码的音频数据进行识别
 */
router.post('/recognize/base64', async (req, res) => {
  try {
    const { audioData, dialect = 'mandarin', userId } = req.body;

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: '请提供音频数据'
      });
    }

    // 将base64转换为Buffer
    const buffer = Buffer.from(audioData, 'base64');

    // 执行识别
    const result = await voiceRecognition.speechToText(buffer, {
      dialect,
      userId: userId || req.user?.id || 'unknown'
    });

    // 返回结果
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/cleanup
 * 清理临时音频文件
 */
router.post('/cleanup', async (req, res) => {
  try {
    const result = await voiceRecognition.cleanupTempFiles();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/voice/stats
 * 重置统计信息
 */
router.delete('/stats', (req, res) => {
  try {
    voiceRecognition.resetStats();
    res.json({
      success: true,
      message: '统计信息已重置'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 中间件：错误处理
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '文件大小超过限制（最大10MB）'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: error.message || '服务器内部错误'
  });
});

module.exports = router;

/**
 * 使用示例：
 *
 * 在app.js中注册路由：
 *
 * const express = require('express');
 * const voiceRoutes = require('./services/voiceRecognition.routes');
 * const app = express();
 *
 * // 注册语音识别路由
 * app.use('/api/voice', voiceRoutes);
 *
 * // 启动服务器
 * app.listen(3001, () => {
 *   console.log('服务器运行在 http://localhost:3001');
 * });
 *
 * === API使用示例 ===
 *
 * 1. 健康检查
 * GET /api/voice/health
 *
 * 2. 获取方言列表
 * GET /api/voice/dialects
 *
 * 3. 上传音频识别
 * POST /api/voice/recognize
 * Content-Type: multipart/form-data
 * Body: { audio: <file>, dialect: 'mandarin', userId: 'user123' }
 *
 * 4. 使用base64识别
 * POST /api/voice/recognize/base64
 * Content-Type: application/json
 * Body: { audioData: 'base64...', dialect: 'cantonese', userId: 'user123' }
 *
 * 5. 获取统计信息
 * GET /api/voice/stats
 *
 * 6. 清理临时文件
 * POST /api/voice/cleanup
 *
 * 7. 重置统计信息
 * DELETE /api/voice/stats
 */
