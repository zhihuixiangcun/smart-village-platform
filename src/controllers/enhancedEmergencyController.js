/**
 * 增强应急响应控制器
 * 集成事件上报、资源调度、实时监控、应急预案等功能
 */

const { Emergency, EmergencyTypes, SeverityLevels, EmergencyStatus } = require('../models/Emergency');
// const EmergencyPlan = require('../models/EmergencyPlan'); // 临时禁用 - 语法错误待修复
// const EmergencyResource = require('../models/EmergencyResource'); // 临时禁用 - 语法错误待修复
const Village = require('../models/Village');
const Resident = require('../models/Resident');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { sendNotification } = require('../services/notificationService');
const { sendEmergencyBroadcast } = require('../services/emergencyBroadcastService');
const logger = require('../utils/logger');

// 配置文件上传
const upload = multer({
  storage: multer.diskStorage({
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
  }),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * 应急事件管理
 */

// 快速上报应急事件
async function quickReportEmergency(req, res) {
  try {
    const {
      type,
      severity,
      title,
      description,
      location,
      coordinates,
      reporterInfo,
      immediateNeeds
    } = req.body;

    // 生成事件编号
    const incidentNumber = await Emergency.generateIncidentNumber(
      req.user.villageId,
      type
    );

    const emergencyData = {
      incidentNumber,
      type,
      severity,
      title,
      description,
      location,
      coordinates,
      occurredAt: new Date(),
      villageId: req.user.villageId,
      createdBy: req.user.id,
      reporterInfo: {
        ...reporterInfo,
        isAnonymous: reporterInfo?.isAnonymous || false
      },
      immediateNeeds: immediateNeeds || []
    };

    const emergency = new Emergency(emergencyData);
    await emergency.save();

    // 处理附件上传
    if (req.files && req.files.length > 0) {
      emergency.attachments = req.files.map(file => ({
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
      await emergency.save();
    }

    // 自动触发相应预案
    await triggerEmergencyPlan(emergency);

    // 发送紧急通知
    await sendEmergencyNotification(emergency);

    // 如果是严重事件，立即广播
    if (['high', 'critical'].includes(severity)) {
      await sendEmergencyBroadcast(emergency);
    }

    logger.info(`应急事件上报成功: ${emergency._id}`);

    res.status(201).json({
      success: true,
      data: emergency,
      message: '应急事件上报成功'
    });

  } catch (error) {
    logger.error('上报应急事件失败:', error);
    res.status(500).json({
      success: false,
      error: '上报应急事件失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 更新应急事件状态
async function updateEmergencyStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, assignedTeam, responseActions, evaluation } = req.body;

    const emergency = await Emergency.findById(id);
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
        error: '没有权限操作此应急事件'
      });
    }

    // 更新状态
    if (status) emergency.status = status;
    if (assignedTeam) emergency.assignedTeam = assignedTeam;
    if (responseActions) emergency.responseActions.push(...responseActions);
    if (evaluation) emergency.evaluation = evaluation;

    // 状态变更时间记录
    if (status === 'resolved') {
      emergency.resolvedAt = new Date();
    }

    emergency.updatedBy = req.user.id;
    await emergency.save();

    // 发送状态更新通知
    await sendStatusUpdateNotification(emergency, status);

    logger.info(`应急事件状态更新成功: ${id} - ${status}`);

    res.json({
      success: true,
      data: emergency,
      message: '应急事件状态更新成功'
    });

  } catch (error) {
    logger.error('更新应急事件状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新应急事件状态失败'
    });
  }
}

// 添加响应行动记录
async function addResponseAction(req, res) {
  try {
    const { id } = req.params;
    const { action, description, resources, attachments } = req.body;

    const emergency = await Emergency.findById(id);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        error: '应急事件不存在'
      });
    }

    const actionRecord = {
      action,
      description,
      executedBy: {
        userId: req.user.id,
        name: req.user.name
      },
      executedAt: new Date(),
      resources: resources || [],
      attachments: attachments || []
    };

    emergency.responseActions.push(actionRecord);
    await emergency.save();

    logger.info(`响应行动记录添加成功: ${id}`);

    res.json({
      success: true,
      data: actionRecord,
      message: '响应行动记录添加成功'
    });

  } catch (error) {
    logger.error('添加响应行动记录失败:', error);
    res.status(500).json({
      success: false,
      error: '添加响应行动记录失败'
    });
  }
}

/**
 * 应急预案管理
 */

