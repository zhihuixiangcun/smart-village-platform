/**
 * 应急响应系统API路由
 * 提供一键呼叫、定位救援等应急功能的RESTful接口
 */

const express = require('express');
const router = express.Router();
const {
  EmergencyEvent,
  EmergencyResource,
  EmergencyContact,
  EmergencyTypes,
  EmergencyLevels,
  ResponseStatus
} = require('../models/EmergencyResponse');
const EmergencyResponseService = require('../services/emergencyResponseService');
const { authenticate, authorize } = require('../middleware/auth');
const { validateEmergency, validateLocation } = require('../middleware/validation');
const upload = require('../middleware/upload');
const logger = require('../config/logger');

const emergencyService = new EmergencyResponseService();

/**
 * @route   POST /api/v1/emergency/one-click-call
 * @desc    一键应急呼叫
 * @access  Public (支持匿名呼叫)
 */
router.post('/one-click-call', validateEmergency, validateLocation, upload.array('media', 5), async (req, res) => {
  try {
    // 构建应急数据
    const emergencyData = {
      ...req.body,
      reporter: {
        userId: req.user ? req.user._id : null,
        name: req.body.reporterName,
        phone: req.body.reporterPhone,
        relationship: req.body.relationship
      },
      victim: req.body.victim ? {
        name: req.body.victimName,
        age: req.body.victimAge,
        gender: req.body.victimGender,
        medicalCondition: req.body.victimMedicalCondition
      } : undefined,
      type: req.body.type,
      description: req.body.description,
      urgency: req.body.urgency,
      casualties: req.body.casualties,
      vulnerableInvolved: req.body.vulnerableInvolved,
      villageId: req.body.villageId,
      media: req.files ? req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' :
          file.mimetype.startsWith('video/') ? 'video' : 'audio',
        url: `/uploads/emergency/${file.filename}`,
        name: file.originalname,
        size: file.size,
        uploadedAt: new Date()
      })) : []
    };

    // 构建位置数据
    const locationData = {
      coordinates: req.body.coordinates,
      address: req.body.address,
      accuracy: req.body.accuracy
    };

    // 启动应急响应
    const result = await emergencyService.oneClickEmergencyCall(
      emergencyData,
      locationData,
      {
        operatorId: req.user ? req.user._id : null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(201).json({
      success: true,
      message: '应急呼叫已受理',
      data: result
    });

  } catch (error) {
    logger.error('一键应急呼叫失败:', error);
    res.status(500).json({
      success: false,
      message: '应急呼叫失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/emergency/locate-resources
 * @desc    定位应急资源
 * @access  Private
 */
router.post('/locate-resources', authenticate, validateLocation, async (req, res) => {
  try {
    const { emergencyType, radius = 10 } = req.body;
    const locationData = req.body;

    const result = await emergencyService.locateEmergencyResources(
      locationData,
      emergencyType,
      {
        radius: parseInt(radius),
        operatorId: req.user._id
      }
    );

    res.json({
      success: true,
      message: '应急资源定位成功',
      data: result
    });

  } catch (error) {
    logger.error('定位应急资源失败:', error);
    res.status(500).json({
      success: false,
      message: '定位应急资源失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/emergency/events
 * @desc    获取应急事件列表
 * @access  Private
 */
router.get('/events', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      status,
      type,
      level,
      sortBy = 'created',
      search
    } = req.query;

    // 构建过滤条件
    const filters = {};

    if (villageId) {
      // 权限检查
      if (req.user.role !== 'super_admin' && req.user.village.villageId !== villageId) {
        return res.status(403).json({
          success: false,
          message: '无权访问该村庄的应急事件'
        });
      }
      filters.villageId = villageId;
    } else {
      // 默认只显示用户所在村庄的事件
      filters.villageId = req.user.village.villageId;
    }

    if (status) {
      filters.status = status;
    }

    if (type) {
      filters.type = type;
    }

    if (level) {
      filters.level = level;
    }

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'reporter.name': { $regex: search, $options: 'i' } }
      ];
    }

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy
    };

    const result = await emergencyService.getActiveEmergencies(filters, pagination);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取应急事件列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急事件列表失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/emergency/events/:id
 * @desc    获取应急事件详情
 * @access  Private
 */
router.get('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await EmergencyEvent.findById(id)
      .populate('reporter.userId', 'userName phone')
      .populate('responders.teamMembers.userId', 'userName phone')
      .populate('workflow.operator.userId', 'userName');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: '应急事件不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' && event.villageId !== req.user.village.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该应急事件'
      });
    }

    // 计算实时状态
    const eventData = event.toObject();
    eventData.responseTime = event.responseTime;
    eventData.resolutionTime = event.resolutionTime;
    eventData.overdue = event.overdue;
    eventData.activeResponders = event.responders.filter(r =>
      ['dispatched', 'en_route', 'arrived', 'active'].includes(r.status)
    ).length;

    res.json({
      success: true,
      data: {
        event: eventData
      }
    });

  } catch (error) {
    logger.error('获取应急事件详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急事件详情失败',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/emergency/events/:id/status
 * @desc    更新应急事件状态
 * @access  Private
 */
router.put('/events/:id/status', authenticate, authorize(['village_admin', 'department_head']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description, resolution } = req.body;

    const updateData = {
      operator: {
        userId: req.user._id,
        userName: req.user.profile.displayName,
        avatar: req.user.profile.avatar
      },
      description,
      resolution
    };

    const result = await emergencyService.updateEmergencyStatus(
      id,
      status,
      updateData,
      {
        operatorId: req.user._id
      }
    );

    res.json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    logger.error('更新应急事件状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新应急事件状态失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/emergency/events/:id/updates
 * @desc    添加应急事件更新
 * @access  Private
 */
router.post('/events/:id/updates', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, description, progress, notes } = req.body;

    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      url: `/uploads/emergency/${file.filename}`,
      type: file.mimetype.startsWith('image/') ? 'image' : 'document'
    })) : [];

    const updateData = {
      action,
      content: description,
      operator: {
        userId: req.user._id,
        userName: req.user.profile.displayName,
        avatar: req.user.profile.avatar
      },
      attachments,
      progress: progress ? parseInt(progress) : undefined,
      notes
    };

    const result = await emergencyService.addEmergencyUpdate(
      id,
      updateData,
      {
        operatorId: req.user._id
      }
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    logger.error('添加应急事件更新失败:', error);
    res.status(500).json({
      success: false,
      message: '添加应急事件更新失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/emergency/resources
 * @desc    获取应急资源列表
 * @access  Private
 */
router.get('/resources', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      type,
      status = 'available',
      search
    } = req.query;

    // 构建查询条件
    const query = { status };

    if (villageId) {
      // 权限检查
      if (req.user.role !== 'super_admin' && req.user.village.villageId !== villageId) {
        return res.status(403).json({
          success: false,
          message: '无权访问该村庄的应急资源'
        });
      }
      query.villageId = villageId;
    } else {
      // 默认只显示用户所在村庄的资源
      query.villageId = req.user.village.villageId;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // 分页
    const skip = (page - 1) * limit;

    const resources = await EmergencyResource.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('manager.userId', 'userName phone')
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
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('获取应急资源列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急资源列表失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/emergency/resources
 * @desc    创建应急资源
 * @access  Private (管理员权限)
 */
router.post('/resources', authenticate, authorize(['village_admin', 'department_head']), async (req, res) => {
  try {
    const resourceData = {
      ...req.body,
      villageId: req.user.village.villageId,
      manager: {
        userId: req.user._id,
        name: req.user.profile.displayName,
        phone: req.user.phone,
        department: req.user.professional.department
      }
    };

    const resource = new EmergencyResource(resourceData);
    await resource.save();

    logger.info(`应急资源创建成功: ${resource.name}`);

    res.status(201).json({
      success: true,
      message: '应急资源创建成功',
      data: {
        resource
      }
    });

  } catch (error) {
    logger.error('创建应急资源失败:', error);
    res.status(500).json({
      success: false,
      message: '创建应急资源失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/emergency/contacts
 * @desc    获取应急联系人列表
 * @access  Private
 */
router.get('/contacts', authenticate, async (req, res) => {
  try {
    const {
      villageId,
      service,
      status = 'active',
      search
    } = req.query;

    // 构建查询条件
    const query = { status };

    if (villageId) {
      // 权限检查
      if (req.user.role !== 'super_admin' && req.user.village.villageId !== villageId) {
        return res.status(403).json({
          success: false,
          message: '无权访问该村庄的应急联系人'
        });
      }
      query.villageId = villageId;
    } else {
      // 默认只显示用户所在村庄的联系人
      query.villageId = req.user.village.villageId;
    }

    if (service) {
      query['services.type'] = service;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    const contacts = await EmergencyContact.find(query)
      .sort({ 'services.priority': -1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        contacts
      }
    });

  } catch (error) {
    logger.error('获取应急联系人列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急联系人列表失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/emergency/contacts
 * @desc    创建应急联系人
 * @access  Private (管理员权限)
 */
router.post('/contacts', authenticate, authorize(['village_admin', 'department_head']), async (req, res) => {
  try {
    const contactData = {
      ...req.body,
      villageId: req.user.village.villageId
    };

    const contact = new EmergencyContact(contactData);
    await contact.save();

    logger.info(`应急联系人创建成功: ${contact.name}`);

    res.status(201).json({
      success: true,
      message: '应急联系人创建成功',
      data: {
        contact
      }
    });

  } catch (error) {
    logger.error('创建应急联系人失败:', error);
    res.status(500).json({
      success: false,
      message: '创建应急联系人失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/emergency/nearby-events
 * @desc    获取附近的应急事件
 * @access  Private
 */
router.get('/nearby-events', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: '缺少坐标参数'
      });
    }

    const events = await EmergencyEvent.getNearbyEvents(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(radius),
      {
        villageId: req.user.village.villageId,
        status: { $in: [ResponseStatus.PENDING, ResponseStatus.IN_PROGRESS, ResponseStatus.DISPATCHED] }
      }
    );

    res.json({
      success: true,
      data: {
        events,
        searchCenter: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(radius)
        }
      }
    });

  } catch (error) {
    logger.error('获取附近应急事件失败:', error);
    res.status(500).json({
      success: false,
      message: '获取附近应急事件失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/emergency/statistics
 * @desc    获取应急响应统计信息
 * @access  Private
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const { villageId, period = 'month' } = req.query;

    // 权限检查
    const targetVillageId = villageId || req.user.village.villageId;

    if (req.user.role !== 'super_admin' && req.user.village.villageId !== targetVillageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该村庄的统计信息'
      });
    }

    const statistics = await emergencyService.getEmergencyStatistics(
      targetVillageId,
      { period }
    );

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('获取应急统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急统计信息失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/emergency/instructions/:type
 * @desc    获取应急指导
 * @access  Public
 */
router.get('/instructions/:type', async (req, res) => {
  try {
    const { type } = req.params;

    const instructions = emergencyService.getEmergencyInstructions(type);
    const guidelines = emergencyService.getSafetyGuidelines(type);

    res.json({
      success: true,
      data: {
        type,
        instructions,
        safetyGuidelines: guidelines
      }
    });

  } catch (error) {
    logger.error('获取应急指导失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急指导失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/emergency/test-alarm
 * @desc    测试应急警报系统
 * @access  Private (管理员权限)
 */
router.post('/test-alarm', authenticate, authorize(['village_admin']), async (req, res) => {
  try {
    const { type, message, recipients } = req.body;

    // 这里可以集成实际的警报系统
    const alarmData = {
      type: type || 'test',
      message: message || '这是一条测试警报',
      recipients: recipients || ['all'],
      issuedAt: new Date(),
      issuedBy: req.user.profile.displayName
    };

    // 发送测试通知
    logger.info('应急警报测试:', alarmData);

    res.json({
      success: true,
      message: '应急警报测试成功',
      data: {
        alarm: alarmData
      }
    });

  } catch (error) {
    logger.error('应急警报测试失败:', error);
    res.status(500).json({
      success: false,
      message: '应急警报测试失败',
      error: error.message
    });
  }
});

module.exports = router;