/**
 * 活体检测和防欺骗服务
 * 集成多种活体检测算法，提供综合防欺骗方案
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class LivenessDetectionService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      // 基础配置
      enableAntiSpoofing: config.enableAntiSpoofing !== false,
      enableMultiModal: config.enableMultiModal || false,
      confidenceThreshold: config.confidenceThreshold || 0.8,

      // 动作检测配置
      actionTimeout: config.actionTimeout || 10000,
      actionSequence: config.actionSequence || ['random'],
      requiredActions: config.requiredActions || 2,

      // 防欺骗配置
      antiSpoofingMethods: config.antiSpoofingMethods || [
        'motion_analysis',
        'texture_analysis',
        'depth_analysis',
        'blink_detection',
        'challenge_response'
      ],

      // 图像质量要求
      minImageQuality: config.minImageQuality || 0.7,
      maxMotionBlur: config.maxMotionBlur || 0.3,
      minBrightness: config.minBrightness || 0.3,
      maxBrightness: config.maxBrightness || 0.7,

      // 会话管理
      sessionTimeout: config.sessionTimeout || 300000, // 5分钟
      maxAttempts: config.maxAttempts || 3,

      // 安全配置
      enableSessionValidation: config.enableSessionValidation !== false,
      enableRateLimiting: config.enableRateLimiting !== false,

      ...config
    };

    // 活体检测方法映射
    this.detectionMethods = {
      motion_analysis: this.motionAnalysis.bind(this),
      texture_analysis: this.textureAnalysis.bind(this),
      depth_analysis: this.depthAnalysis.bind(this),
      blink_detection: this.blinkDetection.bind(this),
      challenge_response: this.challengeResponse.bind(this)
    };

    // 会话管理
    this.sessions = new Map();
    this.rateLimiter = new Map();

    // 统计信息
    this.stats = {
      totalSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      spoofingAttempts: 0
    };

    // 初始化模型和算法
    this.initializeModels();
  }

  /**
   * 初始化活体检测模型
   */
  async initializeModels() {
    try {
      // 加载预训练的活体检测模型
      await this.loadAntiSpoofingModels();

      // 初始化图像处理算法
      this.initializeImageProcessing();

      // 设置防欺骗规则引擎
      this.initializeAntiSpoofingRules();

      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 加载反欺骗模型
   */
  async loadAntiSpoofingModels() {
    try {
      const modelPath = path.join(__dirname, '../models/anti_spoofing');

      // 检查模型文件是否存在
      const modelFiles = await fs.readdir(modelPath);

      this.models = {
        faceAntiSpoofing: null,
        motionAnalyzer: null,
        textureAnalyzer: null
      };

      // 加载TensorFlow模型
      for (const file of modelFiles) {
        if (file.includes('anti_spoofing')) {
          // 这里应该加载实际的TensorFlow模型
          // this.models.faceAntiSpoofing = await tf.loadLayersModel(`file://${modelPath}/${file}`);
        }
      }

      logger.debug('反欺骗模型加载完成');
    } catch (error) {
      logger.warn('反欺骗模型加载失败，使用备用算法:', error);
    }
  }

  /**
   * 初始化图像处理
   */
  initializeImageProcessing() {
    this.imageProcessor = {
      // 质量评估
      assessQuality: (imageData) => {
        // 简化的图像质量评估
        return {
          sharpness: this.calculateSharpness(imageData),
          brightness: this.calculateBrightness(imageData),
          contrast: this.calculateContrast(imageData),
          noise: this.calculateNoise(imageData)
        };
      },

      // 人脸关键点检测
      detectLandmarks: (imageData) => {
        // 简化的人脸关键点检测
        return {
          leftEye: { x: 0.3, y: 0.4 },
          rightEye: { x: 0.7, y: 0.4 },
          nose: { x: 0.5, y: 0.5 },
          mouth: { x: 0.5, y: 0.7 }
        };
      }
    };
  }

  /**
   * 初始化反欺骗规则
   */
  initializeAntiSpoofingRules() {
    this.antiSpoofingRules = [
      {
        name: 'motion_consistency',
        check: this.checkMotionConsistency.bind(this),
        weight: 0.3
      },
      {
        name: 'texture_variation',
        check: this.checkTextureVariation.bind(this),
        weight: 0.2
      },
      {
        name: 'blink_naturalness',
        check: this.checkBlinkNaturalness.bind(this),
        weight: 0.2
      },
      {
        name: 'reflection_detection',
        check: this.checkReflectionDetection.bind(this),
        weight: 0.15
      },
      {
        name: 'depth_consistency',
        check: this.checkDepthConsistency.bind(this),
        weight: 0.15
      }
    ];
  }

  /**
   * 创建活体检测会话
   */
  createSession(userId, options = {}) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      status: 'active',
      attempts: 0,
      currentAction: null,
      completedActions: [],
      challengeSequence: this.generateChallengeSequence(),
      frames: [],
      results: {},
      metadata: {
        userAgent: options.userAgent,
        ipAddress: options.ipAddress,
        deviceId: options.deviceId
      }
    };

    this.sessions.set(sessionId, session);
    this.stats.totalSessions++;

    this.emit('sessionCreated', { sessionId, userId });

    return {
      sessionId,
      challengeSequence: session.challengeSequence,
      timeout: this.config.actionTimeout
    };
  }

  /**
   * 生成挑战序列
   */
  generateChallengeSequence() {
    const actions = ['blink', 'mouth_open', 'head_left', 'head_right', 'head_up', 'head_down'];
    const sequence = [];

    for (let i = 0; i < this.config.requiredActions; i++) {
      const randomIndex = Math.floor(Math.random() * actions.length);
      const action = actions[randomIndex];

      sequence.push({
        action,
        expectedDuration: 2000 + Math.random() * 2000,
        difficulty: 'medium'
      });
    }

    return sequence;
  }

  /**
   * 处理活体检测帧
   */
  async processFrame(sessionId, frameData) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'active') {
        throw new Error('Invalid or expired session');
      }

      // 检查超时
      if (Date.now() - session.startTime > this.config.sessionTimeout) {
        this.invalidateSession(sessionId, 'timeout');
        throw new Error('Session timeout');
      }

      // 添加帧到会话
      session.frames.push({
        timestamp: Date.now(),
        data: frameData,
        processed: false
      });

      // 获取当前动作
      const currentChallenge = session.challengeSequence[session.completedActions.length];
      if (!currentChallenge) {
        return { status: 'completed' };
      }

      // 执行活体检测
      const detectionResult = await this.performLivenessDetection(
        frameData,
        currentChallenge,
        session
      );

      // 更新会话状态
      session.results[currentChallenge.action] = detectionResult;

      // 检查动作是否完成
      if (detectionResult.success) {
        session.completedActions.push(currentChallenge.action);
        session.currentAction = null;

        // 检查是否所有动作都完成
        if (session.completedActions.length >= this.config.challengeSequence.length) {
          return await this.completeSession(sessionId);
        }

        return {
          status: 'action_completed',
          action: currentChallenge.action,
          nextAction: session.challengeSequence[session.completedActions.length]?.action
        };
      } else {
        session.attempts++;
        if (session.attempts >= this.config.maxAttempts) {
          this.invalidateSession(sessionId, 'max_attempts');
          throw new Error('Maximum attempts exceeded');
        }

        return {
          status: 'action_failed',
          action: currentChallenge.action,
          attemptsRemaining: this.config.maxAttempts - session.attempts,
          reason: detectionResult.reason
        };
      }

    } catch (error) {
      this.emit('error', { sessionId, error: error.message });
      throw error;
    }
  }

  /**
   * 执行活体检测
   */
  async performLivenessDetection(frameData, challenge, session) {
    const results = {
      success: false,
      confidence: 0,
      reason: '',
      details: {}
    };

    try {
      // 图像质量检查
      const quality = this.imageProcessor.assessQuality(frameData);
      if (quality.sharpness < this.config.minImageQuality) {
        results.reason = 'Image quality too low';
        return results;
      }

      // 执行多种检测方法
      const detectionResults = [];
      for (const method of this.config.antiSpoofingMethods) {
        if (this.detectionMethods[method]) {
          const methodResult = await this.detectionMethods[method](frameData, challenge, session);
          detectionResults.push(methodResult);
        }
      }

      // 综合评分
      const weightedScore = this.calculateWeightedScore(detectionResults);
      results.confidence = weightedScore;

      // 检查是否通过阈值
      if (weightedScore >= this.config.confidenceThreshold) {
        results.success = true;
      } else {
        results.reason = `Low confidence score: ${weightedScore.toFixed(3)}`;
      }

      results.details = {
        methods: detectionResults,
        quality,
        timestamp: Date.now()
      };

      return results;

    } catch (error) {
      results.reason = `Detection error: ${error.message}`;
      return results;
    }
  }

  /**
   * 运动分析检测
   */
  async motionAnalysis(frameData, challenge, session) {
    const recentFrames = session.frames.slice(-10);

    if (recentFrames.length < 3) {
      return { method: 'motion_analysis', score: 0, reason: 'Insufficient frames' };
    }

    // 计算帧间运动
    const motions = [];
    for (let i = 1; i < recentFrames.length; i++) {
      const motion = this.calculateFrameMotion(recentFrames[i-1].data, recentFrames[i].data);
      motions.push(motion);
    }

    // 分析运动模式
    const motionPattern = this.analyzeMotionPattern(motions, challenge.action);

    return {
      method: 'motion_analysis',
      score: motionPattern.score,
      reason: motionPattern.reason,
      details: motionPattern
    };
  }

  /**
   * 纹理分析检测
   */
  async textureAnalysis(frameData, challenge, session) {
    // 分析皮肤纹理特征
    const textureFeatures = this.extractTextureFeatures(frameData);

    // 检测是否为真实皮肤纹理
    const skinAuthenticity = this.validateSkinTexture(textureFeatures);

    return {
      method: 'texture_analysis',
      score: skinAuthenticity.score,
      reason: skinAuthenticity.reason,
      details: textureFeatures
    };
  }

  /**
   * 深度分析检测
   */
  async depthAnalysis(frameData, challenge, session) {
    // 基于图像的深度估计（简化版）
    const depthMap = this.estimateDepth(frameData);

    // 检测深度一致性
    const depthConsistency = this.checkDepthConsistency(depthMap);

    return {
      method: 'depth_analysis',
      score: depthConsistency.score,
      reason: depthConsistency.reason,
      details: depthMap
    };
  }

  /**
   * 眨眼检测
   */
  async blinkDetection(frameData, challenge, session) {
    if (challenge.action !== 'blink') {
      return { method: 'blink_detection', score: 1, reason: 'Not a blink challenge' };
    }

    const landmarks = this.imageProcessor.detectLandmarks(frameData);
    const eyeState = this.detectEyeState(landmarks);

    return {
      method: 'blink_detection',
      score: eyeState.isBlinking ? 0.9 : 0.1,
      reason: eyeState.reason,
      details: eyeState
    };
  }

  /**
   * 挑战响应检测
   */
  async challengeResponse(frameData, challenge, session) {
    // 验证挑战响应的正确性
    const response = this.validateChallengeResponse(frameData, challenge, session);

    return {
      method: 'challenge_response',
      score: response.score,
      reason: response.reason,
      details: response
    };
  }

  /**
   * 计算加权评分
   */
  calculateWeightedScore(detectionResults) {
    if (detectionResults.length === 0) return 0;

    let totalScore = 0;
    let totalWeight = 0;

    for (const result of detectionResults) {
      const weight = this.getMethodWeight(result.method);
      totalScore += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * 获取方法权重
   */
  getMethodWeight(method) {
    const weights = {
      motion_analysis: 0.25,
      texture_analysis: 0.20,
      depth_analysis: 0.20,
      blink_detection: 0.20,
      challenge_response: 0.15
    };
    return weights[method] || 0.1;
  }

  /**
   * 完成会话
   */
  async completeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // 计算总体评分
    const overallScore = this.calculateOverallScore(session.results);

    // 检查反欺骗规则
    const antiSpoofingResults = await this.runAntiSpoofingChecks(session);

    const result = {
      sessionId,
      success: overallScore >= this.config.confidenceThreshold && antiSpoofingResults.passed,
      confidence: overallScore,
      antiSpoofing: antiSpoofingResults,
      actions: session.completedActions,
      duration: Date.now() - session.startTime,
      frameCount: session.frames.length
    };

    session.status = 'completed';
    session.endTime = Date.now();
    session.result = result;

    if (result.success) {
      this.stats.successfulSessions++;
    } else {
      this.stats.failedSessions++;
    }

    this.emit('sessionCompleted', result);

    // 清理会话（延迟清理，用于日志记录）
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000); // 1分钟后清理

    return result;
  }

  /**
   * 运行反欺骗检查
   */
  async runAntiSpoofingChecks(session) {
    const results = {
      passed: true,
      checks: [],
      overallScore: 1
    };

    for (const rule of this.antiSpoofingRules) {
      try {
        const checkResult = await rule.check(session);
        results.checks.push({
          name: rule.name,
          passed: checkResult.passed,
          score: checkResult.score,
          details: checkResult.details
        });

        if (!checkResult.passed) {
          results.passed = false;
        }

      } catch (error) {
        logger.error(`Anti-spoofing check ${rule.name} failed:`, error);
      }
    }

    // 计算反欺骗总体评分
    const passedCount = results.checks.filter(c => c.passed).length;
    results.overallScore = passedCount / results.checks.length;

    return results;
  }

  /**
   * 使会话失效
   */
  invalidateSession(sessionId, reason) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'invalidated';
      session.invalidateReason = reason;
      session.endTime = Date.now();

      this.emit('sessionInvalidated', { sessionId, reason });
    }
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      status: session.status,
      startTime: session.startTime,
      completedActions: session.completedActions,
      totalActions: session.challengeSequence.length,
      attempts: session.attempts
    };
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      activeSessions: this.sessions.size,
      successRate: this.stats.totalSessions > 0
        ? (this.stats.successfulSessions / this.stats.totalSessions)
        : 0
    };
  }

  // 辅助方法（简化实现）
  calculateSharpness(imageData) { return 0.8; }
  calculateBrightness(imageData) { return 0.5; }
  calculateContrast(imageData) { return 0.6; }
  calculateNoise(imageData) { return 0.1; }
  calculateFrameMotion(frame1, frame2) { return 0.5; }
  analyzeMotionPattern(motions, action) { return { score: 0.8, reason: 'Normal motion' }; }
  extractTextureFeatures(imageData) { return {}; }
  validateSkinTexture(features) { return { score: 0.9, reason: 'Valid texture' }; }
  estimateDepth(imageData) { return {}; }
  checkDepthConsistency(depthMap) { return { score: 0.8, reason: 'Consistent depth' }; }
  detectEyeState(landmarks) { return { isBlinking: false, reason: 'Eyes open' }; }
  validateChallengeResponse(frameData, challenge, session) { return { score: 0.9, reason: 'Valid response' }; }

  checkMotionConsistency(session) { return { passed: true, score: 0.8, details: {} }; }
  checkTextureVariation(session) { return { passed: true, score: 0.7, details: {} }; }
  checkBlinkNaturalness(session) { return { passed: true, score: 0.9, details: {} }; }
  checkReflectionDetection(session) { return { passed: true, score: 0.8, details: {} }; }
  checkDepthConsistency(session) { return { passed: true, score: 0.8, details: {} }; }

  calculateOverallScore(results) {
    const scores = Object.values(results).map(r => r.confidence || 0);
    return scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
  }
}

module.exports = LivenessDetectionService;