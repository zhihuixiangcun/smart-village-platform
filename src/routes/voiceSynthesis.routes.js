/**
 * 语音合成API路由
 * 集成语音合成服务，提供文字转语音API端点
 */

const express = require('express');
const VoiceSynthesisService = require('../services/voiceSynthesis');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// 创建服务实例
const voiceSynthesis = new VoiceSynthesisService();

/**
 * @api {POST} /api/tts/synthesize 文字转语音
 * @apiName TextToSpeech
 * @apiGroup TTS
 * @apiDescription 将文本转换为语音
 * @apiPermission user
 *
 * @apiParam {String} text 要合成的文本 (1-10000字符)
 * @apiParam {String} [voice=mandarin] 语言类型 (mandarin, cantonese, northeastern, sichuanese)
 * @apiParam {String} [gender=female] 性别 (male, female, elderly, child)
 * @apiParam {Number} [speed=50] 语速 (0-100)
 * @apiParam {Number} [pitch=50] 音调 (0-100)
 * @apiParam {Number} [volume=50] 音量 (0-100)
 * @apiParam {String} [emotion=neutral] 情感 (neutral, happy, sad, angry)
 * @apiParam {String} [format=mp3] 音频格式 (mp3, wav, pcm)
 * @apiParam {Boolean} [enableCache=true] 是否启用缓存
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 合成结果
 * @apiSuccess {String} data.audioData 音频数据(base64)
 * @apiSuccess {String} data.format 音频格式
 * @apiSuccess {Number} data.duration 合成时长(ms)
 * @apiSuccess {Number} data.audioSize 音频大小(bytes)
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} error 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/synthesize', [
  body('text').notEmpty().isString().isLength({ min: 1, max: 10000 }),
  body('voice').optional().isIn(['mandarin', 'cantonese', 'northeastern', 'sichuanese']),
  body('gender').optional().isIn(['male', 'female', 'elderly', 'child']),
  body('speed').optional().isInt({ min: 0, max: 100 }),
  body('pitch').optional().isInt({ min: 0, max: 100 }),
  body('volume').optional().isInt({ min: 0, max: 100 }),
  body('emotion').optional().isIn(['neutral', 'happy', 'sad', 'angry']),
  body('format').optional().isIn(['mp3', 'wav', 'pcm']),
  body('enableCache').optional().isBoolean()
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
      voice: req.body.voice || 'mandarin',
      gender: req.body.gender || 'female',
      speed: req.body.speed || 50,
      pitch: req.body.pitch || 50,
      volume: req.body.volume || 50,
      emotion: req.body.emotion || 'neutral',
      format: req.body.format || 'mp3',
      enableCache: req.body.enableCache !== undefined ? req.body.enableCache : true
    };

    logger.info('开始语音合成', {
      userId: req.headers['x-user-id'],
      textLength: text.length,
      options,
      timestamp: new Date().toISOString()
    });

    // 执行合成
    const result = await voiceSynthesis.synthesize(text, options);

    // 将音频数据转换为base64返回
    const audioBase64 = result.audioData.toString('base64');

    logger.info('语音合成完成', {
      userId: req.headers['x-user-id'],
      duration: result.duration,
      audioSize: result.audioSize,
      fromCache: result.fromCache || false,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        audioData: audioBase64,
        format: result.format || options.format,
        duration: result.duration,
        audioSize: result.audioSize
      },
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
 * @api {POST} /api/tts/queue/add 添加到播放队列
 * @apiName AddToQueue
 * @apiGroup TTS
 * @apiDescription 添加文本到播放队列
 * @apiPermission user
 *
 * @apiParam {String} text 要合成的文本
 * @apiParam {Object} [options] 合成选项
 * @apiParam {Number} [priority=0] 优先级 (数字越大优先级越高)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 队列任务信息
 * @apiSuccess {String} data.taskId 任务ID
 * @apiSuccess {Number} data.queueLength 队列长度
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} error 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/queue/add', [
  body('text').notEmpty().isString().isLength({ max: 10000 }),
  body('priority').optional().isInt({ min: 0, max: 100 }),
  body('options').optional().isObject()
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

    const { text, priority = 0, options = {} } = req.body;

    logger.info('添加合成任务到队列', {
      userId: req.headers['x-user-id'],
      text: text.substring(0, 50),
      priority,
      timestamp: new Date().toISOString()
    });

    // 添加到队列
    const taskId = await voiceSynthesis.addToQueue(text, options, priority);

    res.json({
      success: true,
      data: {
        taskId,
        queueLength: voiceSynthesis.queue.items.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('添加队列任务失败:', error);
    res.status(500).json({
      success: false,
      error: '添加队列任务失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {POST} /api/tts/queue/batch 批量添加到队列
 * @apiName BatchAddToQueue
 * @apiGroup TTS
 * @apiDescription 批量添加文本到播放队列
 * @apiPermission user
 *
 * @apiParam {Array} texts 要合成的文本列表 (最多100个)
 * @apiParam {Object} [options] 合成选项
 * @apiParam {Number} [priority=0] 优先级
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 批量任务信息
 * @apiSuccess {Array} data.taskIds 任务ID列表
 * @apiSuccess {Number} data.count 添加的任务数
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} error 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/queue/batch', [
  body('texts').isArray({ min: 1, max: 100 }),
  body('texts.*').isString().isLength({ max: 10000 }),
  body('options').optional().isObject(),
  body('priority').optional().isInt({ min: 0, max: 100 })
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

    const { texts, options = {}, priority = 0 } = req.body;

    logger.info('批量添加合成任务到队列', {
      userId: req.headers['x-user-id'],
      count: texts.length,
      priority,
      timestamp: new Date().toISOString()
    });

    // 批量添加到队列
    const taskIds = await voiceSynthesis.batchSynthesize(texts, options, priority);

    res.json({
      success: true,
      data: {
        taskIds,
        count: taskIds.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('批量添加队列任务失败:', error);
    res.status(500).json({
      success: false,
      error: '批量添加队列任务失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {GET} /api/tts/queue/status 获取队列状态
 * @apiName GetQueueStatus
 * @apiGroup TTS
 * @apiDescription 获取播放队列状态
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 队列状态
 * @apiSuccess {Number} data.totalItems 总任务数
 * @apiSuccess {Number} data.currentIndex 当前索引
 * @apiSuccess {Number} data.remainingItems 剩余任务数
 * @apiSuccess {Boolean} data.isPlaying 是否正在播放
 * @apiSuccess {Boolean} data.isPaused 是否已暂停
 * @apiSuccess {Object} data.queueStats 队列统计
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/queue/status', (req, res) => {
  try {
    const status = voiceSynthesis.getQueueStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取队列状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取队列状态失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {POST} /api/tts/queue/pause 暂停队列
 * @apiName PauseQueue
 * @apiGroup TTS
 * @apiDescription 暂停播放队列
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} error 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/queue/pause', (req, res) => {
  try {
    voiceSynthesis.pauseQueue();

    logger.info('暂停播放队列', {
      userId: req.headers['x-user-id'],
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '播放队列已暂停',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('暂停队列失败:', error);
    res.status(500).json({
      success: false,
      error: '暂停队列失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {POST} /api/tts/queue/resume 恢复队列
 * @apiName ResumeQueue
 * @apiGroup TTS
 * @apiDescription 恢复播放队列
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} error 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/queue/resume', (req, res) => {
  try {
    voiceSynthesis.resumeQueue();

    logger.info('恢复播放队列', {
      userId: req.headers['x-user-id'],
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '播放队列已恢复',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('恢复队列失败:', error);
    res.status(500).json({
      success: false,
      error: '恢复队列失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {POST} /api/tts/queue/skip 跳过当前任务
 * @apiName SkipCurrent
 * @apiGroup TTS
 * @apiDescription 跳过当前播放任务
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} error 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/queue/skip', (req, res) => {
  try {
    voiceSynthesis.skipCurrent();

    logger.info('跳过当前任务', {
      userId: req.headers['x-user-id'],
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '已跳过当前任务',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('跳过当前任务失败:', error);
    res.status(500).json({
      success: false,
      error: '跳过当前任务失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {DELETE} /api/tts/queue 清空队列
 * @apiName ClearQueue
 * @apiGroup TTS
 * @apiDescription 清空播放队列
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.delete('/queue', (req, res) => {
  try {
    voiceSynthesis.clearQueue();

    logger.info('清空播放队列', {
      userId: req.headers['x-user-id'],
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '播放队列已清空',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('清空队列失败:', error);
    res.status(500).json({
      success: false,
      error: '清空队列失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {GET} /api/tts/voices 获取支持的音色
 * @apiName GetSupportedVoices
 * @apiGroup TTS
 * @apiDescription 获取所有支持的音色列表
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Array} data 音色列表
 * @apiSuccess {String} data.language 语言类型
 * @apiSuccess {String} data.gender 性别
 * @apiSuccess {String} data.name 音色名称
 * @apiSuccess {String} data.displayName 显示名称
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/voices', (req, res) => {
  try {
    const voices = voiceSynthesis.getSupportedVoices();

    res.json({
      success: true,
      data: voices,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取音色列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取音色列表失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {GET} /api/tts/formats 获取支持的格式
 * @apiName GetSupportedFormats
 * @apiGroup TTS
 * @apiDescription 获取所有支持的音频格式
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Array} data 格式列表
 * @apiSuccess {String} data.format 格式名称
 * @apiSuccess {String} data.encoding 编码类型
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/formats', (req, res) => {
  try {
    const formats = voiceSynthesis.getSupportedFormats();

    res.json({
      success: true,
      data: formats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取格式列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取格式列表失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {GET} /api/tts/stats 获取统计信息
 * @apiName GetStats
 * @apiGroup TTS
 * @apiDescription 获取语音合成统计信息
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 统计信息
 * @apiSuccess {Number} data.totalSyntheses 总合成次数
 * @apiSuccess {Number} data.successfulSyntheses 成功次数
 * @apiSuccess {String} data.successRate 成功率
 * @apiSuccess {Number} data.cacheHits 缓存命中次数
 * @apiSuccess {Number} data.cacheMisses 缓存未命中次数
 * @apiSuccess {String} data.cacheHitRate 缓存命中率
 * @apiSuccess {Number} data.cacheSize 缓存大小
 * @apiSuccess {Object} data.queueStatus 队列状态
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/stats', (req, res) => {
  try {
    const stats = voiceSynthesis.getStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {DELETE} /api/tts/stats 重置统计信息
 * @apiName ResetStats
 * @apiGroup TTS
 * @apiDescription 重置语音合成统计信息
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.delete('/stats', (req, res) => {
  try {
    voiceSynthesis.resetStats();

    logger.info('重置语音合成统计', {
      userId: req.headers['x-user-id'],
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '统计信息已重置',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('重置统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '重置统计信息失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {POST} /api/tts/cleanup 清理临时文件
 * @apiName CleanupTempFiles
 * @apiGroup TTS
 * @apiDescription 清理临时音频文件
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 清理结果
 * @apiSuccess {Boolean} data.success 是否成功
 * @apiSuccess {Number} data.deletedCount 删除的文件数
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/cleanup', async (req, res) => {
  try {
    const result = await voiceSynthesis.cleanupTempFiles();

    logger.info('清理临时音频文件完成', {
      userId: req.headers['x-user-id'],
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('清理临时文件失败:', error);
    res.status(500).json({
      success: false,
      error: '清理临时文件失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {GET} /api/tts/health 健康检查
 * @apiName HealthCheck
 * @apiGroup TTS
 * @apiDescription 语音合成服务健康检查
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 健康状态
 * @apiSuccess {String} data.status 状态 (healthy, error, warning)
 * @apiSuccess {String} data.message 状态消息
 * @apiSuccess {Object} data.config 配置信息
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/health', async (req, res) => {
  try {
    const health = await voiceSynthesis.healthCheck();

    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('健康检查失败:', error);
    res.status(500).json({
      success: false,
      error: '健康检查失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 错误处理中间件
 */
