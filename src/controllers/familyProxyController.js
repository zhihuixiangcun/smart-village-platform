const familyProxyService = require('../services/familyProxyService');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/family-proxy');
    fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // 最多5个文件
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。只允许图片和PDF文件。'));
    }
  }
});

/**
 * 家庭代理系统控制器
 */
class FamilyProxyController {
  constructor() {
    this.upload = upload;
    this.uploadMultiple = uploadMultiple;
  }
  /**
   * 认证家庭关系
   */
  async authenticateRelation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { principalUserId, relationship, verificationMethod, notes } = req.body;
      const agentUserId = req.user.id;
      const imagePath = req.file ? req.file.path : null;

      const options = {
        relationship,
        verificationMethod,
        notes,
        uploadFiles: req.files ? req.files.map(file => ({
          fieldname: file.fieldname,
          path: file.path,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        })) : []
      };

      const result = await familyProxyService.authenticateProxyRelation(
        agentUserId,
        principalUserId,
        imagePath,
        options
      );

      // 清理上传的文件
      if (imagePath) {
        await this.cleanupFile(imagePath);
      }
      if (req.files) {
        await this.cleanupFiles(req.files);
      }

      res.json({
        success: true,
        message: result.success ? '家庭关系认证成功' : '家庭关系认证失败',
        data: result.data,
        auditId: result.auditId,
        error: result.error
      });

    } catch (error) {
      logger.error('家庭关系认证失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '家庭关系认证失败',
        error: error.message
      });
    }
  }

  /**
   * 创建代理会话
   */
  async createProxySession(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { principalUserId, purpose, validMinutes, maxOperations } = req.body;
      const agentUserId = req.user.id;

      const sessionData = {
        purpose,
        validMinutes: parseInt(validMinutes) || 60,
        maxOperations: parseInt(maxOperations) || 10,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      const result = await familyProxyService.createProxySession(
        agentUserId,
        principalUserId,
        sessionData
      );

      res.json({
        success: true,
        message: '代理会话创建成功',
        data: result.data,
        error: result.error
      });

    } catch (error) {
      logger.error('创建代理会话失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建代理会话失败',
        error: error.message
      });
    }
  }

  /**
   * 执行代理操作
   */
  async executeProxyOperation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;
      const { operationType, operationData, notes } = req.body;

      const result = await familyProxyService.executeProxyOperation(
        sessionId,
        operationType,
        { ...operationData, notes }
      );

      res.json({
        success: result.success,
        message: result.success ? '代理操作执行成功' : '代理操作执行失败',
        data: result.data,
        operationId: result.operationId,
        error: result.error
      });

    } catch (error) {
      logger.error('执行代理操作失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '执行代理操作失败',
        error: error.message
      });
    }
  }

  /**
   * 终止代理会话
   */
  async terminateProxySession(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;
      const { reason } = req.body;

      const result = await familyProxyService.terminateProxySession(sessionId, reason);

      res.json({
        success: true,
        message: '代理会话已终止',
        data: result.data,
        error: result.error
      });

    } catch (error) {
      logger.error('终止代理会话失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '终止代理会话失败',
        error: error.message
      });
    }
  }

  /**
   * 获取代理关系列表
   */
  async getProxyRelations(req, res) {
    try {
      const agentUserId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      const relations = await familyProxyService.getProxyRelations(agentUserId, {
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: relations
      });

    } catch (error) {
      logger.error('获取代理关系列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取代理关系列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取活动代理会话
   */
  async getActiveProxySessions(req, res) {
    try {
      const { userId } = req.params;
      const requestUserId = req.user.id;

      const sessions = await familyProxyService.getActiveProxySessions(requestUserId, userId);

      res.json({
        success: true,
        data: sessions
      });

    } catch (error) {
      logger.error('获取活动代理会话失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取活动代理会话失败',
        error: error.message
      });
    }
  }

  /**
   * 获取代理操作日志
   */
  async getProxyOperationLogs(req, res) {
    try {
      const { sessionId } = req.params;
      const { page = 1, limit = 20, operationType, startDate, endDate } = req.query;

      const logs = await familyProxyService.getProxyOperationLogs(sessionId, {
        page: parseInt(page),
        limit: parseInt(limit),
        operationType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      res.json({
        success: true,
        data: logs
      });

    } catch (error) {
      logger.error('获取代理操作日志失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取代理操作日志失败',
        error: error.message
      });
    }
  }

  /**
   * 获取代理系统统计
   */
  async getProxyStatistics(req, res) {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      const stats = await familyProxyService.getProxyStatistics(userId, period);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('获取代理系统统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取代理系统统计失败',
        error: error.message
      });
    }
  }

  /**
   * 验证代理权限
   */
  async verifyProxyPermission(req, res) {
    try {
      const { sessionId } = req.params;
      const { operationType, dataContext } = req.body;

      const permission = await familyProxyService.verifyProxyPermission(
        sessionId,
        operationType,
        dataContext
      );

      res.json({
        success: true,
        data: permission
      });

    } catch (error) {
      logger.error('验证代理权限失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '验证代理权限失败',
        error: error.message
      });
    }
  }

  /**
   * 获取隐私设置
   */
  async getPrivacySettings(req, res) {
    try {
      const userId = req.user.id;

      const settings = await familyProxyService.getPrivacySettings(userId);

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      logger.error('获取隐私设置失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取隐私设置失败',
        error: error.message
      });
    }
  }

  /**
   * 更新隐私设置
   */
  async updatePrivacySettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { settings } = req.body;

      const result = await familyProxyService.updatePrivacySettings(userId, settings);

      res.json({
        success: true,
        message: '隐私设置更新成功',
        data: result
      });

    } catch (error) {
      logger.error('更新隐私设置失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新隐私设置失败',
        error: error.message
      });
    }
  }

  /**
   * 获取数据访问历史
   */
  async getDataAccessHistory(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, dataType, accessType } = req.query;

      const history = await familyProxyService.getDataAccessHistory(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        dataType,
        accessType,
        limit: 100
      });

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      logger.error('获取数据访问历史失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取数据访问历史失败',
        error: error.message
      });
    }
  }

  /**
   * 响应隐私访问请求
   */
  async respondToPrivacyRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { requestId } = req.params;
      const { action, reason } = req.body;
      const userId = req.user.id;

      const result = await familyProxyService.respondToPrivacyRequest(requestId, action, reason, userId);

      res.json({
        success: true,
        message: `隐私访问请求已${action === 'approve' ? '批准' : '拒绝'}`,
        data: result
      });

    } catch (error) {
      logger.error('响应隐私访问请求失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '响应隐私访问请求失败',
        error: error.message
      });
    }
  }

  /**
   * 获取家庭成员信息
   */
  async getFamilyMembers(req, res) {
    try {
      const userId = req.user.id;
      const { includeExtended = false } = req.query;

      const members = await familyProxyService.getFamilyMembers(userId, {
        includeExtended: includeExtended === 'true'
      });

      // 敏感信息脱敏
      const sanitizedMembers = members.map(member =>
        familyProxyService.sanitizeUserData(member, userId)
      );

      res.json({
        success: true,
        data: sanitizedMembers
      });

    } catch (error) {
      logger.error('获取家庭成员信息失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取家庭成员信息失败',
        error: error.message
      });
    }
  }

  /**
   * 清理单个文件
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('清理文件失败:', filePath, error);
    }
  }

  /**
   * 清理多个文件
   */
  async cleanupFiles(files) {
    for (const file of files) {
      await this.cleanupFile(file.path);
    }
  }
}

module.exports = new FamilyProxyController();