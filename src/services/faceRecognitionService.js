/**
 * 人脸识别服务
 * 集成商汤/旷视人脸识别SDK，提供人脸检测、识别、比对等功能
 * 支持活体检测、人脸注册、登录验证等应用场景
 */

const crypto = require('crypto')
const axios = require('axios')
const EventEmitter = require('events')
const logger = require('../config/logger')
const fs = require('fs')
const path = require('path')

class FaceRecognitionService extends EventEmitter {
  constructor() {
    super()

    // 商汤SDK配置
    this.sensetimeConfig = {
      apiKey: process.env.SENSETIME_API_KEY,
      apiSecret: process.env.SENSETIME_API_SECRET,
      baseUrl: 'https://api.sensetime.com',
      appId: process.env.SENSETIME_APP_ID
    }

    // 旷视SDK配置
    this.megviiConfig = {
      apiKey: process.env.MEGVII_API_KEY,
      apiSecret: process.env.MEGVII_API_SECRET,
      baseUrl: 'https://api.megvii.com',
      appId: process.env.MEGVII_APP_ID
    }

    // 当前使用的SDK
    this.currentSDK = process.env.FACE_SDK_PROVIDER || 'sensetime'

    // 人脸库配置
    this.faceDatabases = {
      village_officials: '村委干部人脸库',
      residents: '村民人脸库',
      staff: '工作人员人脸库'
    }

    // 活体检测配置
    this.livenessConfig = {
      enabled: true,
      types: ['eye_blink', 'mouth_open', 'head_turn', 'smile'],
      timeout: 10000,
      threshold: 0.8
    }

    // 人脸比对配置
    this.matchConfig = {
      threshold: 0.75,
      maxResults: 10,
      similarityThreshold: 0.85
    }

    // 图像处理配置
    this.imageConfig = {
      maxSize: 5 * 1024 * 1024, // 5MB
      minWidth: 100,
      minHeight: 100,
      formats: ['JPEG', 'PNG', 'JPG'],
      compressionQuality: 0.8
    }

    // 缓存和统计
    this.cache = new Map()
    this.stats = {
      totalDetections: 0,
      successfulDetections: 0,
      totalMatches: 0,
      successfulMatches: 0,
      totalRegistrations: 0,
      successfulRegistrations: 0,
      livenessTests: 0,
      successfulLivenessTests: 0
    }

    // 会话管理
    this.sessions = new Map()
  }

  /**
   * 生成API鉴权签名
   * @param {string} apiKey - API密钥
   * @param {string} apiSecret - API密钥
   * @param {string} httpMethod - HTTP方法
   * @param {string} requestUri - 请求URI
   * @param {Object} queryParams - 查询参数
   * @param {Object} body - 请求体
   * @returns {Object} 鉴权信息
   */
  generateAuthSignature(apiKey, apiSecret, httpMethod, requestUri, queryParams = {}, body = {}) {
    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = crypto.randomBytes(16).toString('hex')

    // 构建签名字符串
    const queryStr = Object.keys(queryParams)
      .sort()
      .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
      .join('&')

    const bodyStr = Object.keys(body)
      .sort()
      .map(key => `${key}=${encodeURIComponent(body[key])}`)
      .join('&')

    const signString = `${httpMethod}\n${requestUri}\n${queryStr}\n${bodyStr}\n${timestamp}\n${nonce}`

    // 生成签名
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signString)
      .digest('hex')

