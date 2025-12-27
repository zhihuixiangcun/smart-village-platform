/**
 * 增强村务治理路由
 * 整合公告管理、会议管理、任务调度等功能
 */

const express = require('express');
const router = express.Router();
const {
  // 公告管理
  createAnnouncement,
  getAnnouncements,
  publishAnnouncement,

  // 会议管理
  createMeeting,
  getMeetings,
  checkInMeeting,

  // 任务调度
  createTask,
  getTasks,
  updateTaskStatus,

  // 统计功能
  getGovernanceStats,

  // 文件上传
  upload
} = require('../controllers/governanceController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');

// 通用限流
const governanceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100,
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  }
});

// 应用认证中间件
router.use(authenticateToken);
router.use(governanceRateLimit);

// ============ 公告管理路由 ============

const announcementRouter = express.Router();

// 创建公告
announcementRouter.post('/',
  checkPermission('announcement:create'),
  upload,
  createAnnouncement
);

// 获取公告列表
announcementRouter.get('/',
  checkPermission('announcement:read'),
  getAnnouncements
);

// 发布公告
announcementRouter.put('/:id/publish',
  checkPermission('announcement:publish'),
  publishAnnouncement
);

// 删除公告
announcementRouter.delete('/:id',
  checkPermission('announcement:delete'),
  async (req, res) => {
    try {
      const Announcement = require('../models/Announcement');
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: '公告不存在'
        });
      }

      // 权限检查
      if (req.user.role !== 'admin' &&
          announcement.villageId.toString() !== req.user.villageId) {
        return res.status(403).json({
          success: false,
          error: '没有权限删除此公告'
        });
      }

      await announcement.remove();

      res.json({
        success: true,
        message: '公告删除成功'
      });

    } catch (error) {
      logger.error('删除公告失败:', error);
      res.status(500).json({
        success: false,
        error: '删除公告失败'
      });
    }
  }
);

// 获取紧急公告
announcementRouter.get('/urgent/list',
  checkPermission('announcement:read'),
  async (req, res) => {
    try {
      const Announcement = require('../models/Announcement');
      let villageId = req.query.villageId;

      if (req.user.role !== 'admin') {
        villageId = req.user.villageId;
      }

      const announcements = await Announcement.findUrgentAnnouncements(villageId);

      res.json({
        success: true,
        data: announcements
      });

    } catch (error) {
      logger.error('获取紧急公告失败:', error);
      res.status(500).json({
        success: false,
        error: '获取紧急公告失败'
      });
    }
  }
);

// 公告统计
announcementRouter.get('/statistics/overview',
  checkPermission('announcement:stats'),
  async (req, res) => {
    try {
      const Announcement = require('../models/Announcement');
      let villageId = req.query.villageId;

      if (req.user.role !== 'admin') {
        villageId = req.user.villageId;
      }

      const stats = await Announcement.getAnnouncementStats(villageId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('获取公告统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取公告统计失败'
      });
    }
  }
);

router.use('/announcements', announcementRouter);

// ============ 会议管理路由 ============

const meetingRouter = express.Router();

// 创建会议
meetingRouter.post('/',
  checkPermission('meeting:create'),
  upload,
  createMeeting
);

// 获取会议列表
meetingRouter.get('/',
  checkPermission('meeting:read'),
  getMeetings
);

// 会议签到
meetingRouter.post('/:id/checkin',
  checkPermission('meeting:attend'),
  checkInMeeting
);

// 会议签出
meetingRouter.post('/:id/checkout',
  checkPermission('meeting:attend'),
  async (req, res) => {
    try {
      const Meeting = require('../models/Meeting');
      const meeting = await Meeting.findById(req.params.id);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: '会议不存在'
        });
      }

      await meeting.checkOut(req.user.id);

      res.json({
        success: true,
        message: '签出成功'
      });

    } catch (error) {
      logger.error('会议签出失败:', error);
      res.status(500).json({
        success: false,
        error: '会议签出失败'
      });
    }
  }
);

