const { Emergency, EmergencyTypes, SeverityLevels, EmergencyStatus } = require('../models/Emergency');
const EmergencyPlan = require('../models/EmergencyPlan');
const EmergencyResource = require('../models/EmergencyResource');
const Resident = require('../models/Resident');
const Village = require('../models/Village');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 180, checkperiod: 120 });

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
  limits: { fileSize: 50 * 1024 * 1024 },
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

const buildOperator = (req) => ({
  userId: req.user?.userId || req.headers['x-user-id'],
  username: req.user?.username || 'system',
  name: req.user?.name || '系统',
  role: req.user?.role || 'admin',
  villageId: req.user?.villageId,
  sessionId: req.headers['x-session-id'] || `session_${Date.now()}`
});

const validateSeverity = (severity) => {
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  return validSeverities.includes(severity);
};

const validateStatus = (status) => {
  const validStatuses = ['pending', 'investigating', 'responding', 'resolved', 'closed'];
  return validStatuses.includes(status);
};

const createEmergencyReport = async (req, res) => {
  const startTime = Date.now();
  try {
    const errors = validationResult(req);
    if (errors && errors.array && !errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors.array()
      });
    }

    const { type, severity, title, description, location, villageId, affectedPeople, injuries, deaths, estimatedLoss } = req.body;

    if (!type || !severity || !title || !description || !location || !villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    if (!validateSeverity(severity)) {
      return res.status(400).json({
        success: false,
        error: '严重程度参数无效'
      });
    }

    const operator = buildOperator(req);

    const incidentNumber = `EMG${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const emergency = new Emergency({
      incidentNumber,
      type,
      severity,
      title,
      description,
      location,
      villageId,
      affectedPeople: affectedPeople || 0,
      injuries: injuries || 0,
      deaths: deaths || 0,
      estimatedLoss: { total: estimatedLoss || 0, currency: 'CNY' },
      occurredAt: new Date(),
      reporterInfo: {
        name: operator.name,
        userId: operator.userId
      },
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
    cache.del(`emergency:stats:${villageId}`);
    cache.del(`emergencies:list:${villageId}:*`);

    if (severity === 'critical') {
      logger.info(`紧急事件广播: ${title}`, { emergencyId: emergency._id });
    }

    logger.info(`应急事件创建成功: ${emergency._id}`, { 
      userId: operator.userId, 
      severity,
      duration: Date.now() - startTime 
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
      error: '创建应急报告失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEmergencyEvents = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId, status, type, severity, page = 1, limit = 20 } = req.query;

    const operator = buildOperator(req);
    let queryVillageId = villageId;
    
    if (operator.role !== 'admin' && operator.role !== 'village_admin') {
      queryVillageId = operator.villageId;
    }

    if (!queryVillageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID'
      });
    }

    const query = { villageId: queryVillageId };
    if (status) {
      if (!validateStatus(status)) {
        return res.status(400).json({
          success: false,
          error: '状态参数无效'
        });
      }
      query.status = status;
    }
    if (type) query.type = type;
    if (severity) {
      if (!validateSeverity(severity)) {
        return res.status(400).json({
          success: false,
          error: '严重程度参数无效'
        });
      }
      query.severity = severity;
    }

    const cacheKey = `emergencies:list:${queryVillageId}:${status || 'all'}:${page}:${limit}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const [events, total] = await Promise.all([
      Emergency.find(query)
        .sort({ severity: -1, reportedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('reportedBy', 'name phone')
        .populate('villageId', 'name')
        .lean(),
      Emergency.countDocuments(query)
    ]);

    const result = {
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    cache.set(cacheKey, result, 60);

    logger.info(`获取应急事件列表成功`, { 
      userId: operator.userId,
      count: events.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取应急事件失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急事件失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateEmergencyStatus = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { status, responseTeam, resolvedAt } = req.body;

    const operator = buildOperator(req);

    const emergency = await Emergency.findById(id);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        error: '应急事件不存在'
      });
    }

    if (status && !validateStatus(status)) {
      return res.status(400).json({
        success: false,
        error: '状态参数无效'
      });
    }

    if (status) emergency.status = status;
    if (responseTeam) emergency.assignedTeam = responseTeam;
    if (resolvedAt) emergency.resolvedAt = resolvedAt;
    emergency.updatedBy = operator.userId;
    emergency.updatedAt = new Date();

    await emergency.save();
    cache.del(`emergency:stats:${emergency.villageId}`);
    cache.del(`emergencies:list:${emergency.villageId}:*`);

    logger.info(`应急状态更新成功: ${id}`, { 
      userId: operator.userId,
      status,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: emergency,
      message: '应急状态已更新'
    });

  } catch (error) {
    logger.error('更新应急状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新应急状态失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const createEmergencyPlan = async (req, res) => {
  const startTime = Date.now();
  try {
    const { name, type, description, villageId, procedures, resources, contactInfo } = req.body;

    if (!name || !type || !villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const operator = buildOperator(req);

    const plan = new EmergencyPlan({
      name,
      type,
      description,
      villageId,
      procedures,
      resources,
      contactInfo,
      createdBy: operator.userId,
      status: 'draft'
    });

    await plan.save();
    cache.del(`plans:list:${villageId}`);

    logger.info(`应急预案创建成功: ${plan._id}`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.status(201).json({
      success: true,
      data: plan,
      message: '应急预案已创建'
    });

  } catch (error) {
    logger.error('创建应急预案失败:', error);
    res.status(500).json({
      success: false,
      error: '创建应急预案失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEmergencyPlans = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId, type, status, page = 1, limit = 20 } = req.query;

    const operator = buildOperator(req);
    let queryVillageId = villageId;
    
    if (operator.role !== 'admin') {
      queryVillageId = operator.villageId;
    }

    if (!queryVillageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID'
      });
    }

    const query = { villageId: queryVillageId };
    if (type) query.type = type;
    if (status) query.status = status;

    const cacheKey = `plans:list:${queryVillageId}:${page}:${limit}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const [plans, total] = await Promise.all([
      EmergencyPlan.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('createdBy', 'name')
        .lean(),
      EmergencyPlan.countDocuments(query)
    ]);

    const result = {
      plans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    cache.set(cacheKey, result, 120);

    logger.info(`获取应急预案列表成功`, { 
      userId: operator.userId,
      count: plans.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取应急预案失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急预案失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const manageEmergencyResource = async (req, res) => {
  const startTime = Date.now();
  try {
    const { name, type, quantity, villageId, location, specifications } = req.body;

    if (!name || !type || !quantity || !villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const operator = buildOperator(req);

    const resource = new EmergencyResource({
      name,
      type,
      quantity,
      villageId,
      location,
      specifications,
      status: 'available',
      updatedBy: operator.userId
    });

    await resource.save();
    cache.del(`resources:list:${villageId}`);

    logger.info(`应急资源添加成功: ${resource._id}`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.status(201).json({
      success: true,
      data: resource,
      message: '应急资源已添加'
    });

  } catch (error) {
    logger.error('管理应急资源失败:', error);
    res.status(500).json({
      success: false,
      error: '管理应急资源失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEmergencyResources = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId, type, status, page = 1, limit = 20 } = req.query;

    const operator = buildOperator(req);
    let queryVillageId = villageId;
    
    if (operator.role !== 'admin') {
      queryVillageId = operator.villageId;
    }

    if (!queryVillageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID'
      });
    }

    const query = { villageId: queryVillageId };
    if (type) query.type = type;
    if (status) query.status = status;

    const cacheKey = `resources:list:${queryVillageId}:${page}:${limit}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const [resources, total] = await Promise.all([
      EmergencyResource.find(query)
        .sort({ lastUpdated: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      EmergencyResource.countDocuments(query)
    ]);

    const result = {
      resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    cache.set(cacheKey, result, 120);

    logger.info(`获取应急资源列表成功`, { 
      userId: operator.userId,
      count: resources.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取应急资源失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急资源失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const generateEmergencyReport = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId, startDate, endDate, type } = req.body;

    const operator = buildOperator(req);
    let queryVillageId = villageId;
    
    if (operator.role !== 'admin') {
      queryVillageId = operator.villageId;
    }

    const query = { villageId: queryVillageId };
    if (type) query.type = type;
    if (startDate || endDate) {
      query.reportedAt = {};
      if (startDate) query.reportedAt.$gte = new Date(startDate);
      if (endDate) query.reportedAt.$lte = new Date(endDate);
    }

    const emergencies = await Emergency.find(query).lean();

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
      stats.totalEstimatedLoss += e.estimatedLoss?.total || 0;
    });

    logger.info(`生成应急报告成功`, { 
      userId: operator.userId,
      count: emergencies.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: {
        stats,
        emergencies,
        generatedAt: new Date(),
        generatedBy: operator.name
      }
    });

  } catch (error) {
    logger.error('生成应急报告失败:', error);
    res.status(500).json({
      success: false,
      error: '生成应急报告失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEmergencyStats = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId } = req.query;

    const operator = buildOperator(req);
    let queryVillageId = villageId;
    
    if (operator.role !== 'admin') {
      queryVillageId = operator.villageId;
    }

    if (!queryVillageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID'
      });
    }

    const cacheKey = `emergency:stats:${queryVillageId}`;
    const cachedStats = cache.get(cacheKey);
    
    if (cachedStats) {
      return res.json({
        success: true,
        data: cachedStats,
        cached: true
      });
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

    const result = {
      overview: {
        totalEvents,
        pendingEvents,
        activeEvents,
        resolvedEvents,
        criticalEvents,
        resolutionRate: totalEvents > 0 ? ((resolvedEvents / totalEvents) * 100).toFixed(2) : 0
      },
      recentEvents
    };

    cache.set(cacheKey, result, 180);

    logger.info(`获取应急统计成功: ${queryVillageId}`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取应急统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急统计失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createEmergencyReport: [
    body('title').notEmpty().withMessage('标题不能为空'),
    body('description').notEmpty().withMessage('描述不能为空'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('严重程度无效'),
    createEmergencyReport
  ],
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
