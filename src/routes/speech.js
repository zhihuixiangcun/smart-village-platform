/**
 * 语音识别路由
 * 提供语音识别、合成、方言检测等API路由
 */

const express = require('express')
const speechController = require('../controllers/speechController')
const authMiddleware = require('../middleware/authMiddleware')
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware')
const auditMiddleware = require('../middleware/auditMiddleware')
const { WebSocketServer } = require('ws')

const router = express.Router()

// 应用中间件
router.use(authMiddleware) // 需要认证
router.use(auditMiddleware) // 审计日志
router.use(rateLimitMiddleware.speech) // 语音API限流

// 音频文件上传中间件
const upload = speechController.upload

/**
 * @api {POST} /api/speech/recognize 语音识别
 * @apiName RecognizeSpeech
 * @apiGroup Speech
 * @apiDescription 识别音频文件中的语音内容，支持多种方言
 * @apiPermission user
 *
 * @apiParam {String} [dialect=auto] 方言类型 (auto, mandarin, cantonese, shanghainese等)
 * @apiParam {String} [accent] 口音类型
 * @apiParam {String} [domain=iat] 识别领域
 * @apiParam {Number} [proficiency=1] 语言熟练度
 * @apiParam {File} audio 音频文件
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 识别结果
 * @apiSuccess {String} data.text 识别文本
 * @apiSuccess {String} data.dialect 检测到的方言
 * @apiSuccess {Number} data.confidence 置信度
 * @apiSuccess {Number} data.processingTime 处理时间(ms)
 * @apiSuccess {Number} data.audioLength 音频时长(s)
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/recognize', upload.single('audio'), speechController.recognizeSpeech)

/**
 * @api {POST} /api/speech/synthesize 语音合成
 * @apiName SynthesizeSpeech
 * @apiGroup Speech
 * @apiDescription 将文本转换为语音
 * @apiPermission user
 *
 * @apiParam {String} text 要合成的文本
 * @apiParam {String} [voice=mandarin] 语音类型
 * @apiParam {Number} [speed=50] 语速(0-100)
 * @apiParam {Number} [pitch=50] 音调(0-100)
 * @apiParam {Number} [volume=50] 音量(0-100)
 * @apiParam {String} [emotion=neutral] 情感类型
 * @apiParam {String} [format=mp3] 音频格式
 *
 * @apiSuccess {File} audio 音频文件
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/synthesize', speechController.synthesizeSpeech)

/**
 * @api {POST} /api/speech/detect-dialect 方言检测
 * @apiName DetectDialect
 * @apiGroup Speech
 * @apiDescription 检测音频中的方言类型
 * @apiPermission user
 *
 * @apiParam {File} audio 音频文件
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 检测结果
 * @apiSuccess {String} data.dialect 方言类型
 * @apiSuccess {Number} data.confidence 置信度
 * @apiSuccess {Array} data.alternatives 备选方言
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/detect-dialect', upload.single('audio'), speechController.detectDialect)

/**
 * @api {POST} /api/speech/translate-dialect 方言翻译
 * @apiName TranslateDialect
 * @apiGroup Speech
 * @apiDescription 在不同方言之间翻译文本
 * @apiPermission user
 *
 * @apiParam {String} text 原文本
 * @apiParam {String} fromDialect 源方言
 * @apiParam {String} toDialect 目标方言
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 翻译结果
 * @apiSuccess {String} data.originalText 原文本
 * @apiSuccess {String} data.translatedText 翻译文本
 * @apiSuccess {String} data.fromDialect 源方言
 * @apiSuccess {String} data.toDialect 目标方言
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/translate-dialect', speechController.translateDialect)

/**
 * @api {GET} /api/speech/dialects 获取支持的方言列表
 * @apiName GetSupportedDialects
 * @apiGroup Speech
 * @apiDescription 获取所有支持的方言类型
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Array} data 方言列表
 * @apiSuccess {String} data.key 方言键
 * @apiSuccess {String} data.name 方言名称
 * @apiSuccess {String} data.code 语言代码
 * @apiSuccess {String} data.region 区域
 * @apiSuccess {String} data.accent 口音
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/dialects', speechController.getSupportedDialects)

/**
 * @api {GET} /api/speech/stats 获取语音服务统计
 * @apiName GetSpeechStats
 * @apiGroup Speech
 * @apiDescription 获取语音识别服务的统计信息
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 统计信息
 * @apiSuccess {Number} data.totalRecognitions 总识别次数
 * @apiSuccess {Number} data.successfulRecognitions 成功识别次数
 * @apiSuccess {String} data.successRate 成功率
 * @apiSuccess {Number} data.totalSyntheses 总合成次数
 * @apiSuccess {Number} data.successfulSyntheses 成功合成次数
 * @apiSuccess {Object} data.dialectDistribution 方言分布统计
 * @apiSuccess {Number} data.cacheSize 缓存大小
 * @apiSuccess {Boolean} data.isRecording 是否正在录音
 * @apiSuccess {Boolean} data.isProcessing 是否正在处理
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/stats', speechController.getStats)

/**
 * @api {GET} /api/speech/audio-config 获取音频配置
 * @apiName GetAudioConfig
 * @apiGroup Speech
 * @apiDescription 获取音频处理配置信息
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 配置信息
 * @apiSuccess {Number} data.sampleRate 采样率
 * @apiSuccess {Number} data.channels 声道数
 * @apiSuccess {Number} data.bitDepth 位深度
 * @apiSuccess {String} data.maxFileSize 最大文件大小
 * @apiSuccess {Array} data.supportedFormats 支持的格式
 * @apiSuccess {Number} data.maxDuration 最大时长
 * @apiSuccess {Number} data.minDuration 最小时长
 * @apiSuccess {Number} data.silenceThreshold 静音阈值
 * @apiSuccess {Number} data.silenceTimeout 静音超时
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/audio-config', speechController.getAudioConfig)

/**
 * @api {POST} /api/speech/batch-recognize 批量语音识别
 * @apiName BatchRecognizeSpeech
 * @apiGroup Speech
 * @apiDescription 批量识别多个音频文件
 * @apiPermission user
 *
 * @apiParam {Array} files 音频文件列表(最多10个)
 * @apiParam {String} [dialect=auto] 方言类型
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 识别结果
 * @apiSuccess {Number} data.totalFiles 总文件数
 * @apiSuccess {Array} data.results 识别结果列表
 * @apiSuccess {String} data.results.fileName 文件名
 * @apiSuccess {Boolean} data.results.success 是否成功
 * @apiSuccess {String} data.results.text 识别文本
 * @apiSuccess {String} data.results.dialect 方言类型
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/batch-recognize', upload.array('files', 10), speechController.batchRecognizeSpeech)

/**
 * @api {DELETE} /api/speech/cache 清理语音服务缓存
 * @apiName ClearSpeechCache
 * @apiGroup Speech
 * @apiDescription 清理语音识别缓存
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.delete('/cache', speechController.clearCache)

/**
 * @api {POST} /api/speech/stats/reset 重置统计信息
 * @apiName ResetSpeechStats
 * @apiGroup Speech
 * @apiDescription 重置语音服务统计信息
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作结果
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.post('/stats/reset', speechController.resetStats)

/**
 * 实时语音识别WebSocket路由
 * WebSocket端点: ws://localhost:3000/api/speech/real-time-recognize
 *
 * 请求参数(query):
 * - dialect: 方言类型
 * - interimResults: 是否返回临时结果
 * - silenceTimeout: 静音超时时间
 *
 * WebSocket消息格式:
 * 发送消息:
 * - type: "audio", data: "base64编码的音频数据"
 * - type: "stop"
 *
 * 接收消息:
 * - type: "start" - 开始识别
 * - type: "interim-result" - 临时结果
 * - type: "final-result" - 最终结果
 * - type: "end" - 识别结束
 * - type: "error" - 错误信息
 */
router.get('/real-time-recognize', (req, res, next) => {
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    // 设置WebSocket
    req.ws = true
    return next()
  }

  res.status(400).json({
    success: false,
    message: '该端点需要WebSocket连接'
  })
}, speechController.handleRealTimeRecognition)

// 错误处理中间件
router.use((error, req, res, next) => {
  const logger = require('../config/logger')

  logger.error('语音路由错误:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user ? req.user.id : 'anonymous'
  })

  // Multer错误处理
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '文件大小超过限制(10MB)'
    })
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: '文件数量超过限制(10个)'
    })
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: '不支持的文件类型'
    })
  }

  // 默认错误处理
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  })
})

module.exports = router