// 获取即将开始的会议
meetingRouter.get('/upcoming/list',
  checkPermission('meeting:read'),
  async (req, res) => {
    try {
      const Meeting = require('../models/Meeting');
      let villageId = req.query.villageId;
      const days = parseInt(req.query.days) || 7;

      if (req.user.role !== 'admin') {
        villageId = req.user.villageId;
      }

      const meetings = await Meeting.findUpcomingMeetings(villageId, days);

      res.json({
        success: true,
        data: meetings
      });

    } catch (error) {
      logger.error('获取即将开始会议失败:', error);
      res.status(500).json({
        success: false,
        error: '获取即将开始会议失败'
      });
    }
  }
);

// 获取我的会议
meetingRouter.get('/my/list',
  checkPermission('meeting:read'),
  async (req, res) => {
    try {
      const Meeting = require('../models/Meeting');
      const { status, dateRange, page = 1, limit = 20 } = req.query;

      const meetings = await Meeting.findUserMeetings(req.user.id, {
        status,
        dateRange,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: meetings
      });

    } catch (error) {
      logger.error('获取我的会议失败:', error);
      res.status(500).json({
        success: false,
        error: '获取我的会议失败'
      });
    }
  }
);

// 会议统计
meetingRouter.get('/statistics/overview',
  checkPermission('meeting:stats'),
  async (req, res) => {
    try {
      const Meeting = require('../models/Meeting');
      let villageId = req.query.villageId;
      const { dateRange } = req.query;

      if (req.user.role !== 'admin') {
        villageId = req.user.villageId;
      }

      const stats = await Meeting.getMeetingStats(villageId, dateRange);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('获取会议统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取会议统计失败'
      });
    }
  }
);

router.use('/meetings', meetingRouter);

// ============ 任务调度路由 ============

const taskRouter = express.Router();

// 创建任务
taskRouter.post('/',
  checkPermission('task:create'),
  upload,
  createTask
);

// 获取任务列表
taskRouter.get('/',
  checkPermission('task:read'),
  getTasks
);

// 更新任务状态
taskRouter.put('/:id/status',
  checkPermission('task:update'),
  updateTaskStatus
);

// 获取我的任务
taskRouter.get('/my/list',
  checkPermission('task:read'),
  async (req, res) => {
    try {
      const { Task } = require('../models/Task');
      const { status, page = 1, limit = 20 } = req.query;

      const query = {
        'assignedTo.residentId': req.user.residentId
      };

      if (status) query.status = status;

      const tasks = await Task.find(query)
        .sort({ priority: -1, dueDate: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('supervisor.userId', 'name avatar')
        .lean();

      const total = await Task.countDocuments(query);

      res.json({
        success: true,
        data: {
          tasks,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('获取我的任务失败:', error);
      res.status(500).json({
        success: false,
        error: '获取我的任务失败'
      });
    }
  }
);

// 接受任务
taskRouter.post('/:id/accept',
  checkPermission('task:execute'),
  async (req, res) => {
    try {
      const { Task } = require('../models/Task');
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在'
        });
      }

      // 更新接受状态
      const assignee = task.assignedTo.find(
        a => a.residentId.toString() === req.user.residentId
      );

      if (assignee) {
        assignee.status = 'accepted';
        await task.save();

        res.json({
          success: true,
          message: '任务接受成功'
        });
      } else {
        res.status(400).json({
          success: false,
          error: '您不是此任务的执行人'
        });
      }

    } catch (error) {
      logger.error('接受任务失败:', error);
      res.status(500).json({
        success: false,
        error: '接受任务失败'
      });
    }
  }
);

// 拒绝任务
taskRouter.post('/:id/reject',
  checkPermission('task:execute'),
  async (req, res) => {
    try {
      const { Task } = require('../models/Task');
      const { reason } = req.body;
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在'
        });
      }

      const assignee = task.assignedTo.find(
        a => a.residentId.toString() === req.user.residentId
      );

      if (assignee) {
        assignee.status = 'rejected';
        assignee.rejectedReason = reason;
        await task.save();

        res.json({
          success: true,
          message: '任务拒绝成功'
        });
      } else {
        res.status(400).json({
          success: false,
          error: '您不是此任务的执行人'
        });
      }

    } catch (error) {
      logger.error('拒绝任务失败:', error);
      res.status(500).json({
        success: false,
        error: '拒绝任务失败'
      });
    }
  }
);

