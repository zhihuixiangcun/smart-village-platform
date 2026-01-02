/**
 * 应急管理控制器
 * 处理紧急事件上报、调度、资源管理等应急管理工作
 */

const Emergency = require('../models/Emergency');
const EmergencyPlan = require('../models/EmergencyPlan');
const EmergencyResource = require('../models/EmergencyResource');
const Resident = require('../models/Resident');
const Village = require('../models/Village');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { sendNotification } = require('../services/notificationService');
const { sendEmergencyBroadcast } = require('../services/emergencyBroadcastService');
const logger = require('../utils/logger');

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads/emergencies');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueName}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('只允许上传图片、视频、PDF和文档'));
  }
});

/**
 * 创建应急事件报告
 */
async function createEmergencyReport(req, res) {
  try {
    const { type, severity, title, description, location, villageId, affectedPeople, injuries, deaths, estimatedLoss } = req.body;

    if (!type || !severity || !title || !description || !location || !villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const emergency = new Emergency({
      type,
      severity,
      title,
      description,
      location,
      villageId,
      affectedPeople: affectedPeople || 0,
      injuries: injuries || 0,
      deaths: deaths || 0,
      estimatedLoss: estimatedLoss || 0,
      reportedBy: req.user.id,
      status: 'pending',
      attachments: req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size
      })) : []
    });

    await emergency.save();

    // 发送通知
    await sendEmergencyBroadcast({
      type: 'emergency_alert',
      title: `紧急事件: ${title}`,
      message: description,
      priority: severity,
      data: { emergencyId: emergency._id }
    });

    res.status(201).json({
      success: true,
      data: emergency,
      message: '应急事件报告已提交'
    });

  } catch (error) {
    logger.error('创建应急报告失败:', error);
    res.status(500).json({
      success: false,
      error: '创建应急报告失败'
    });
  }
}

/**
 * 获取应急事件列表
 */
async function getEmergencyEvents(req, res) {
  try {
    const { villageId, status, type, severity, page = 1, limit = 20 } = req.query;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin' && req.user.role !== 'village_admin') {
      queryVillageId = req.user.villageId;
    }

    const query = { villageId: queryVillageId };
    if (status) query.status = status;
    if (type) query.type = type;
    if (severity) query.severity = severity;

    const events = await Emergency.find(query)
      .sort({ severity: -1, reportedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('reportedBy', 'name phone')
      .populate('villageId', 'name')
      .lean();

    const total = await Emergency.countDocuments(query);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('获取应急事件失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急事件失败'
    });
  }
}

/**
 * 更新应急事件状态
 */
async function updateEmergencyStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, responseTeam, notes, resolvedAt } = req.body;

    const emergency = await Emergency.findById(id);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        error: '应急事件不存在'
      });
    }

    if (status) emergency.status = status;
    if (responseTeam) emergency.assignedTeam = responseTeam;
    if (notes) emergency.notes = notes;
    if (resolvedAt) emergency.resolvedAt = resolvedAt;
    emergency.updatedBy = req.user.id;
    emergency.updatedAt = new Date();

    await emergency.save();

    res.json({
      success: true,
      data: emergency,
      message: '应急状态已更新'
    });

  } catch (error) {
    logger.error('更新应急状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新应急状态失败'
    });
  }
}

/**
 * 创建应急预案
 */
async function createEmergencyPlan(req, res) {
  try {
    const { name, type, description, villageId, procedures, resources, contactInfo } = req.body;

    if (!name || !type || !villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const plan = new EmergencyPlan({
      name,
      type,
      description,
      villageId,
      procedures,
      resources,
      contactInfo,
      createdBy: req.user.id,
      status: 'draft'
    });

    await plan.save();

    res.status(201).json({
      success: true,
      data: plan,
      message: '应急预案已创建'
    });

  } catch (error) {
    logger.error('创建应急预案失败:', error);
    res.status(500).json({
      success: false,
      error: '创建应急预案失败'
    });
  }
}

/**
 * 获取应急预案列表
 */
async function getEmergencyPlans(req, res) {
  try {
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
      .populate('createdBy', 'name')
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
    logger.error('获取应急预案失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急预案失败'
    });
  }
}

/**
 * 管理应急资源
 */
