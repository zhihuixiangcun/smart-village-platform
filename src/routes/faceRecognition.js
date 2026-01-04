/**
 * 人脸识别路由
 * 定义人脸识别相关的API端点
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const FaceRecognitionController = require('../controllers/faceRecognitionController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');
const auditMiddleware = require('../middleware/audit');
const router = express.Router();

const faceController = new FaceRecognitionController();

// 通用验证规则
const imageValidation = [
  body('image')
    .notEmpty()
    .withMessage('图像数据不能为空')
    .isBase64()
    .withMessage('图像数据必须是Base64格式')
];

const userIdValidation = [
  body('userId')
    .notEmpty()
    .withMessage('用户ID不能为空')
    .isMongoId()
    .withMessage('用户ID格式无效')
];

const villageIdValidation = [
  query('villageId')
    .notEmpty()
    .withMessage('村庄ID不能为空')
    .isMongoId()
    .withMessage('村庄ID格式无效')
];

// 人脸检测
router.post('/detect',
  authMiddleware.authenticate,
  rateLimitMiddleware.faceDetection,
  imageValidation,
  villageIdValidation,
  auditMiddleware.logRequest,
  faceController.detectFaces.bind(faceController)
);

// 人脸注册
router.post('/register',
  authMiddleware.authenticate,
  rateLimitMiddleware.faceRegister,
  [
    ...imageValidation,
    ...userIdValidation,
    body('villageId')
      .notEmpty()
      .withMessage('村庄ID不能为空')
      .isMongoId()
      .withMessage('村庄ID格式无效'),
    body('requireLiveness')
      .optional()
      .isBoolean()
      .withMessage('活体检测标志必须是布尔值')
  ],
  auditMiddleware.logRequest,
  faceController.registerFace.bind(faceController)
);

// 人脸验证 (1:1)
router.post('/verify',
  authMiddleware.authenticate,
  rateLimitMiddleware.faceVerify,
  [
    ...imageValidation,
    ...userIdValidation,
    query('villageId')
      .notEmpty()
      .withMessage('村庄ID不能为空')
      .isMongoId()
      .withMessage('村庄ID格式无效'),
    body('requireLiveness')
      .optional()
      .isBoolean()
      .withMessage('活体检测标志必须是布尔值')
  ],
  auditMiddleware.logRequest,
  faceController.verifyFace.bind(faceController)
);

// 人脸识别 (1:N)
router.post('/identify',
  authMiddleware.authenticate,
  rateLimitMiddleware.faceIdentify,
  [
    ...imageValidation,
    body('villageId')
      .notEmpty()
      .withMessage('村庄ID不能为空')
      .isMongoId()
      .withMessage('村庄ID格式无效'),
    body('maxResults')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('最大结果数必须在1-20之间')
  ],
  auditMiddleware.logRequest,
  faceController.identifyFace.bind(faceController)
);

// 活体检测
router.post('/liveness/detect',
  authMiddleware.authenticate,
  rateLimitMiddleware.livenessDetection,
  [
    body('frames')
      .notEmpty()
      .withMessage('帧数据不能为空')
      .isArray({ min: 3, max: 10 })
      .withMessage('帧数必须在3-10之间'),
    body('frames.*')
      .isBase64()
      .withMessage('帧数据必须是Base64格式'),
    body('actions')
      .optional()
      .isArray()
      .withMessage('动作列表必须是数组'),
    body('actions.*')
      .isIn(['blink', 'mouth', 'head', 'left', 'right'])
      .withMessage('动作类型无效')
  ],
  auditMiddleware.logRequest,
  faceController.detectLiveness.bind(faceController)
);

// 创建亲属代理关系
router.post('/family-relation/create',
  authMiddleware.authenticate,
  rateLimitMiddleware.familyRelation,
  [
    body('principalUserId')
      .notEmpty()
      .withMessage('被代理者ID不能为空')
      .isMongoId()
      .withMessage('被代理者ID格式无效'),
    body('agentUserId')
      .notEmpty()
      .withMessage('代理者ID不能为空')
      .isMongoId()
      .withMessage('代理者ID格式无效'),
    body('relationType')
      .notEmpty()
      .withMessage('关系类型不能为空')
      .isIn(['spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'guardian', 'other'])
      .withMessage('关系类型无效'),
    body('permissions.queryPermissions')
      .optional()
      .isArray()
      .withMessage('查询权限必须是数组'),
    body('permissions.actionPermissions')
      .optional()
      .isArray()
      .withMessage('操作权限必须是数组'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('过期时间格式无效')
  ],
  auditMiddleware.logRequest,
  faceController.createFamilyRelation.bind(faceController)
);

// 获取用户人脸注册状态
router.get('/user/:userId/status',
  authMiddleware.authenticate,
  rateLimitMiddleware.general,
  [
    param('userId')
      .notEmpty()
      .withMessage('用户ID不能为空')
      .isMongoId()
      .withMessage('用户ID格式无效'),
    query('villageId')
      .notEmpty()
      .withMessage('村庄ID不能为空')
      .isMongoId()
      .withMessage('村庄ID格式无效')
  ],
  auditMiddleware.logRequest,
  faceController.getUserFaceStatus.bind(faceController)
);

// 删除用户人脸数据
router.delete('/user/:userId',
  authMiddleware.authenticate,
  rateLimitMiddleware.faceDelete,
  [
    param('userId')
      .notEmpty()
      .withMessage('用户ID不能为空')
      .isMongoId()
      .withMessage('用户ID格式无效'),
    query('villageId')
      .notEmpty()
      .withMessage('村庄ID不能为空')
      .isMongoId()
      .withMessage('村庄ID格式无效')
  ],
  auditMiddleware.logRequest,
  faceController.deleteUserFace.bind(faceController)
);

// 人脸比较
router.post('/compare',
  authMiddleware.authenticate,
  rateLimitMiddleware.faceVerify,
  [
    body('image1')
      .notEmpty()
      .withMessage('第一张图像不能为空')
      .isBase64()
      .withMessage('第一张图像必须是Base64格式'),
    body('image2')
      .notEmpty()
      .withMessage('第二张图像不能为空')
      .isBase64()
      .withMessage('第二张图像必须是Base64格式')
  ],
  auditMiddleware.logRequest,
  async (req, res) => {
    try {
      // 调用Python服务进行人脸比较
      const result = await faceController.callPythonService('/api/face/compare', {
        image1: req.body.image1,
        image2: req.body.image2
      });

      await faceController.logOperation({
        operationType: 'face_compare',
        userId: req.user.id,
        villageId: 'unknown', // 比较操作可能不涉及特定村庄
        result: 'success',
        details: {
          isMatch: result.is_match,
          similarity: result.similarity,
          confidence: result.confidence
        },
        deviceInfo: faceController.getDeviceInfo(req)
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({ error: '人脸比较失败', message: error.message });
    }
  }
);

// 批量人脸验证
router.post('/batch/verify',
  authMiddleware.authenticate,
  rateLimitMiddleware.batchOperation,
  [
    body('requests')
      .notEmpty()
      .withMessage('请求数据不能为空')
      .isArray({ min: 1, max: 10 })
      .withMessage('请求数量必须在1-10之间'),
    body('requests.*.image')
      .notEmpty()
      .withMessage('图像数据不能为空')
      .isBase64()
      .withMessage('图像数据必须是Base64格式'),
    body('requests.*.userId')
      .notEmpty()
      .withMessage('用户ID不能为空')
      .isMongoId()
      .withMessage('用户ID格式无效'),
    body('villageId')
      .notEmpty()
      .withMessage('村庄ID不能为空')
      .isMongoId()
      .withMessage('村庄ID格式无效')
  ],
  auditMiddleware.logRequest,
  async (req, res) => {
    try {
      const { requests, villageId } = req.body;
      const results = [];

      // 并行处理多个验证请求
      const promises = requests.map(async (request, index) => {
        try {
          const result = await faceController.callPythonService('/api/face/verify', {
            image: request.image,
            userId: request.userId,
            villageId
          });

          return {
            index,
            success: true,
            userId: request.userId,
            isMatch: result.is_match,
            similarity: result.similarity,
            confidence: result.confidence
          };
        } catch (error) {
          return {
            index,
            success: false,
            userId: request.userId,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(promises);

      await faceController.logOperation({
        operationType: 'batch_verify',
        userId: req.user.id,
        villageId,
        result: 'success',
        details: {
          requestCount: requests.length,
          successCount: batchResults.filter(r => r.success).length
        },
        deviceInfo: faceController.getDeviceInfo(req)
      });

      res.json({
        success: true,
        data: {
          results: batchResults,
          summary: {
            total: requests.length,
            success: batchResults.filter(r => r.success).length,
            failed: batchResults.filter(r => !r.success).length
          }
        }
      });

    } catch (error) {
      res.status(500).json({ error: '批量验证失败', message: error.message });
    }
  }
);

// 获取人脸识别配置
router.get('/config',
  authMiddleware.authenticate,
  rateLimitMiddleware.general,
  villageIdValidation,
  async (req, res) => {
    try {
      const { FaceRecognitionConfig } = require('../models/FaceRecognition');
      const { villageId } = req.query;

      let config = await FaceRecognitionConfig.findOne({ villageId });

      if (!config) {
        // 创建默认配置
        config = new FaceRecognitionConfig({
          villageId,
          thresholds: {
            verificationThreshold: 0.8,
            identificationThreshold: 0.7,
            livenessThreshold: 0.85
          },
          security: {
            maxRetryAttempts: 3,
            lockoutDuration: 30,
            sessionTimeout: 15
          }
        });
        await config.save();
      }

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      res.status(500).json({ error: '获取配置失败', message: error.message });
    }
  }
);

// 更新人脸识别配置
router.put('/config',
  authMiddleware.authenticate,
  rateLimitMiddleware.general,
  [
    body('villageId')
      .notEmpty()
      .withMessage('村庄ID不能为空')
      .isMongoId()
      .withMessage('村庄ID格式无效'),
    body('thresholds.verificationThreshold')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('验证阈值必须在0-1之间'),
    body('thresholds.identificationThreshold')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('识别阈值必须在0-1之间'),
    body('thresholds.livenessThreshold')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('活体检测阈值必须在0-1之间')
  ],
  auditMiddleware.logRequest,
  async (req, res) => {
    try {
      const { FaceRecognitionConfig } = require('../models/FaceRecognition');
      const { villageId, ...updateData } = req.body;

      // 权限检查：只有管理员可以更新配置
      if (!req.user.permissions.includes('face_config_admin')) {
        return res.status(403).json({ error: '权限不足' });
      }

      let config = await FaceRecognitionConfig.findOne({ villageId });

      if (!config) {
        config = new FaceRecognitionConfig({ villageId });
      }

      // 更新配置
      Object.assign(config, updateData);
      config.updatedBy = req.user.id;
      config.lastUpdated = new Date();

      await config.save();

      await faceController.logOperation({
        operationType: 'config_update',
        userId: req.user.id,
        villageId,
        result: 'success',
        details: updateData,
        deviceInfo: faceController.getDeviceInfo(req)
      });

      res.json({
        success: true,
        data: config,
        message: '配置更新成功'
      });

    } catch (error) {
      res.status(500).json({ error: '更新配置失败', message: error.message });
    }
  }
);

// 获取审计日志
router.get('/audit/logs',
  authMiddleware.authenticate,
  rateLimitMiddleware.general,
  [
    query('villageId')
      .notEmpty()
      .withMessage('村庄ID不能为空')
      .isMongoId()
      .withMessage('村庄ID格式无效'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间'),
    query('operationType')
      .optional()
      .isIn([
        'face_register', 'face_verify', 'face_identify',
        'relation_create', 'liveness_detect', 'face_delete'
      ])
      .withMessage('操作类型无效')
  ],
  auditMiddleware.logRequest,
  async (req, res) => {
    try {
      const { FaceRecognitionAudit } = require('../models/FaceRecognition');
      const {
        villageId,
        page = 1,
        limit = 20,
        operationType,
        startDate,
        endDate
      } = req.query;

      // 权限检查：需要审计权限
      if (!req.user.permissions.includes('face_audit')) {
        return res.status(403).json({ error: '权限不足' });
      }

      // 构建查询条件
      const query = { villageId };

      if (operationType) {
        query.operationType = operationType;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate);
        }
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        FaceRecognitionAudit
          .find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .select('-requestParams -responseResult') // 不返回敏感数据
          .populate('userId', 'name email')
          .populate('targetUserId', 'name email'),
        FaceRecognitionAudit.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      res.status(500).json({ error: '获取审计日志失败', message: error.message });
    }
  }
);

module.exports = router;