// 添加任务执行记录
taskRouter.post('/:id/log',
  checkPermission('task:execute'),
  async (req, res) => {
    try {
      const { Task } = require('../models/Task');
      const { action, description, location, attachments } = req.body;
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在'
        });
      }

      const logEntry = {
        action,
        description,
        performedBy: {
          userId: req.user.id,
          name: req.user.name
        },
        performedAt: new Date()
      };

      if (location) logEntry.location = location;
      if (attachments) logEntry.attachments = attachments;

      task.executionLog.push(logEntry);
      await task.save();

      res.json({
        success: true,
        message: '执行记录添加成功'
      });

    } catch (error) {
      logger.error('添加任务执行记录失败:', error);
      res.status(500).json({
        success: false,
        error: '添加任务执行记录失败'
      });
    }
  }
);

// 任务统计
taskRouter.get('/statistics/overview',
  checkPermission('task:stats'),
  async (req, res) => {
    try {
      const { Task } = require('../models/Task');
      let villageId = req.query.villageId;
      const { dateRange } = req.query;

      if (req.user.role !== 'admin') {
        villageId = req.user.villageId;
      }

      const matchQuery = { villageId: new mongoose.Types.ObjectId(villageId) };

      if (dateRange) {
        matchQuery.createdAt = {};
        if (dateRange.start) matchQuery.createdAt.$gte = new Date(dateRange.start);
        if (dateRange.end) matchQuery.createdAt.$lte = new Date(dateRange.end);
      }

      const stats = await Task.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            in_progress: {
              $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
            },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            overdue: {
              $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: stats[0] || { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 }
      });

    } catch (error) {
      logger.error('获取任务统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取任务统计失败'
      });
    }
  }
);

router.use('/tasks', taskRouter);

// ============ 综合统计路由 ============

// 获取治理统计数据
router.get('/statistics/overview',
  checkPermission('governance:stats'),
  getGovernanceStats
);

// 获取工作台数据
router.get('/dashboard',
  checkPermission('governance:read'),
  async (req, res) => {
    try {
      let villageId = req.query.villageId;

      if (req.user.role !== 'admin') {
        villageId = req.user.villageId;
      }

      // 并行获取各类数据
      const [
        urgentAnnouncements,
        upcomingMeetings,
        myTasks,
        pendingTasks
      ] = await Promise.all([
        getUrgentAnnouncements(villageId),
        getUpcomingMeetings(villageId),
        getMyTasks(req.user.id),
        getPendingTasks(villageId)
      ]);

      const dashboard = {
        alerts: {
          announcements: urgentAnnouncements,
          urgentTasks: pendingTasks.filter(t => t.priority === 'urgent')
        },
        upcoming: {
          meetings: upcomingMeetings,
          tasks: myTasks.filter(t =>
            t.status === 'pending' &&
            new Date(t.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          )
        },
        summary: {
          unreadAnnouncements: urgentAnnouncements.length,
          upcomingMeetings: upcomingMeetings.length,
          pendingTasks: myTasks.filter(t => t.status === 'pending').length,
          overdueTasks: myTasks.filter(t => t.status === 'overdue').length
        }
      };

      res.json({
        success: true,
        data: dashboard,
        message: '获取工作台数据成功'
      });

    } catch (error) {
      logger.error('获取工作台数据失败:', error);
      res.status(500).json({
        success: false,
        error: '获取工作台数据失败'
      });
    }
  }
);

// 辅助函数
async function getUrgentAnnouncements(villageId) {
  const Announcement = require('../models/Announcement');
  return await Announcement.findUrgentAnnouncements(villageId);
}

async function getUpcomingMeetings(villageId) {
  const Meeting = require('../models/Meeting');
  const logger = require('../utils/logger');
  return await Meeting.findUpcomingMeetings(villageId, 3);
}

async function getMyTasks(userId) {
  const { Task } = require('../models/Task');
  return await Task.find({
    'assignedTo.residentId': userId,
    status: { $in: ['pending', 'in_progress'] }
  })
    .sort({ priority: -1, dueDate: 1 })
    .limit(10)
    .lean();
}

async function getPendingTasks(villageId) {
  const { Task } = require('../models/Task');
  return await Task.find({
    villageId,
    status: 'pending',
    priority: { $in: ['high', 'urgent'] }
  })
    .sort({ priority: -1, dueDate: 1 })
    .limit(5)
    .lean();
}

module.exports = router;