// 创建应急预案
async function createEmergencyPlan(req, res) {
  try {
    const {
      name,
      type,
      severity,
      description,
      triggerConditions,
      responseProcedures,
      resourceRequirements,
      contactList
    } = req.body;

    const planData = {
      name,
      type,
      severity,
      description,
      triggerConditions: triggerConditions || [],
      responseProcedures: responseProcedures || [],
      resourceRequirements: resourceRequirements || [],
      contactList: contactList || [],
      villageId: req.user.villageId,
      createdBy: req.user.id,
      status: 'draft'
    };

    const plan = new EmergencyPlan(planData);
    await plan.save();

    logger.info(`应急预案创建成功: ${plan._id}`);

    res.status(201).json({
      success: true,
      data: plan,
      message: '应急预案创建成功'
    });

  } catch (error) {
    logger.error('创建应急预案失败:', error);
    res.status(500).json({
      success: false,
      error: '创建应急预案失败'
    });
  }
}

// 启动应急预案
async function activateEmergencyPlan(req, res) {
  try {
    const { id } = req.params;
    const { emergencyId } = req.body;

    const plan = await EmergencyPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: '应急预案不存在'
      });
    }

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        error: '应急事件不存在'
      });
    }

    // 执行预案响应流程
    await executeEmergencyPlan(plan, emergency);

    // 更新预案状态
    plan.status = 'active';
    await plan.save();

    logger.info(`应急预案启动成功: ${id} - ${emergencyId}`);

    res.json({
      success: true,
      message: '应急预案启动成功'
    });

  } catch (error) {
    logger.error('启动应急预案失败:', error);
    res.status(500).json({
      success: false,
      error: '启动应急预案失败'
    });
  }
}

/**
 * 应急资源管理
 */

// 获取可用资源列表
async function getAvailableResources(req, res) {
  try {
    const {
      villageId,
      type,
      location,
      radius = 5000, // 默认5公里
      page = 1,
      limit = 50
    } = req.query;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    const query = {
      villageId: queryVillageId,
      status: 'available'
    };

    if (type) query.type = type;

    // 如果指定了位置，查找附近资源
    if (location && location.coordinates) {
      const [longitude, latitude] = location.coordinates.split(',').map(Number);
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius
        }
      };
    }

    const resources = await EmergencyResource.find(query)
      .sort({ 'location.coordinates': location ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('custodian', 'name phone')
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
    logger.error('获取可用资源列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取可用资源列表失败'
    });
  }
}

// 调度应急资源
async function dispatchResources(req, res) {
  try {
    const { emergencyId, resources, dispatchNotes } = req.body;

    const emergency = await Emergency.findById(emergencyId);
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
        error: '没有权限调度此应急事件的资源'
      });
    }

    const dispatchResults = [];

    for (const resourceRequest of resources) {
      const { resourceId, quantity } = resourceRequest;

      const resource = await EmergencyResource.findById(resourceId);
      if (!resource) {
        dispatchResults.push({
          resourceId,
          success: false,
          error: '资源不存在'
        });
        continue;
      }

      // 检查可用数量
      if (resource.availableQuantity < quantity) {
        dispatchResults.push({
          resourceId,
          success: false,
          error: '可用数量不足',
          available: resource.availableQuantity,
          requested: quantity
        });
        continue;
      }

      // 更新资源状态
      resource.availableQuantity -= quantity;
      resource.reservedQuantity += quantity;
      resource.usageHistory.push({
        eventId: emergencyId,
        usedBy: {
          userId: req.user.id,
          name: req.user.name
        },
        usedAt: new Date(),
        quantity,
        purpose: dispatchNotes || `应急事件: ${emergency.title}`
      });

      await resource.save();

      dispatchResults.push({
        resourceId,
        success: true,
        dispatchedQuantity: quantity,
        remainingQuantity: resource.availableQuantity
      });
    }

    logger.info(`应急资源调度完成: ${emergencyId}`, dispatchResults);

    res.json({
      success: true,
      data: dispatchResults,
      message: '应急资源调度完成'
    });

  } catch (error) {
    logger.error('调度应急资源失败:', error);
    res.status(500).json({
      success: false,
      error: '调度应急资源失败'
    });
  }
}

