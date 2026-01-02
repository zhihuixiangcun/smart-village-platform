/**
 * 增强应急响应路由
 * 整合事件上报、资源调度、实时监控、应急预案等功能
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  // 应急事件管理
  quickReportEmergency,
  updateEmergencyStatus,
  addResponseAction,

  // 应急预案管理
  createEmergencyPlan,
  activateEmergencyPlan,

  // 应急资源管理
  getAvailableResources,
  dispatchResources,
  releaseResources,

  // 监控统计
  getEmergencyStats,
  getRealtimeMonitoring,

  // 文件上传
  upload
} = require('../controllers/enhancedEmergencyController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// 应急事件限流（放宽限制，确保紧急情况能及时上报）
const emergencyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 50, // 每分钟最多50次请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  }
});

// 资源调度限流
const resourceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 20,
  message: {
    success: false,
    error: '资源调度请求过于频繁，请稍后再试'
  }
});

// 应用认证和限流中间件
router.use(authenticateToken);
router.use(emergencyRateLimit);

// ============ 应急事件管理路由 ============

const emergencyRouter = express.Router();

// 快速上报应急事件
emergencyRouter.post('/quick-report',
  checkPermission('emergency:report'),
  upload,
  quickReportEmergency
);

// 获取应急事件列表
emergencyRouter.get('/',
  checkPermission('emergency:read'),
  async (req, res) => {
    try {
      const { Emergency } = require('../models/Emergency');
      const {
        villageId,
        status,
        type,
        severity,
        dateRange,
        page = 1,
        limit = 20
      } = req.query;

      let queryVillageId = villageId;
      if (req.user.role !== 'admin') {
        queryVillageId = req.user.villageId;
      }

      const query = { villageId: queryVillageId };

      if (status) query.status = status;
      if (type) query.type = type;
      if (severity) query.severity = severity;

      if (dateRange) {
        query.occurredAt = {};
        if (dateRange.start) query.occurredAt.$gte = new Date(dateRange.start);
        if (dateRange.end) query.occurredAt.$lte = new Date(dateRange.end);
      }

      const emergencies = await Emergency.find(query)
        .sort({ severity: -1, reportedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('createdBy', 'name avatar')
        .populate('assignedTeam.teamLeader', 'name phone')
        .lean();

      const total = await Emergency.countDocuments(query);

      res.json({
        success: true,
        data: {
          emergencies,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('获取应急事件列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取应急事件列表失败'
      });
    }
  }
);

// 获取应急事件详情
emergencyRouter.get('/:id',
  checkPermission('emergency:read'),
  async (req, res) => {
    try {
      const { Emergency } = require('../models/Emergency');
      const emergency = await Emergency.findById(req.params.id)
        .populate('createdBy', 'name avatar')
        .populate('updatedBy', 'name avatar')
        .populate('assignedTeam.teamLeader', 'name phone')
        .populate('assignedTeam.teamMembers', 'name phone')
        .populate('reporterInfo', 'name phone')
        .lean();

      if (!emergency) {
        return res.status(404).json({
          success: false,
          error: '应急事件不存在'
        });
      }

      // 权限检查
      if (req.user.role !== 'admin' && emergency.villageId.toString() !== req.user.villageId) {
        return res.status(403).json({
          success: false,
          error: '没有权限查看此应急事件'
        });
      }

      res.json({
        success: true,
        data: emergency
      });

    } catch (error) {
      logger.error('获取应急事件详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取应急事件详情失败'
      });
    }
  }
);

// 更新应急事件状态
emergencyRouter.put('/:id/status',
  checkPermission('emergency:update'),
  updateEmergencyStatus
);

// 添加响应行动记录
emergencyRouter.post('/:id/actions',
  checkPermission('emergency:update'),
  addResponseAction
);

// 上传现场照片
emergencyRouter.post('/:id/photos',
  checkPermission('emergency:update'),
  upload,
  async (req, res) => {
    try {
      const { Emergency } = require('../models/Emergency');
      const emergency = await Emergency.findById(req.params.id);

      if (!emergency) {
        return res.status(404).json({
          success: false,
          error: '应急事件不存在'
        });
      }

      if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          type: file.mimetype,
          size: file.size,
          description: '现场照片',
          uploadedBy: {
            userId: req.user.id,
            name: req.user.name
          }
        }));

        emergency.attachments.push(...newAttachments);
        await emergency.save();
      }

      res.json({
        success: true,
        message: '照片上传成功'
      });

    } catch (error) {
      logger.error('上传现场照片失败:', error);
      res.status(500).json({
        success: false,
        error: '上传现场照片失败'
      });
    }
  }
);

// 生成应急报告
emergencyRouter.get('/:id/report',
  checkPermission('emergency:read'),
  async (req, res) => {
    try {
      const { Emergency } = require('../models/Emergency');
      const emergency = await Emergency.findById(req.params.id)
        .populate('createdBy', 'name')
        .populate('assignedTeam.teamLeader', 'name')
        .lean();

      if (!emergency) {
        return res.status(404).json({
          success: false,
          error: '应急事件不存在'
        });
      }

      const report = {
        incidentNumber: emergency.incidentNumber,
        title: emergency.title,
        type: emergency.type,
        severity: emergency.severity,
        occurredAt: emergency.occurredAt,
        resolvedAt: emergency.resolvedAt,
        location: emergency.location,
        description: emergency.description,
        affectedPeople: emergency.affectedPeople,
        injuries: emergency.injuries,
        deaths: emergency.deaths,
        estimatedLoss: emergency.estimatedLoss,
        responseTime: emergency.evaluation?.responseTime,
        resolutionTime: emergency.evaluation?.resolutionTime,
        effectiveness: emergency.evaluation?.effectiveness,
        actions: emergency.responseActions,
        recommendations: emergency.evaluation?.recommendations,
        generatedAt: new Date(),
        generatedBy: req.user.name
      };

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('生成应急报告失败:', error);
      res.status(500).json({
        success: false,
        error: '生成应急报告失败'
      });
    }
  }
);

router.use('/emergencies', emergencyRouter);

// ============ 应急预案管理路由 ============

const planRouter = express.Router();

// 创建应急预案
planRouter.post('/',
  checkPermission('emergency:manage'),
  createEmergencyPlan
);

// 获取应急预案列表
planRouter.get('/',
  checkPermission('emergency:read'),
  async (req, res) => {
    try {
      const { EmergencyPlan } = require('../models/Emergency');
      const { villageId, type, status, page = 1, limit = 20 } = req.query;

      let queryVillageId = villageId;
      if (req.user.role !== 'admin') {
        queryVillageId = req.user.villageId;
      }

      const query = { villageId: queryVillageId };

      if (type) query.type = type;
      if (status) query.status = status;

      const plans = await EmergencyPlan.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('createdBy', 'name avatar')
        .populate('approvedBy', 'name position')
        .lean();

      const total = await EmergencyPlan.countDocuments(query);

      res.json({
        success: true,
        data: {
          plans,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('获取应急预案列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取应急预案列表失败'
      });
    }
  }
);

// 启动应急预案
planRouter.post('/:id/activate',
  checkPermission('emergency:manage'),
  activateEmergencyPlan
);

router.use('/plans', planRouter);

// ============ 应急资源管理路由 ============

const resourceRouter = express.Router();
resourceRouter.use(resourceRateLimit);

// 获取可用资源列表
resourceRouter.get('/available',
  checkPermission('emergency:read'),
  getAvailableResources
);

// 调度应急资源
resourceRouter.post('/dispatch',
  checkPermission('emergency:dispatch'),
  dispatchResources
);

// 释放资源
resourceRouter.post('/release',
  checkPermission('emergency:dispatch'),
  releaseResources
);

// 获取资源使用历史
resourceRouter.get('/:id/history',
  checkPermission('emergency:read'),
  async (req, res) => {
    try {
      const { EmergencyResource } = require('../models/Emergency');
      const resource = await EmergencyResource.findById(req.params.id)
        .populate('usageHistory.eventId', 'title')
        .populate('usageHistory.usedBy', 'name')
        .populate('maintenanceHistory.performedBy', 'name')
        .lean();

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: '资源不存在'
        });
      }

      res.json({
        success: true,
        data: {
          usageHistory: resource.usageHistory,
          maintenanceHistory: resource.maintenanceHistory
        }
      });

    } catch (error) {
      logger.error('获取资源使用历史失败:', error);
      res.status(500).json({
        success: false,
        error: '获取资源使用历史失败'
      });
    }
  }
);

// 更新资源状态
resourceRouter.put('/:id/status',
  checkPermission('emergency:manage'),
  async (req, res) => {
    try {
      const { EmergencyResource } = require('../models/Emergency');
      const { status, condition, location } = req.body;

      const resource = await EmergencyResource.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: '资源不存在'
        });
      }

      if (status) resource.status = status;
      if (condition) resource.condition = condition;
      if (location) resource.location = { ...resource.location, ...location };

      resource.lastUpdated = new Date();
      await resource.save();

      res.json({
        success: true,
        data: resource,
        message: '资源状态更新成功'
      });

    } catch (error) {
      logger.error('更新资源状态失败:', error);
      res.status(500).json({
        success: false,
        error: '更新资源状态失败'
      });
    }
  }
);

router.use('/resources', resourceRouter);

// ============ 监控统计路由 ============

// 获取应急事件统计
router.get('/statistics/overview',
  checkPermission('emergency:stats'),
  getEmergencyStats
);

// 获取实时监控数据
router.get('/monitoring/realtime',
  checkPermission('emergency:read'),
  getRealtimeMonitoring
);

// 获取应急趋势分析
router.get('/statistics/trends',
  checkPermission('emergency:stats'),
  async (req, res) => {
    try {
      const { Emergency } = require('../models/Emergency');
      const { villageId, days = 30 } = req.query;

      let queryVillageId = villageId;
      if (req.user.role !== 'admin') {
        queryVillageId = req.user.villageId;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const trends = await Emergency.aggregate([
        {
          $match: {
            villageId: new mongoose.Types.ObjectId(queryVillageId),
            reportedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$reportedAt'
              }
            },
            count: { $sum: 1 },
            bySeverity: {
              $push: '$severity'
            },
            byType: {
              $push: '$type'
            }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ]);

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      logger.error('获取应急趋势分析失败:', error);
      res.status(500).json({
        success: false,
        error: '获取应急趋势分析失败'
      });
    }
  }
);

// 获取热力图数据
router.get('/heatmap',
  checkPermission('emergency:read'),
  async (req, res) => {
    try {
      const { Emergency } = require('../models/Emergency');
      const { villageId, days = 30 } = req.query;

      let queryVillageId = villageId;
      if (req.user.role !== 'admin') {
        queryVillageId = req.user.villageId;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const hotspots = await Emergency.aggregate([
        {
          $match: {
            villageId: new mongoose.Types.ObjectId(queryVillageId),
            reportedAt: { $gte: startDate },
            coordinates: { $exists: true }
          }
        },
        {
          $group: {
            _id: '$coordinates',
            count: { $sum: 1 },
            severity: { $first: '$severity' },
            type: { $first: '$type' }
          }
        }
      ]);

      res.json({
        success: true,
        data: hotspots
      });

    } catch (error) {
      logger.error('获取热力图数据失败:', error);
      res.status(500).json({
        success: false,
        error: '获取热力图数据失败'
      });
    }
  }
);

module.exports = router;