    return {
      'X-Api-Key': apiKey,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature
    }
  }

  /**
   * 人脸检测
   * @param {Buffer} imageData - 图像数据
   * @param {Object} options - 检测选项
   * @returns {Promise<Object>} 检测结果
   */
  async detectFace(imageData, options = {}) {
    try {
      const {
        maxFaceCount = 10,
        detectAttributes = true,
        calculateFaceQuality = true,
        minFaceSize = 50
      } = options

      this.stats.totalDetections++

      // 验证图像格式
      await this.validateImage(imageData)

      // 选择SDK
      const result = this.currentSDK === 'sensetime'
        ? await this.detectFaceWithSensetime(imageData, {
          maxFaceCount,
          detectAttributes,
          calculateFaceQuality,
          minFaceSize
        })
        : await this.detectFaceWithMegvii(imageData, {
          maxFaceCount,
          detectAttributes,
          calculateFaceQuality,
          minFaceSize
        })

      if (result.success && result.faces.length > 0) {
        this.stats.successfulDetections++
      }

      // 发出事件
      this.emit('face-detected', result)

      return result

    } catch (error) {
      logger.error('人脸检测失败:', error)
      this.emit('detection-error', error)

      return {
        success: false,
        error: error.message,
        faces: []
      }
    }
  }

  /**
   * 人脸比对
   * @param {Buffer} image1 - 第一张图像
   * @param {Buffer} image2 - 第二张图像
   * @param {Object} options - 比对选项
   * @returns {Promise<Object>} 比对结果
   */
  async compareFaces(image1, image2, options = {}) {
    try {
      const {
        threshold = this.matchConfig.threshold,
        returnFaceFeature = false
      } = options

      this.stats.totalMatches++

      // 验证图像
      await this.validateImage(image1)
      await this.validateImage(image2)

      // 选择SDK
      const result = this.currentSDK === 'sensetime'
        ? await this.compareFacesWithSensetime(image1, image2, { threshold, returnFaceFeature })
        : await this.compareFacesWithMegvii(image1, image2, { threshold, returnFaceFeature })

      if (result.success) {
        this.stats.successfulMatches++
      }

      // 发出事件
      this.emit('faces-compared', result)

      return result

    } catch (error) {
      logger.error('人脸比对失败:', error)
      this.emit('comparison-error', error)

      return {
        success: false,
        error: error.message,
        similarity: 0,
        isMatch: false
      }
    }
  }

  /**
   * 人脸搜索
   * @param {Buffer} imageData - 图像数据
   * @param {string} database - 人脸库
   * @param {Object} options - 搜索选项
   * @returns {Promise<Object>} 搜索结果
   */
  async searchFace(imageData, database, options = {}) {
    try {
      const {
        maxResults = this.matchConfig.maxResults,
        threshold = this.matchConfig.similarityThreshold,
        returnMetadata = true
      } = options

      // 验证人脸库
      if (!this.faceDatabases[database]) {
        throw new Error(`不支持的数据库: ${database}`)
      }

      // 验证图像
      await this.validateImage(imageData)

      // 选择SDK
      const result = this.currentSDK === 'sensetime'
        ? await this.searchFaceWithSensetime(imageData, database, {
          maxResults,
          threshold,
          returnMetadata
        })
        : await this.searchFaceWithMegvii(imageData, database, {
          maxResults,
          threshold,
          returnMetadata
        })

      // 发出事件
      this.emit('face-searched', result)

      return result

    } catch (error) {
      logger.error('人脸搜索失败:', error)
      this.emit('search-error', error)

      return {
        success: false,
        error: error.message,
        matches: []
      }
    }
  }

  /**
   * 注册人脸
   * @param {Buffer} imageData - 图像数据
   * @param {string} database - 人脸库
   * @param {string} userId - 用户ID
   * @param {Object} metadata - 元数据
   * @returns {Promise<Object>} 注册结果
   */
  async registerFace(imageData, database, userId, metadata = {}) {
    try {
      this.stats.totalRegistrations++

      // 验证人脸库
      if (!this.faceDatabases[database]) {
        throw new Error(`不支持的数据库: ${database}`)
      }

      // 验证图像
      await this.validateImage(imageData)

      // 检测人脸
      const detection = await this.detectFace(imageData, { maxFaceCount: 1 })
      if (!detection.success || detection.faces.length === 0) {
        throw new Error('未检测到人脸')
      }

      // 活体检测（可选）
      if (this.livenessConfig.enabled) {
        const livenessResult = await this.performLivenessTest(imageData)
        if (!livenessResult.success) {
          throw new Error('活体检测失败，可能为照片攻击')
        }
      }

      // 选择SDK进行注册
      const result = this.currentSDK === 'sensetime'
        ? await this.registerFaceWithSensetime(imageData, database, userId, metadata)
        : await this.registerFaceWithMegvii(imageData, database, userId, metadata)

      if (result.success) {
        this.stats.successfulRegistrations++
      }

      // 发出事件
      this.emit('face-registered', {
        userId,
        database,
        metadata,
        result
      })

      return result

    } catch (error) {
      logger.error('人脸注册失败:', error)
      this.emit('registration-error', error)

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 删除人脸
   * @param {string} database - 人脸库
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteFace(database, userId) {
    try {
      // 验证人脸库
      if (!this.faceDatabases[database]) {
        throw new Error(`不支持的数据库: ${database}`)
      }

      // 选择SDK进行删除
      const result = this.currentSDK === 'sensetime'
        ? await this.deleteFaceWithSensetime(database, userId)
        : await this.deleteFaceWithMegvii(database, userId)

      // 发出事件
      this.emit('face-deleted', { userId, database, result })

      return result

    } catch (error) {
      logger.error('人脸删除失败:', error)
      this.emit('deletion-error', error)

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 活体检测
   * @param {Buffer} imageData - 图像数据
   * @param {Object} options - 检测选项
   * @returns {Promise<Object>} 检测结果
   */
  async performLivenessTest(imageData, options = {}) {
    try {
      this.stats.livenessTests++

      const {
        testTypes = this.livenessConfig.types,
        timeout = this.livenessConfig.timeout,
        threshold = this.livenessConfig.threshold
      } = options

      // 选择SDK
      const result = this.currentSDK === 'sensetime'
        ? await this.performLivenessTestWithSensetime(imageData, { testTypes, timeout, threshold })
        : await this.performLivenessTestWithMegvii(imageData, { testTypes, timeout, threshold })

      if (result.success && result.isLive) {
        this.stats.successfulLivenessTests++
      }

      // 发出事件
      this.emit('liveness-test', result)

      return result

    } catch (error) {
      logger.error('活体检测失败:', error)
      this.emit('liveness-error', error)

      return {
        success: false,
        error: error.message,
        isLive: false
      }
    }
  }

  /**
   * 创建人脸会话（用于活体检测）
   * @param {string} userId - 用户ID
   * @param {Object} config - 会话配置
   * @returns {Promise<string>} 会话ID
   */
  async createFaceSession(userId, config = {}) {
    try {
      const sessionId = crypto.randomBytes(32).toString('hex')

      const session = {
        id: sessionId,
        userId,
        config: {
          testTypes: config.testTypes || this.livenessConfig.types,
          timeout: config.timeout || this.livenessConfig.timeout,
          threshold: config.threshold || this.livenessConfig.threshold,
          maxAttempts: config.maxAttempts || 3
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (config.timeout || this.livenessConfig.timeout)),
        attempts: [],
        status: 'pending'
      }

      this.sessions.set(sessionId, session)

      // 设置过期处理
      setTimeout(() => {
        if (this.sessions.has(sessionId)) {
          const expiredSession = this.sessions.get(sessionId)
          if (expiredSession.status === 'pending') {
            expiredSession.status = 'expired'
            this.emit('session-expired', sessionId)
          }
        }
      }, config.timeout || this.livenessConfig.timeout)

      return sessionId

    } catch (error) {
      logger.error('创建人脸会话失败:', error)
      throw error
    }
  }

  /**
   * 验证人脸会话
   * @param {string} sessionId - 会话ID
   * @param {Buffer} imageData - 图像数据
   * @param {string} testType - 测试类型
   * @returns {Promise<Object>} 验证结果
   */
  async validateFaceSession(sessionId, imageData, testType) {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error('会话不存在或已过期')
      }

      if (session.status !== 'pending') {
        throw new Error('会话已结束')
      }

      if (session.attempts.length >= session.config.maxAttempts) {
        throw new Error('已达到最大尝试次数')
      }

      // 执行活体检测
      const livenessResult = await this.performLivenessTest(imageData, {
        testTypes: [testType],
        threshold: session.config.threshold
      })

      // 记录尝试
      const attempt = {
        testType,
        timestamp: new Date(),
        result: livenessResult,
        success: livenessResult.success && livenessResult.isLive
      }

      session.attempts.push(attempt)

      // 检查是否完成所有测试
      const requiredTests = session.config.testTypes
      const successfulTests = session.attempts
        .filter(a => a.success)
        .map(a => a.testType)

      const isComplete = requiredTests.every(test => successfulTests.includes(test))

      if (isComplete) {
        session.status = 'completed'
        session.completedAt = new Date()
        this.emit('session-completed', sessionId)
      }

      return {
        success: true,
        sessionId,
        testType,
        result: livenessResult,
        isComplete,
        sessionStatus: session.status,
        remainingAttempts: session.config.maxAttempts - session.attempts.length
      }

    } catch (error) {
      logger.error('验证人脸会话失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 商汤SDK - 人脸检测
   */
  async detectFaceWithSensetime(imageData, options) {
    try {
      const auth = this.generateAuthSignature(
        this.sensetimeConfig.apiKey,
        this.sensetimeConfig.apiSecret,
        'POST',
        '/face/detect'
      )

      const response = await axios.post(
        `${this.sensetimeConfig.baseUrl}/face/detect`,
        {
          image: imageData.toString('base64'),
          max_face_count: options.maxFaceCount,
          detect_attributes: options.detectAttributes,
          calculate_face_quality: options.calculateFaceQuality,
          min_face_size: options.minFaceSize
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 0) {
        throw new Error(data.message || '商汤SDK检测失败')
      }

      return {
        success: true,
        faces: data.faces || [],
        imageId: data.image_id,
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('商汤SDK人脸检测失败:', error)
      throw error
    }
  }

  /**
   * 旷视SDK - 人脸检测
   */
  async detectFaceWithMegvii(imageData, options) {
    try {
      const auth = this.generateAuthSignature(
        this.megviiConfig.apiKey,
        this.megviiConfig.apiSecret,
        'POST',
        '/facekit/v1/face/detect'
      )

      const response = await axios.post(
        `${this.megviiConfig.baseUrl}/facekit/v1/face/detect`,
        {
          image: imageData.toString('base64'),
          max_face_num: options.maxFaceCount,
          return_attributes: options.detectAttributes ? 'gender,age,emotion,ethnicity' : 'none',
          face_quality_threshold: options.minFaceSize ? 0.3 : 0
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 200) {
        throw new Error(data.message || '旷视SDK检测失败')
      }

      return {
        success: true,
        faces: data.faces || [],
        imageId: data.image_id,
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('旷视SDK人脸检测失败:', error)
      throw error
    }
  }

  /**
   * 商汤SDK - 人脸比对
   */
  async compareFacesWithSensetime(image1, image2, options) {
    try {
      const auth = this.generateAuthSignature(
        this.sensetimeConfig.apiKey,
        this.sensetimeConfig.apiSecret,
        'POST',
        '/face/compare'
      )

      const response = await axios.post(
        `${this.sensetimeConfig.baseUrl}/face/compare`,
        {
          image1: image1.toString('base64'),
          image2: image2.toString('base64'),
          return_face_feature: options.returnFaceFeature
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 0) {
        throw new Error(data.message || '商汤SDK比对失败')
      }

      return {
        success: true,
        similarity: data.similarity || 0,
        isMatch: (data.similarity || 0) > options.threshold,
        faces: data.faces || [],
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('商汤SDK人脸比对失败:', error)
      throw error
    }
  }

  /**
   * 旷视SDK - 人脸比对
   */
  async compareFacesWithMegvii(image1, image2, options) {
    try {
      const auth = this.generateAuthSignature(
        this.megviiConfig.apiKey,
        this.megviiConfig.apiSecret,
        'POST',
        '/facekit/v1/face/compare'
      )

      const response = await axios.post(
        `${this.megviiConfig.baseUrl}/facekit/v1/face/compare`,
        {
          image1: image1.toString('base64'),
          image2: image2.toString('base64'),
          return_face_feature: options.returnFaceFeature
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 200) {
        throw new Error(data.message || '旷视SDK比对失败')
      }

      return {
        success: true,
        similarity: data.confidence || 0,
        isMatch: (data.confidence || 0) > options.threshold,
        faces: data.faces || [],
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('旷视SDK人脸比对失败:', error)
      throw error
    }
  }

  /**
   * 商汤SDK - 人脸搜索
   */
  async searchFaceWithSensetime(imageData, database, options) {
    try {
      const auth = this.generateAuthSignature(
        this.sensetimeConfig.apiKey,
        this.sensetimeConfig.apiSecret,
        'POST',
        '/face/search'
      )

      const response = await axios.post(
        `${this.sensetimeConfig.baseUrl}/face/search`,
        {
          image: imageData.toString('base64'),
          database: database,
          max_results: options.maxResults,
          threshold: options.threshold,
          return_metadata: options.returnMetadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 0) {
        throw new Error(data.message || '商汤SDK搜索失败')
      }

      return {
        success: true,
        matches: data.matches || [],
        searchId: data.search_id,
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('商汤SDK人脸搜索失败:', error)
      throw error
    }
  }

  /**
   * 旷视SDK - 人脸搜索
   */
  async searchFaceWithMegvii(imageData, database, options) {
    try {
      const auth = this.generateAuthSignature(
        this.megviiConfig.apiKey,
        this.megviiConfig.apiSecret,
        'POST',
        '/facekit/v1/face/search'
      )

      const response = await axios.post(
        `${this.megviiConfig.baseUrl}/facekit/v1/face/search`,
        {
          image: imageData.toString('base64'),
          outer_id: database,
          face_token: options.faceToken,
          return_result_count: options.maxResults,
          threshold: options.threshold
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 200) {
        throw new Error(data.message || '旷视SDK搜索失败')
      }

      return {
        success: true,
        matches: data.results || [],
        searchId: data.search_id,
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('旷视SDK人脸搜索失败:', error)
      throw error
    }
  }

  /**
   * 商汤SDK - 注册人脸
   */
  async registerFaceWithSensetime(imageData, database, userId, metadata) {
    try {
      const auth = this.generateAuthSignature(
        this.sensetimeConfig.apiKey,
        this.sensetimeConfig.apiSecret,
        'POST',
        '/face/register'
      )

      const response = await axios.post(
        `${this.sensetimeConfig.baseUrl}/face/register`,
        {
          image: imageData.toString('base64'),
          database: database,
          user_id: userId,
          metadata: metadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 0) {
        throw new Error(data.message || '商汤SDK注册失败')
      }

      return {
        success: true,
        faceId: data.face_id,
        userId: userId,
        database: database,
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('商汤SDK人脸注册失败:', error)
      throw error
    }
  }

  /**
   * 旷视SDK - 注册人脸
   */
  async registerFaceWithMegvii(imageData, database, userId, metadata) {
    try {
      const auth = this.generateAuthSignature(
        this.megviiConfig.apiKey,
        this.megviiConfig.apiSecret,
        'POST',
        '/facekit/v1/face/add'
      )

      const response = await axios.post(
        `${this.megviiConfig.baseUrl}/facekit/v1/face/add`,
        {
          image: imageData.toString('base64'),
          outer_id: database,
          user_id: userId,
          metadata: metadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 200) {
        throw new Error(data.message || '旷视SDK注册失败')
      }

      return {
        success: true,
        faceToken: data.face_token,
        userId: userId,
        database: database,
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('旷视SDK人脸注册失败:', error)
      throw error
    }
  }

  /**
   * 商汤SDK - 删除人脸
   */
  async deleteFaceWithSensetime(database, userId) {
    try {
      const auth = this.generateAuthSignature(
        this.sensetimeConfig.apiKey,
        this.sensetimeConfig.apiSecret,
        'DELETE',
        `/face/${database}/${userId}`
      )

      const response = await axios.delete(
        `${this.sensetimeConfig.baseUrl}/face/${database}/${userId}`,
        {
          headers: auth
        }
      )

      const data = response.data
      if (data.code !== 0) {
        throw new Error(data.message || '商汤SDK删除失败')
      }

      return {
        success: true,
        message: '人脸删除成功'
      }

    } catch (error) {
      logger.error('商汤SDK人脸删除失败:', error)
      throw error
    }
  }

  /**
   * 旷视SDK - 删除人脸
   */
  async deleteFaceWithMegvii(database, userId) {
    try {
      const auth = this.generateAuthSignature(
        this.megviiConfig.apiKey,
        this.megviiConfig.apiSecret,
        'POST',
        '/facekit/v1/face/delete'
      )

      const response = await axios.post(
        `${this.megviiConfig.baseUrl}/facekit/v1/face/delete`,
        {
          outer_id: database,
          user_id: userId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 200) {
        throw new Error(data.message || '旷视SDK删除失败')
      }

      return {
        success: true,
        message: '人脸删除成功'
      }

    } catch (error) {
      logger.error('旷视SDK人脸删除失败:', error)
      throw error
    }
  }

  /**
   * 商汤SDK - 活体检测
   */
  async performLivenessTestWithSensetime(imageData, options) {
    try {
      const auth = this.generateAuthSignature(
        this.sensetimeConfig.apiKey,
        this.sensetimeConfig.apiSecret,
        'POST',
        '/face/liveness'
      )

      const response = await axios.post(
        `${this.sensetimeConfig.baseUrl}/face/liveness`,
        {
          image: imageData.toString('base64'),
          test_types: options.testTypes,
          timeout: options.timeout,
          threshold: options.threshold
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 0) {
        throw new Error(data.message || '商汤SDK活体检测失败')
      }

      return {
        success: true,
        isLive: data.is_live || false,
        confidence: data.confidence || 0,
        testResults: data.test_results || [],
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('商汤SDK活体检测失败:', error)
      throw error
    }
  }

  /**
   * 旷视SDK - 活体检测
   */
  async performLivenessTestWithMegvii(imageData, options) {
    try {
      const auth = this.generateAuthSignature(
        this.megviiConfig.apiKey,
        this.megviiConfig.apiSecret,
        'POST',
        '/facekit/v1/face/liveness'
      )

      const response = await axios.post(
        `${this.megviiConfig.baseUrl}/facekit/v1/face/liveness`,
        {
          image: imageData.toString('base64'),
          test_types: options.testTypes,
          timeout: options.timeout,
          threshold: options.threshold
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...auth
          }
        }
      )

      const data = response.data
      if (data.code !== 200) {
        throw new Error(data.message || '旷视SDK活体检测失败')
      }

      return {
        success: true,
        isLive: data.is_live || false,
        confidence: data.confidence || 0,
        testResults: data.test_results || [],
        metadata: data.metadata
      }

    } catch (error) {
      logger.error('旷视SDK活体检测失败:', error)
      throw error
    }
  }

  /**
   * 验证图像格式
   * @param {Buffer} imageData - 图像数据
   */
  async validateImage(imageData) {
    if (!imageData || imageData.length === 0) {
      throw new Error('图像数据为空')
    }

    if (imageData.length > this.imageConfig.maxSize) {
      throw new Error('图像大小超过限制')
    }

    // 这里可以添加更多的图像格式验证
    // 例如使用Jimp或Sharp库验证图像尺寸和格式
  }

  /**
   * 获取使用统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      detectionSuccessRate: this.stats.totalDetections > 0
        ? (this.stats.successfulDetections / this.stats.totalDetections * 100).toFixed(2) + '%'
        : '0%',
      matchSuccessRate: this.stats.totalMatches > 0
        ? (this.stats.successfulMatches / this.stats.totalMatches * 100).toFixed(2) + '%'
        : '0%',
      registrationSuccessRate: this.stats.totalRegistrations > 0
        ? (this.stats.successfulRegistrations / this.stats.totalRegistrations * 100).toFixed(2) + '%'
        : '0%',
      livenessSuccessRate: this.stats.livenessTests > 0
        ? (this.stats.successfulLivenessTests / this.stats.livenessTests * 100).toFixed(2) + '%'
        : '0%',
      currentSDK: this.currentSDK,
      activeSessions: this.sessions.size,
      cacheSize: this.cache.size
    }
  }

  /**
   * 获取支持的人脸库
   * @returns {Array} 人脸库列表
   */
  getFaceDatabases() {
    return Object.entries(this.faceDatabases).map(([key, name]) => ({
      key,
      name
    }))
  }

  /**
   * 清理会话
   */
  cleanupSessions() {
    const now = new Date()
    const expiredSessions = []

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now || session.status !== 'pending') {
        expiredSessions.push(sessionId)
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId)
    })

    logger.info(`清理了 ${expiredSessions.length} 个过期的人脸会话`)
  }
}

module.exports = FaceRecognitionService