// 释放资源
async function releaseResources(req, res) {
  try {
    const { emergencyId, resources, releaseNotes, condition } = req.body;

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        error: '应急事件不存在'
      });
    }

    const releaseResults = [];

    for (const resourceRelease of resources) {
      const { resourceId, quantity } = resourceRelease;

      const resource = await EmergencyResource.findById(resourceId);
      if (!resource) {
        releaseResults.push({
          resourceId,
          success: false,
          error: '资源不存在'
        });
        continue;
      }

      // 更新资源状态
      resource.availableQuantity += quantity;
      resource.reservedQuantity = Math.max(0, resource.reservedQuantity - quantity);

      // 更新使用记录
      const usageRecord = resource.usageHistory.find(
        record => record.eventId.toString() === emergencyId.toString()
      );

      if (usageRecord) {
        usageRecord.returnedAt = new Date();
        usageRecord.condition = condition || 'good';
        usageRecord.notes = releaseNotes;
      }

      await resource.save();

      releaseResults.push({
        resourceId,
        success: true,
        releasedQuantity: quantity,
        currentAvailable: resource.availableQuantity
      });
    }

    logger.info(`应急资源释放完成: ${emergencyId}`, releaseResults);

    res.json({
      success: true,
      data: releaseResults,
      message: '应急资源释放完成'
    });

  } catch (error) {
    logger.error('释放应急资源失败:', error);
    res.status(500).json({
      success: false,
      error: '释放应急资源失败'
    });
  }
}

/**
 * 实时监控和统计
 */

// 获取应急事件统计
async function getEmergencyStats(req, res) {
  try {
    const { villageId, dateRange, type, severity } = req.query;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    const matchQuery = { villageId: new mongoose.Types.ObjectId(queryVillageId) };

    if (type) matchQuery.type = type;
    if (severity) matchQuery.severity = severity;

    if (dateRange) {
      matchQuery.occurredAt = {};
      if (dateRange.start) matchQuery.occurredAt.$gte = new Date(dateRange.start);
      if (dateRange.end) matchQuery.occurredAt.$lte = new Date(dateRange.end);
    }

    const stats = await Emergency.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byStatus: {
            $push: '$status'
          },
          byType: {
            $push: '$type'
          },
          bySeverity: {
            $push: '$severity'
          },
          totalAffected: { $sum: '$affectedPeople' },
          totalInjuries: { $sum: '$injuries' },
          totalDeaths: { $sum: '$deaths' },
          totalLoss: { $sum: '$estimatedLoss.total' },
          avgResponseTime: { $avg: '$evaluation.responseTime' }
        }
      },
      {
        $project: {
          _id: 0,
          total: '$total',
          statusDistribution: {
            $reduce: {
              input: '$byStatus',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [[
                      {
                        k: '$$this',
                        v: 1
                      }
                    ]]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        statusDistribution: {},
        totalAffected: 0,
        totalInjuries: 0,
        totalDeaths: 0,
        totalLoss: 0
      }
    });

  } catch (error) {
    logger.error('获取应急事件统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取应急事件统计失败'
    });
  }
}

// 获取实时应急监控数据
async function getRealtimeMonitoring(req, res) {
  try {
    const { villageId } = req.query;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    // 并行获取实时数据
    const [activeEmergencies, recentEmergencies, resourceStatus] = await Promise.all([
      // 进行中的应急事件
      Emergency.find({
        villageId: queryVillageId,
        status: { $in: ['pending', 'investigating', 'responding', 'monitoring'] }
      })
        .sort({ severity: -1, reportedAt: -1 })
        .limit(10)
        .populate('assignedTeam.teamLeader', 'name phone')
        .lean(),

      // 最近的应急事件（24小时内）
      Emergency.find({
        villageId: queryVillageId,
        reportedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
        .sort({ reportedAt: -1 })
        .limit(20)
        .lean(),

      // 资源状态概览
      EmergencyResource.aggregate([
        { $match: { villageId: new mongoose.Types.ObjectId(queryVillageId) } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$quantity' },
            available: { $sum: '$availableQuantity' },
            inUse: { $sum: '$reservedQuantity' }
          }
        }
      ])
    ]);

    const monitoringData = {
      activeEmergencies,
      recentEmergencies,
      resourceStatus: resourceStatus.reduce((acc, item) => {
        acc[item._id] = {
          type: item._id,
          total: item.total,
          available: item.available,
          inUse: item.inUse,
          availabilityRate: item.total > 0 ? ((item.available / item.total) * 100).toFixed(2) : 0
        };
        return acc;
      }, {}),
      summary: {
        activeCount: activeEmergencies.length,
        recentCount: recentEmergencies.length,
        highSeverityCount: activeEmergencies.filter(e => e.severity === 'high' || e.severity === 'critical').length
      }
    };

    res.json({
      success: true,
      data: monitoringData,
      message: '获取实时监控数据成功'
    });

  } catch (error) {
    logger.error('获取实时监控数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取实时监控数据失败'
    });
  }
}