async function manageEmergencyResource(req, res) {
  try {
    const { name, type, quantity, villageId, location, specifications } = req.body;

    if (!name || !type || !quantity || !villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const resource = new EmergencyResource({
      name,
      type,
      quantity,
      villageId,
      location,
      specifications,
      status: 'available',
      updatedBy: req.user.id
    });

    await resource.save();

    res.status(201).json({
      success: true,
      data: resource,
      message: '应急资源已添加'
    });

  } catch (error) {
    logger.error('管理应急资源失败:', error);
    res.status(500).json({
      success: false,
      error: '管理应急资源失败'
    });
  }
}

/**
 * 获取应急资源列表
 */
async function getEmergencyResources(req, res) {
  try {
    const { villageId, type, status, page = 1, limit = 20 } = req.query;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    const query = { villageId: queryVillageId };
    if (type) query.type = type;
    if (status) query.status = status;

    const resources = await EmergencyResource.find(query)
      .sort({ lastUpdated: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await EmergencyResource.countDocuments(query);

    res.json({
      success: true,
      data: {
        resources,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('获取应急资源失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急资源失败'
    });
  }
}

/**
 * 生成应急报告
 */
async function generateEmergencyReport(req, res) {
  try {
    const { villageId, startDate, endDate, type } = req.body;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    const query = { villageId: queryVillageId };
    if (type) query.type = type;
    if (startDate || endDate) {
      query.reportedAt = {};
      if (startDate) query.reportedAt.$gte = new Date(startDate);
      if (endDate) query.reportedAt.$lte = new Date(endDate);
    }

    const emergencies = await Emergency.find(query).lean();

    // 统计数据
    const stats = {
      total: emergencies.length,
      bySeverity: {},
      byType: {},
      byStatus: {},
      totalAffectedPeople: 0,
      totalInjuries: 0,
      totalDeaths: 0,
      totalEstimatedLoss: 0
    };

    emergencies.forEach(e => {
      stats.bySeverity[e.severity] = (stats.bySeverity[e.severity] || 0) + 1;
      stats.byType[e.type] = (stats.byType[e.type] || 0) + 1;
      stats.byStatus[e.status] = (stats.byStatus[e.status] || 0) + 1;
      stats.totalAffectedPeople += e.affectedPeople || 0;
      stats.totalInjuries += e.injuries || 0;
      stats.totalDeaths += e.deaths || 0;
      stats.totalEstimatedLoss += e.estimatedLoss || 0;
    });

    res.json({
      success: true,
      data: {
        stats,
        emergencies,
        generatedAt: new Date(),
        generatedBy: req.user.name
      }
    });

  } catch (error) {
    logger.error('生成应急报告失败:', error);
    res.status(500).json({
      success: false,
      error: '生成应急报告失败'
    });
  }
}

/**
 * 获取应急统计数据
 */
async function getEmergencyStats(req, res) {
  try {
    const { villageId } = req.query;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    const [
      totalEvents,
      pendingEvents,
      activeEvents,
      resolvedEvents,
      criticalEvents
    ] = await Promise.all([
      Emergency.countDocuments({ villageId: queryVillageId }),
      Emergency.countDocuments({ villageId: queryVillageId, status: 'pending' }),
      Emergency.countDocuments({ villageId: queryVillageId, status: { $in: ['investigating', 'responding'] } }),
      Emergency.countDocuments({ villageId: queryVillageId, status: 'resolved' }),
      Emergency.countDocuments({ villageId: queryVillageId, severity: 'critical', status: { $ne: 'resolved' } })
    ]);

    const recentEvents = await Emergency.find({ villageId: queryVillageId })
      .sort({ reportedAt: -1 })
      .limit(5)
      .select('title type severity status reportedAt')
      .lean();

    res.json({
      success: true,
      data: {
        overview: {
          totalEvents,
          pendingEvents,
          activeEvents,
          resolvedEvents,
          criticalEvents,
          resolutionRate: totalEvents > 0 ? ((resolvedEvents / totalEvents) * 100).toFixed(2) : 0
        },
        recentEvents
      }
    });

  } catch (error) {
    logger.error('获取应急统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急统计失败'
    });
  }
}

module.exports = {
  createEmergencyReport,
  updateEmergencyStatus,
  getEmergencyEvents,
  createEmergencyPlan,
  getEmergencyPlans,
  manageEmergencyResource,
  getEmergencyResources,
  generateEmergencyReport,
  getEmergencyStats,
  upload
};
