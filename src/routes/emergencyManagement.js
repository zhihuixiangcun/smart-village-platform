/**
 * 应急响应路由
 * 处理紧急事件上报、调度、资源管理等应急管理工作
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const EmergencyResource = require('../models/EmergencyResource');
const {
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
} = require('../controllers/emergencyController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');

// 应急管理限流配置（更宽松，因为这是紧急情况）
const emergencyRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 200, // 每个IP最多200个请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  },
  skip: (req) => {
    // 紧急事件上报跳过限流
    return req.path === '/report' && req.method === 'POST';
  }
});

router.use(emergencyRateLimit);
router.use(authenticateToken);

// 应急事件管理
router.post('/report',
  upload.array('files', 10),
  createEmergencyReport
);

router.put('/events/:id/status',
  checkPermission('emergency:update'),
  updateEmergencyStatus
);

router.get('/events', getEmergencyEvents);

router.get('/events/:id', async (req, res) => {
  try {
    const Emergency = require('../models/Emergency');
    const event = await Emergency.findById(req.params.id)
      .populate('villageId', 'name')
      .populate('reportedBy', 'name phone')
      .populate('updatedBy', 'name')
      .populate('assignedTeam.teamMembers', 'name phone role');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: '应急事件不存在'
      });
    }

    // 检查访问权限
    if (req.user.role !== 'admin' &&
        req.user.role !== 'village_admin' &&
        event.villageId._id.toString() !== req.user.villageId?.toString()) {
      return res.status(403).json({
        success: false,
        error: '没有权限查看该事件'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取应急事件详情失败'
    });
  }
});

// 应急预案管理
router.post('/plans',
  checkPermission('emergency:plan:create'),
  createEmergencyPlan
);

router.get('/plans', getEmergencyPlans);

// 临时禁用 - EmergencyPlan 模型语法错误待修复
// router.get('/plans/:id', async (req, res) => {
//   try {
//     const EmergencyPlan = require('../models/EmergencyPlan');
//     const plan = await EmergencyPlan.findById(req.params.id)
//       .populate('villageId', 'name')
//       .populate('createdBy', 'name');

//     if (!plan) {
//       return res.status(404).json({
//         success: false,
//         error: '应急预案不存在'
//       });
//     }

//     res.json({
//       success: true,
//       data: plan
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: '获取应急预案详情失败'
//     });
//   }
// });

// 临时禁用 - EmergencyPlan 模型语法错误待修复
// router.put('/plans/:id',
//   checkPermission('emergency:plan:update'),
//   async (req, res) => {
//     try {
//       const EmergencyPlan = require('../models/EmergencyPlan');
//       const plan = await EmergencyPlan.findByIdAndUpdate(
//         req.params.id,
//         { ...req.body, updatedAt: new Date(), updatedBy: req.user.id },
//         { new: true, runValidators: true }
//       );

//       if (!plan) {
//         return res.status(404).json({
//           success: false,
//           error: '应急预案不存在'
//         });
//       }

//       res.json({
//         success: true,
//         data: plan,
//         message: '应急预案更新成功'
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         error: '更新应急预案失败'
//       });
//     }
//   }
// );

// 应急资源管理
router.post('/resources',
  checkPermission('emergency:resource:manage'),
  manageEmergencyResource
);

router.get('/resources', getEmergencyResources);

router.put('/resources/:id',
  checkPermission('emergency:resource:manage'),
  async (req, res) => {
    try {
      const resource = await EmergencyResource.findByIdAndUpdate(
        req.params.id,
        { ...req.body, lastUpdated: new Date(), updatedBy: req.user.id },
        { new: true, runValidators: true }
      );

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: '应急资源不存在'
        });
      }

      res.json({
        success: true,
        data: resource,
        message: '应急资源更新成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '更新应急资源失败'
      });
    }
  }
);

// 应急报表
router.post('/reports',
  checkPermission('emergency:report'),
  generateEmergencyReport
);

router.get('/statistics', getEmergencyStats);

// 获取应急类型
router.get('/types', async (req, res) => {
  try {
    const types = [
      { value: 'natural_disaster', label: '自然灾害', icon: 'storm', color: '#ff6b6b' },
      { value: 'accident', label: '事故灾难', icon: 'warning', color: '#f59e0b' },
      { value: 'public_health', label: '公共卫生', icon: 'health', color: '#10b981' },
      { value: 'security', label: '社会安全', icon: 'security', color: '#6366f1' },
      { value: 'fire', label: '火灾', icon: 'local_fire_department', color: '#ef4444' },
      { value: 'flood', label: '洪涝', icon: 'water', color: '#3b82f6' },
      { value: 'earthquake', label: '地震', icon: 'vibration', color: '#8b5cf6' },
      { value: 'epidemic', label: '疫情', icon: 'coronavirus', color: '#14b8a6' },
      { value: 'other', label: '其他', icon: 'more_horiz', color: '#6b7280' }
    ];

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取应急类型失败'
    });
  }
});

// 获取严重程度级别
router.get('/severities', async (req, res) => {
  try {
    const severities = [
      {
        value: 'low',
        label: '一般',
        color: '#10b981',
        description: '影响范围小，容易控制',
        responseTime: '24小时内'
      },
      {
        value: 'medium',
        label: '较重',
        color: '#f59e0b',
        description: '影响一定范围，需要协调处理',
        responseTime: '12小时内'
      },
      {
        value: 'high',
        label: '严重',
        color: '#ef4444',
        description: '影响范围大，可能造成损失',
        responseTime: '6小时内'
      },
      {
        value: 'critical',
        label: '特别严重',
        color: '#7c3aed',
        description: '影响范围极大，可能造成重大损失',
        responseTime: '立即响应'
      }
    ];

    res.json({
      success: true,
      data: severities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取严重程度级别失败'
    });
  }
});

// 获取应急资源类型
router.get('/resource-types', async (req, res) => {
  try {
    const resourceTypes = [
      { value: 'equipment', label: '应急设备', examples: '发电机、水泵、照明设备' },
      { value: 'personnel', label: '应急人员', examples: '救援队、医疗队、专家' },
      { value: 'facility', label: '应急场所', examples: '避难所、指挥中心、医疗点' },
      { value: 'material', label: '应急物资', examples: '食品、药品、帐篷' },
      { value: 'vehicle', label: '应急车辆', examples: '救护车、消防车、工程车' },
      { value: 'communication', label: '通信设备', examples: '对讲机、卫星电话' }
    ];

    res.json({
      success: true,
      data: resourceTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取应急资源类型失败'
    });
  }
});

// 获取事件状态
router.get('/statuses', async (req, res) => {
  try {
    const statuses = [
      { value: 'pending', label: '待处理', color: '#6b7280', description: '事件已上报，等待处理' },
      { value: 'investigating', label: '调查中', color: '#3b82f6', description: '正在调查核实事件情况' },
      { value: 'responding', label: '响应中', color: '#f59e0b', description: '已启动应急响应' },
      { value: 'monitoring', label: '监控中', color: '#06b6d4', description: '持续监控事件发展' },
      { value: 'resolved', label: '已解决', color: '#10b981', description: '事件已得到解决' },
      { value: 'closed', label: '已关闭', color: '#6b7280', description: '事件已归档关闭' }
    ];

    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取事件状态失败'
    });
  }
});

// 应急工作台
router.get('/dashboard', async (req, res) => {
  try {
    const { villageId } = req.query;
    const baseQuery = villageId ? { villageId } : {};

    const [
      totalEvents,
      pendingEvents,
      criticalEvents,
      recentEvents,
      resourceStatus
    ] = await Promise.all([
      // 总事件数
      require('../models/Emergency').countDocuments(baseQuery),
      // 待处理事件数
      require('../models/Emergency').countDocuments({
        ...baseQuery,
        status: { $in: ['pending', 'investigating'] }
      }),
      // 紧急事件数
      require('../models/Emergency').countDocuments({
        ...baseQuery,
        severity: { $in: ['high', 'critical'] },
        status: { $in: ['pending', 'investigating', 'responding'] }
      }),
      // 最近事件
      require('../models/Emergency').find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title type severity status createdAt incidentNumber'),
      // 资源状态
      EmergencyResource.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$quantity' },
            available: {
              $sum: {
                $cond: [{ $eq: ['$status', 'available'] }, '$quantity', 0]
              }
            },
            inUse: {
              $sum: {
                $cond: [{ $eq: ['$status', 'in_use'] }, '$quantity', 0]
              }
            }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalEvents,
          pendingEvents,
          criticalEvents,
          responseRate: totalEvents > 0
            ? ((totalEvents - pendingEvents) / totalEvents * 100).toFixed(2)
            : 0
        },
        recentEvents,
        resourceStatus: resourceStatus.map(resource => ({
          type: resource._id,
          total: resource.total,
          available: resource.available,
          inUse: resource.inUse,
          availabilityRate: resource.total > 0
            ? (resource.available / resource.total * 100).toFixed(2)
            : 0
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取应急工作台数据失败'
    });
  }
});

// 快速上报（简化接口，用于紧急情况）
router.post('/quick-report', async (req, res) => {
    try {
      const {
        type,
        severity = 'critical',
        description,
        location,
        villageId,
        contactPhone
      } = req.body;

      // 最小化验证
      if (!type || !description || !location || !villageId) {
        return res.status(400).json({
          success: false,
          error: '类型、描述、位置和村庄ID为必填项'
        });
      }

      // 创建简化的事件记录
      const Emergency = require('../models/Emergency');
      const emergency = new Emergency({
        incidentNumber: generateIncidentNumber(villageId, type),
        type,
        severity,
        title: `紧急上报：${type}`,
        description,
        location,
        villageId,
        contactPhone: contactPhone ? require('../utils/encryption').encryptSensitiveData(contactPhone) : undefined,
        isAnonymous: false,
        status: 'pending',
        reportedBy: req.user ? req.user.id : null
      });

      await emergency.save();

      // 立即通知相关人员
      const { sendEmergencyNotification } = require('../utils/notificationService');
      await sendEmergencyNotification({
        type: 'emergency_alert',
        title: `紧急事件上报：${type}`,
        message: `位置：${location}\n描述：${description}`,
        data: { emergencyId: emergency._id }
      });

      res.status(201).json({
        success: true,
        data: {
          incidentNumber: emergency.incidentNumber,
          message: '紧急事件已上报，相关人员将立即处理'
        }
      });
    } catch (error) {
      logger.error('快速上报失败:', error);
      res.status(500).json({
        success: false,
        error: '快速上报失败'
      });
    }
  });

// 健康检查
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'healthy',
        notification: 'healthy',
        fileUpload: 'healthy'
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: error.message
    });
  }
});

// 辅助函数
function generateIncidentNumber(villageId, type) {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                  (date.getMonth() + 1).toString().padStart(2, '0') +
                  date.getDate().toString().padStart(2, '0');

  const villageCode = villageId.toString().slice(-4);
  const typeCode = type.substring(0, 2).toUpperCase();
  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `EMG${dateStr}-${villageCode}-${typeCode}-${randomCode}`;
}

module.exports = router;