// 辅助函数

async function triggerEmergencyPlan(emergency) {
  try {
    const plans = await EmergencyPlan.find({
      villageId: emergency.villageId,
      type: emergency.type,
      status: 'active'
    });

    for (const plan of plans) {
      // 检查触发条件
      const shouldTrigger = checkTriggerConditions(plan.triggerConditions, emergency);
      if (shouldTrigger) {
        await executeEmergencyPlan(plan, emergency);
        logger.info(`自动触发应急预案: ${plan._id} - ${emergency._id}`);
      }
    }
  } catch (error) {
    logger.error('触发应急预案失败:', error);
  }
}

function checkTriggerConditions(conditions, emergency) {
  // 简化的条件检查逻辑
  return conditions.some(condition => {
    switch (condition.condition) {
      case 'severity':
        return emergency.severity === condition.threshold;
      case 'affected_people':
        return emergency.affectedPeople >= condition.threshold;
      default:
        return false;
    }
  });
}

async function executeEmergencyPlan(plan, emergency) {
  try {
    // 执行响应流程
    for (const procedure of plan.responseProcedures) {
      // 记录行动计划
      emergency.responseActions.push({
        action: procedure.action,
        description: procedure.description,
        executedBy: {
          userId: 'system',
          name: '自动执行'
        },
        executedAt: new Date(),
        resources: procedure.resources || [],
        status: 'pending'
      });
    }

    await emergency.save();

    // 分配资源
    if (plan.resourceRequirements.length > 0) {
      await allocateResources(plan.resourceRequirements, emergency);
    }

  } catch (error) {
    logger.error('执行应急预案失败:', error);
  }
}

async function allocateResources(requirements, emergency) {
  try {
    for (const requirement of requirements) {
      const resources = await EmergencyResource.find({
        villageId: emergency.villageId,
        type: requirement.type,
        status: 'available',
        availableQuantity: { $gte: requirement.quantity }
      }).limit(requirement.quantity);

      for (const resource of resources) {
        const dispatchQuantity = Math.min(requirement.quantity, resource.availableQuantity);

        resource.availableQuantity -= dispatchQuantity;
        resource.reservedQuantity += dispatchQuantity;
        resource.usageHistory.push({
          eventId: emergency._id,
          usedBy: {
            userId: 'system',
            name: '自动分配'
          },
          usedAt: new Date(),
          quantity: dispatchQuantity,
          purpose: `自动分配 - ${emergency.title}`
        });

        await resource.save();
      }
    }
  } catch (error) {
    logger.error('分配资源失败:', error);
  }
}

async function sendEmergencyNotification(emergency) {
  try {
    await sendNotification({
      type: 'emergency',
      title: `紧急事件: ${emergency.title}`,
      content: `${emergency.description}\n地点: ${emergency.location}\n严重程度: ${emergency.severity}`,
      data: {
        emergencyId: emergency._id,
        type: emergency.type,
        severity: emergency.severity,
        location: emergency.location
      },
      targetAudience: emergency.severity === 'critical' ? 'all' : 'village_committee',
      villageId: emergency.villageId,
      priority: emergency.severity === 'critical' ? 'urgent' : 'high',
      channels: ['app', 'sms']
    });
  } catch (error) {
    logger.error('发送应急通知失败:', error);
  }
}

async function sendStatusUpdateNotification(emergency, status) {
  try {
    const statusTexts = {
      pending: '待处理',
      investigating: '调查中',
      responding: '响应中',
      monitoring: '监控中',
      resolved: '已解决',
      closed: '已关闭'
    };

    await sendNotification({
      type: 'emergency_update',
      title: `应急事件状态更新`,
      content: `${emergency.title} - 状态更新为: ${statusTexts[status]}`,
      data: {
        emergencyId: emergency._id,
        status,
        previousStatus: emergency.status
      },
      targetAudience: 'village_committee',
      villageId: emergency.villageId,
      channels: ['app']
    });
  } catch (error) {
    logger.error('发送状态更新通知失败:', error);
  }
}

module.exports = {
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
  upload: upload.array('photos', 10)
};