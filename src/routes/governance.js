/**
 * 村务治理路由
 * 处理公告、会议、任务、反馈等村务管理API
 */

const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getAnnouncements,
  createMeeting,
  getMeetings,
  createTask,
  getTasks,
  updateTaskStatus,
  createFeedback,
  handleFeedback,
  getGovernanceStats,
  upload
} = require('../controllers/villageGovernanceController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');

// 权限检查辅助函数
function checkPermission(permissionStr) {
  const [resource, action] = permissionStr.split(':');
  return requirePermission(resource, action, 'own');
}

// 限流配置
const governanceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 每个IP最多50个请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  }
});

router.use(governanceRateLimit);
router.use(authenticateToken);

// 公告管理
router.post('/announcements',
  checkPermission('announcement:create'),
  upload,
  createAnnouncement
);

router.get('/announcements', getAnnouncements);

router.get('/announcements/:id', async (req, res) => {
  try {
    const Announcement = require('../models/Announcement');
    const announcement = await Announcement.findById(req.params.id)
      .populate('villageId', 'name')
      .populate('createdBy', 'name');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取公告详情失败'
    });
  }
});

// 会议管理
router.post('/meetings',
  checkPermission('meeting:create'),
  createMeeting
);

router.get('/meetings', getMeetings);

router.get('/meetings/:id', async (req, res) => {
  try {
    const Meeting = require('../models/Meeting');
    const meeting = await Meeting.findById(req.params.id)
      .populate('villageId', 'name')
      .populate('participants.residentId', 'name phone')
      .populate('createdBy', 'name');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: '会议不存在'
      });
    }

    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取会议详情失败'
    });
  }
});

router.put('/meetings/:id',
  checkPermission('meeting:update'),
  async (req, res) => {
    try {
      const Meeting = require('../models/Meeting');
      const meeting = await Meeting.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: '会议不存在'
        });
      }

      res.json({
        success: true,
        data: meeting,
        message: '会议更新成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '更新会议失败'
      });
    }
  }
);

// 任务管理
router.post('/tasks',
  checkPermission('task:create'),
  createTask
);

router.get('/tasks', getTasks);

router.get('/tasks/:id', async (req, res) => {
  try {
    const Task = require('../models/Task');
    const task = await Task.findById(req.params.id)
      .populate('villageId', 'name')
      .populate('assignedTo.residentId', 'name phone')
      .populate('createdBy', 'name');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取任务详情失败'
    });
  }
});

router.put('/tasks/:id',
  checkPermission('task:update'),
  updateTaskStatus
);

router.get('/tasks/schedule',
  checkPermission('task:list'),
  async (req, res) => {
    try {
      const TaskSchedule = require('../models/TaskSchedule');
      const { date } = req.query;

      const query = {};
      if (date) {
        query.scheduledDate = {
          $gte: new Date(date),
          $lt: new Date(`${date  }T23:59:59`)
        };
      }

      const schedules = await TaskSchedule.find(query)
        .populate('taskId', 'title priority')
        .populate('assignedTo.residentId', 'name')
        .sort({ scheduledTime: 1 });

      res.json({
        success: true,
        data: schedules
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '获取任务调度失败'
      });
    }
  }
);

// 反馈管理
router.post('/feedback',
  createFeedback
);

router.get('/feedback', async (req, res) => {
  try {
    const Feedback = require('../models/Feedback');
    const {
      page = 1,
      limit = 20,
      villageId,
      type,
      category,
      status,
      keyword
    } = req.query;

    const query = {};

    if (villageId) query.villageId = villageId;
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;
    if (keyword) {
      query.$or = [
        { content: { $regex: keyword, $options: 'i' } }
      ];
    }

    const [feedbacks, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('villageId', 'name')
        .populate('residentId', 'name')
        .populate('respondedBy', 'name')
        .lean(),
      Feedback.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取反馈列表失败'
    });
  }
});

router.put('/feedback/:id/handle',
  checkPermission('feedback:handle'),
  handleFeedback
);

// 统计信息
router.get('/stats', getGovernanceStats);

// 获取公告分类
router.get('/announcements/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'notice', label: '通知公告' },
      { value: 'policy', label: '政策宣传' },
      { value: 'activity', label: '活动通知' },
      { value: 'meeting', label: '会议通知' },
      { value: 'emergency', label: '紧急通知' },
      { value: 'other', label: '其他' }
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取分类失败'
    });
  }
});

// 获取任务类型
router.get('/tasks/types', async (req, res) => {
  try {
    const types = [
      { value: 'patrol', label: '巡查任务' },
      { value: 'maintenance', label: '维护任务' },
      { value: 'safety', label: '安全检查' },
      { value: 'environment', label: '环境卫生' },
      { value: 'service', label: '便民服务' },
      { value: 'emergency', label: '应急处理' },
      { value: 'other', label: '其他' }
    ];

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取任务类型失败'
    });
  }
});

// 获取反馈类型
router.get('/feedback/types', async (req, res) => {
  try {
    const types = [
      { value: 'complaint', label: '投诉建议' },
      { value: 'report', label: '问题上报' },
      { value: 'consult', label: '咨询求助' },
      { value: 'praise', label: '表扬感谢' },
      { value: 'other', label: '其他' }
    ];

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取反馈类型失败'
    });
  }
});

// 获取会议类型
router.get('/meetings/types', async (req, res) => {
  try {
    const types = [
      { value: 'regular', label: '常规会议' },
      { value: 'emergency', label: '紧急会议' },
      { value: 'public', label: '村民大会' },
      { value: 'committee', label: '村委会议' },
      { value: 'other', label: '其他' }
    ];

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取会议类型失败'
    });
  }
});

// 工作台数据
router.get('/dashboard', async (req, res) => {
  try {
    const { villageId } = req.query;
    const baseQuery = villageId ? { villageId } : {};

    const [stats, recentActivities, urgentTasks] = await Promise.all([
      // 基础统计
      Promise.all([
        require('../models/Announcement').countDocuments({
          ...baseQuery,
          status: 'published'
        }),
        require('../models/Meeting').countDocuments({
          ...baseQuery,
          startTime: { $gte: new Date() }
        }),
        require('../models/Task').countDocuments({
          ...baseQuery,
          status: 'pending'
        }),
        require('../models/Feedback').countDocuments({
          ...baseQuery,
          status: 'pending'
        })
      ]),
      // 最近活动
      require('../models/Announcement').find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title createdAt'),
      // 紧急任务
      require('../models/Task').find({
        ...baseQuery,
        priority: 'urgent',
        status: { $in: ['pending', 'in-progress'] }
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .select('title dueDate priority')
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          announcements: stats[0],
          meetings: stats[1],
          pendingTasks: stats[2],
          pendingFeedbacks: stats[3]
        },
        recentActivities,
        urgentTasks
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取工作台数据失败'
    });
  }
});

module.exports = router;