router.use((error, req, res, next) => {
  logger.error('TTS路由错误:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user ? req.user.id : 'anonymous'
  });

  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: error.message || '未知错误',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

/**
 * 使用示例：
 *
 * 在app.js中注册路由：
 *
 * const express = require('express');
 * const ttsRoutes = require('./routes/voiceSynthesis');
 * const app = express();
 *
 * // 注册TTS路由
 * app.use('/api/tts', ttsRoutes);
 *
 * // 启动服务器
 * app.listen(3001, () => {
 *   console.log('服务器运行在 http://localhost:3001');
 * });
 *
 * === API使用示例 ===
 *
 * 1. 文字转语音
 * POST /api/tts/synthesize
 * Content-Type: application/json
 * Body: {
 *   "text": "欢迎使用智慧乡村平台",
 *   "voice": "mandarin",
 *   "gender": "female",
 *   "speed": 50,
 *   "format": "mp3"
 * }
 *
 * 2. 添加到队列
 * POST /api/tts/queue/add
 * Content-Type: application/json
 * Body: {
 *   "text": "第一条消息",
 *   "priority": 10
 * }
 *
 * 3. 获取队列状态
 * GET /api/tts/queue/status
 *
 * 4. 暂停队列
 * POST /api/tts/queue/pause
 *
 * 5. 恢复队列
 * POST /api/tts/queue/resume
 *
 * 6. 跳过当前
 * POST /api/tts/queue/skip
 *
 * 7. 清空队列
 * DELETE /api/tts/queue
 *
 * 8. 获取音色列表
 * GET /api/tts/voices
 *
 * 9. 获取支持的格式
 * GET /api/tts/formats
 *
 * 10. 获取统计信息
 * GET /api/tts/stats
 *
 * 11. 重置统计
 * DELETE /api/tts/stats
 *
 * 12. 清理临时文件
 * POST /api/tts/cleanup
 *
 * 13. 健康检查
 * GET /api/tts/health
 */
