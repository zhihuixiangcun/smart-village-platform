/**
 * 人脸识别控制器
 * 处理人脸识别相关的API请求
 */

const cryptoManager = require('../security/cryptoManager');
const { FaceFeature, FamilyRelation, FaceRecognitionAudit, FaceRecognitionConfig } = require('../models/FaceRecognition');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class FaceRecognitionController {
  constructor() {
    this.pythonServiceUrl = process.env.FACE_RECOGNITION_SERVICE_URL || 'http://localhost:8080';
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.uploadDir = path.join(__dirname, '../../uploads/faces');
    this.tempDir = path.join(__dirname, '../../temp/faces');

    // 确保目录存在
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('创建目录失败:', error);
    }
  }

  /**
   * 生成JWT令牌
   */
  generateJWT(payload) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
  }

  /**
   * 调用Python人脸识别服务
   */
  async callPythonService(endpoint, data, headers = {}) {
    try {
      const token = this.generateJWT({ service: 'nodejs-backend', timestamp: Date.now() });

      const response = await axios.post(`${this.pythonServiceUrl}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 30000 // 30秒超时
      });

      return response.data;
    } catch (error) {
      logger.error(`调用Python服务失败 (${endpoint}):`, error.message);
      throw new Error('人脸识别服务不可用');
    }
  }

  /**
   * 人脸检测
   */
  async detectFaces(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '参数验证失败', details: errors.array() });
      }

      const { image, villageId } = req.body;
      const userId = req.user.id;

      // 记录审计日志
      await this.logOperation({
        operationType: 'face_detect',
        userId,
        villageId,
        requestParams: { hasImage: !!image },
        deviceInfo: this.getDeviceInfo(req)
      });

      // 调用Python服务进行人脸检测
      const result = await this.callPythonService('/api/face/detect', {
        image,
        villageId
      });

      res.json({
        success: true,
        data: result,
        message: `检测到 ${result.face_count} 张人脸`
      });

    } catch (error) {
      logger.error('人脸检测失败:', error);
      res.status(500).json({ error: '人脸检测失败', message: error.message });
    }
  }

  /**
   * 人脸注册
   */
  async registerFace(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '参数验证失败', details: errors.array() });
      }

      const { image, userId: targetUserId, villageId, requireLiveness = true } = req.body;
      const operatorUserId = req.user.id;

      // 权限检查：用户只能注册自己的人脸，或需要管理员权限
      if (targetUserId !== operatorUserId && !req.user.permissions.includes('face_register_admin')) {
        return res.status(403).json({ error: '权限不足' });
      }

      // 检查用户是否已经注册人脸
      const existingFeature = await FaceFeature.findOne({
        userId: targetUserId,
        villageId,
        status: 'active'
      });

      if (existingFeature) {
        return res.status(409).json({ error: '用户已注册人脸' });
      }

      let result;
      if (requireLiveness) {
        // 带活体检测的注册
        result = await this.callPythonService('/api/face/register_with_liveness', {
          image,
          userId: targetUserId,
          villageId,
          actions: ['blink', 'mouth', 'head']
        });
      } else {
        // 普通注册
        result = await this.callPythonService('/api/face/register', {
          image,
          userId: targetUserId,
          villageId
        });
      }

      if (!result.success) {
        return res.status(400).json({ error: result.error || '注册失败' });
      }

      // 保存到数据库
      const faceFeature = new FaceFeature({
        userId: targetUserId,
        villageId,
        faceFeatures: {
          featureHash: result.feature_hash || crypto.generateUUID(),
          encryptedFeatures: result.registration_id, // 临时使用注册ID
          keyId: crypto.generateUUID(),
          algorithmVersion: '1.0',
          qualityScore: result.quality_score
        },
        registration: {
          timestamp: new Date(),
          deviceInfo: this.getDeviceInfo(req),
          liveness检测结果: result.liveness_result || null,
          operatorId: operatorUserId
        },
        status: 'active'
      });

      await faceFeature.save();

      // 记录审计日志
      await this.logOperation({
        operationType: 'face_register',
        userId: operatorUserId,
        targetUserId,
        villageId,
        result: 'success',
        details: {
          registrationId: result.registration_id,
          qualityScore: result.quality_score,
          livenessVerified: !!result.liveness_result
        },
        deviceInfo: this.getDeviceInfo(req)
      });

      res.json({
        success: true,
        data: {
          registrationId: result.registration_id,
          userId: targetUserId,
          qualityScore: result.quality_score,
          livenessResult: result.liveness_result,
          message: '人脸注册成功'
        }
      });

    } catch (error) {
      logger.error('人脸注册失败:', error);

      // 记录错误审计日志
      await this.logOperation({
        operationType: 'face_register',
        userId: req.user.id,
        villageId: req.body.villageId,
        result: 'failure',
        errorMessage: error.message,
        deviceInfo: this.getDeviceInfo(req)
      });

      res.status(500).json({ error: '人脸注册失败', message: error.message });
    }
  }

  /**
   * 人脸验证 (1:1)
   */
  async verifyFace(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '参数验证失败', details: errors.array() });
      }

      const { image, userId: targetUserId, requireLiveness = false } = req.body;
      const { villageId } = req.query;
      const operatorUserId = req.user.id;

      // 权限检查：用户只能验证自己，或需要代理权限
      if (targetUserId !== operatorUserId) {
        const hasProxyPermission = await this.checkProxyPermission(
          operatorUserId, targetUserId, 'view_info'
        );
        if (!hasProxyPermission) {
          return res.status(403).json({ error: '权限不足或需要代理授权' });
        }
      }

      // 获取用户的人脸特征
      const faceFeature = await FaceFeature.findOne({
        userId: targetUserId,
        villageId,
        status: 'active'
      });

      if (!faceFeature) {
        return res.status(404).json({ error: '用户未注册人脸' });
      }

      let result;
      if (requireLiveness) {
        result = await this.callPythonService('/api/face/verify_with_liveness', {
          image,
          userId: targetUserId,
          villageId
        });
      } else {
        result = await this.callPythonService('/api/face/verify', {
          image,
          userId: targetUserId,
          villageId
        });
      }

      // 记录审计日志
      await this.logOperation({
        operationType: 'face_verify',
        userId: operatorUserId,
        targetUserId,
        villageId,
        result: result.success ? 'success' : 'failure',
        details: {
          isMatch: result.is_match,
          similarity: result.similarity,
          confidence: result.confidence,
          livenessVerified: !!result.liveness_result
        },
        deviceInfo: this.getDeviceInfo(req)
      });

      res.json({
        success: true,
        data: {
          isMatch: result.is_match,
          similarity: result.similarity,
          confidence: result.confidence,
          userId: targetUserId,
          livenessResult: result.liveness_result,
          verifiedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('人脸验证失败:', error);

      // 记录错误审计日志
      await this.logOperation({
        operationType: 'face_verify',
        userId: req.user.id,
        targetUserId: req.body.userId,
        villageId: req.query.villageId,
        result: 'failure',
        errorMessage: error.message,
        deviceInfo: this.getDeviceInfo(req)
      });

      res.status(500).json({ error: '人脸验证失败', message: error.message });
    }
  }

  /**
   * 人脸识别 (1:N)
   */
  async identifyFace(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '参数验证失败', details: errors.array() });
      }

      const { image, villageId, maxResults = 5 } = req.body;
      const operatorUserId = req.user.id;

      // 权限检查：需要管理员权限或特殊识别权限
      if (!req.user.permissions.includes('face_identify')) {
        return res.status(403).json({ error: '权限不足' });
      }

      // 获取村庄所有激活的人脸特征
      const faceFeatures = await FaceFeature.find({
        villageId,
        status: 'active'
      }).populate('userId');

      if (faceFeatures.length === 0) {
        return res.json({
          success: true,
          data: {
            matches: [],
            message: '该村庄暂无注册人脸'
          }
        });
      }

      // 调用Python服务进行识别
      const result = await this.callPythonService('/api/face/identify', {
        image,
        villageId,
        database_features: faceFeatures.map(f => ({
          user_id: f.userId._id,
          feature_hash: f.faceFeatures.featureHash,
          feature_vector: [], // 实际需要从加密存储中解密
          quality_score: f.faceFeatures.qualityScore
        }))
      });

      // 记录审计日志
      await this.logOperation({
        operationType: 'face_identify',
        userId: operatorUserId,
        villageId,
        result: 'success',
        details: {
          matchCount: result.matches?.length || 0,
          maxResults
        },
        deviceInfo: this.getDeviceInfo(req)
      });

      res.json({
        success: true,
        data: {
          matches: result.matches || [],
          totalProcessed: faceFeatures.length,
          identifiedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('人脸识别失败:', error);

      // 记录错误审计日志
      await this.logOperation({
        operationType: 'face_identify',
        userId: req.user.id,
        villageId: req.body.villageId,
        result: 'failure',
        errorMessage: error.message,
        deviceInfo: this.getDeviceInfo(req)
      });

      res.status(500).json({ error: '人脸识别失败', message: error.message });
    }
  }

  /**
   * 活体检测
   */
  async detectLiveness(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '参数验证失败', details: errors.array() });
      }

      const { frames, actions = ['blink', 'mouth'] } = req.body;
      const { villageId } = req.query;

      if (!frames || frames.length < 3) {
        return res.status(400).json({ error: '至少需要3帧图像' });
      }

      // 调用Python服务进行活体检测
      const result = await this.callPythonService('/api/liveness/detect', {
        frames,
        actions
      });

      // 记录审计日志
      await this.logOperation({
        operationType: 'liveness_detect',
        userId: req.user.id,
        villageId,
        result: result.success ? 'success' : 'failure',
        details: {
          isLive: result.is_live,
          confidence: result.confidence,
          frameCount: frames.length
        },
        deviceInfo: this.getDeviceInfo(req)
      });

      res.json({
        success: true,
        data: {
          isLive: result.is_live,
          confidence: result.confidence,
          detectionMethods: result.detection_methods,
          details: result.details,
          frameCount: frames.length
        }
      });

    } catch (error) {
      logger.error('活体检测失败:', error);
      res.status(500).json({ error: '活体检测失败', message: error.message });
    }
  }

  /**
   * 创建亲属代理关系
   */
  async createFamilyRelation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: '参数验证失败', details: errors.array() });
      }

      const {
        principalUserId,
        agentUserId,
        relationType,
        relationProof,
        permissions,
        expiresAt
      } = req.body;
      const { villageId } = req.query;
      const operatorUserId = req.user.id;

      // 权限检查：只有管理员可以创建代理关系
      if (!req.user.permissions.includes('family_relation_admin')) {
        return res.status(403).json({ error: '权限不足' });
      }

      // 检查是否已存在代理关系
      const existingRelation = await FamilyRelation.findOne({
        principalUserId,
        agentUserId,
        villageId,
        status: 'active'
      });

      if (existingRelation) {
        return res.status(409).json({ error: '代理关系已存在' });
      }

      // 创建代理关系
      const familyRelation = new FamilyRelation({
        principalUserId,
        agentUserId,
        villageId,
        relationType,
        relationProof: {
          documents: relationProof?.documents || [],
          verificationStatus: 'pending'
        },
        permissions: {
          queryPermissions: permissions?.queryPermissions || ['basic_info'],
          actionPermissions: permissions?.actionPermissions || ['view_info'],
          restrictions: permissions?.restrictions || {}
        },
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: operatorUserId
      });

      await familyRelation.save();

      // 记录审计日志
      await this.logOperation({
        operationType: 'relation_create',
        userId: operatorUserId,
        targetUserId: principalUserId,
        villageId,
        result: 'success',
        details: {
          relationId: familyRelation._id,
          relationType,
          agentUserId
        },
        deviceInfo: this.getDeviceInfo(req)
      });

      res.json({
        success: true,
        data: {
          relationId: familyRelation._id,
          relationType,
          status: familyRelation.status,
          message: '代理关系创建成功'
        }
      });

    } catch (error) {
      logger.error('创建代理关系失败:', error);
      res.status(500).json({ error: '创建代理关系失败', message: error.message });
    }
  }

  /**
   * 检查代理权限
   */
  async checkProxyPermission(operatorUserId, targetUserId, permission) {
    try {
      const relation = await FamilyRelation.findOne({
        agentUserId: operatorUserId,
        principalUserId: targetUserId,
        status: 'active',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      if (!relation) {
        return false;
      }

      // 检查时间限制
      if (relation.permissions.restrictions.timeRestrictions) {
        const now = new Date();
        const restrictions = relation.permissions.restrictions.timeRestrictions;

        if (restrictions.startDate && now < new Date(restrictions.startDate)) {
          return false;
        }
        if (restrictions.endDate && now > new Date(restrictions.endDate)) {
          return false;
        }
      }

      // 检查权限
      if (permission.startsWith('query_')) {
        const permissionName = permission.replace('query_', '');
        return relation.permissions.queryPermissions.includes(permissionName);
      } else if (permission.startsWith('action_')) {
        const permissionName = permission.replace('action_', '');
        return relation.permissions.actionPermissions.includes(permissionName);
      }

      return false;
    } catch (error) {
      logger.error('检查代理权限失败:', error);
      return false;
    }
  }

  /**
   * 记录审计日志
   */
  async logOperation(logData) {
    try {
      const auditLog = new FaceRecognitionAudit({
        ...logData,
        requestId: crypto.generateUUID(),
        timestamp: new Date()
      });

      await auditLog.save();
    } catch (error) {
      logger.error('记录审计日志失败:', error);
    }
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo(req) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      deviceId: req.get('X-Device-ID'),
      platform: req.get('X-Platform'),
      browser: req.get('X-Browser')
    };
  }

  /**
   * 获取用户的人脸注册状态
   */
  async getUserFaceStatus(req, res) {
    try {
      const { userId } = req.params;
      const { villageId } = req.query;
      const operatorUserId = req.user.id;

      // 权限检查：用户只能查看自己，或需要代理权限
      if (userId !== operatorUserId) {
        const hasProxyPermission = await this.checkProxyPermission(
          operatorUserId, userId, 'view_info'
        );
        if (!hasProxyPermission) {
          return res.status(403).json({ error: '权限不足或需要代理授权' });
        }
      }

      const faceFeature = await FaceFeature.findOne({
        userId,
        villageId
      }).select('status registration.timestamp faceFeatures.qualityScore');

      res.json({
        success: true,
        data: {
          isRegistered: !!faceFeature,
          status: faceFeature?.status || 'not_registered',
          registrationDate: faceFeature?.registration?.timestamp,
          qualityScore: faceFeature?.faceFeatures?.qualityScore
        }
      });

    } catch (error) {
      logger.error('获取人脸状态失败:', error);
      res.status(500).json({ error: '获取人脸状态失败', message: error.message });
    }
  }

  /**
   * 删除用户的人脸数据
   */
  async deleteUserFace(req, res) {
    try {
      const { userId } = req.params;
      const { villageId } = req.query;
      const operatorUserId = req.user.id;

      // 权限检查：用户只能删除自己，或需要管理员权限
      if (userId !== operatorUserId && !req.user.permissions.includes('face_delete_admin')) {
        return res.status(403).json({ error: '权限不足' });
      }

      const faceFeature = await FaceFeature.findOneAndUpdate(
        { userId, villageId, status: 'active' },
        {
          status: 'deleted',
          lastUpdated: new Date()
        },
        { new: true }
      );

      if (!faceFeature) {
        return res.status(404).json({ error: '未找到用户的人脸数据' });
      }

      // 记录审计日志
      await this.logOperation({
        operationType: 'face_delete',
        userId: operatorUserId,
        targetUserId: userId,
        villageId,
        result: 'success',
        deviceInfo: this.getDeviceInfo(req)
      });

      res.json({
        success: true,
        message: '人脸数据已删除'
      });

    } catch (error) {
      logger.error('删除人脸数据失败:', error);
      res.status(500).json({ error: '删除人脸数据失败', message: error.message });
    }
  }
}

module.exports = FaceRecognitionController;