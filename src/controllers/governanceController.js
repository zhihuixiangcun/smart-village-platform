/**
 * 村务治理控制器
 * 整合公告管理、会议管理、任务调度等功能
 */

const Announcement = require('../models/Announcement');
const Meeting = require('../models/Meeting');
const { Task, TaskSchedule } = require('../models/Task');
const Village = require('../models/Village');
const Resident = require('../models/Resident');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { sendNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

// 配置文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      let uploadDir;

      if (file.fieldname === 'announcement') {
        uploadDir = path.join(process.cwd(), 'uploads/announcements');
      } else if (file.fieldname === 'meeting') {
        uploadDir = path.join(process.cwd(), 'uploads/meetings');
      } else if (file.fieldname === 'task') {
        uploadDir = path.join(process.cwd(), 'uploads/tasks');
      } else {
        uploadDir = path.join(process.cwd(), 'uploads/governance');
      }

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
 * 公告管理功能
 */

// 创建公告
async function createAnnouncement(req, res) {
  try {
    const {
      title,
      content,
      summary,
      category,
      priority = 'normal',
      targetAudience = 'all',
      customAudience,
      displaySettings,
      voiceBroadcast,
      pushNotification,
      location,
      scheduledAt,
      expiresAt
    } = req.body;

    // 验证村庄权限
    const announcementData = {
      title,
      content,
      summary,
      category,
      priority,
      villageId: req.user.villageId,
      publisherId: req.user.id,
      publisherName: req.user.name,
      publisherRole: req.user.role,
      targetAudience,
      displaySettings: displaySettings || {},
      voiceBroadcast: voiceBroadcast || {},
      pushNotification: pushNotification || {}
    };

    if (customAudience) {
      announcementData.customAudience = customAudience;
    }

    if (location) {
      announcementData.location = location;
    }

    if (scheduledAt) {
      announcementData.scheduledAt = new Date(scheduledAt);
      announcementData.status = 'scheduled';
    }

    if (expiresAt) {
      announcementData.expiresAt = new Date(expiresAt);
    }

    const announcement = new Announcement(announcementData);
    await announcement.save();

    // 处理附件上传
    if (req.files && req.files.length > 0) {
      announcement.attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      }));
      await announcement.save();
    }

    // 如果需要立即发布
    if (!scheduledAt) {
      await announcement.publish();
    }

    // 发送推送通知
    if (pushNotification?.enabled && announcement.status === 'published') {
      await sendAnnouncementNotification(announcement);
    }

    logger.info(`公告创建成功: ${announcement._id}`);

    res.status(201).json({
      success: true,
      data: announcement,
      message: '公告创建成功'
    });

  } catch (error) {
    logger.error('创建公告失败:', error);
    res.status(500).json({
      success: false,
      error: '创建公告失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 获取公告列表
async function getAnnouncements(req, res) {
  try {
    const {
      villageId,
      category,
      priority,
      targetAudience,
      status = 'published',
      page = 1,
      limit = 20
    } = req.query;

    // 权限检查：只能查看自己村庄的公告（管理员除外）
    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    const announcements = await Announcement.findByVillage(queryVillageId, {
      status,
      category,
      priority,
      targetAudience,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await Announcement.countDocuments({
      villageId: queryVillageId,
      status
    });

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('获取公告列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取公告列表失败'
    });
  }
}

// 发布公告
async function publishAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'admin' && announcement.villageId.toString() !== req.user.villageId) {
      return res.status(403).json({
        success: false,
        error: '没有权限操作此公告'
      });
    }

    await announcement.publish();

    // 发送推送通知
    if (announcement.pushNotification.enabled) {
      await sendAnnouncementNotification(announcement);
    }

    logger.info(`公告发布成功: ${id}`);

    res.json({
      success: true,
      data: announcement,
      message: '公告发布成功'
    });

  } catch (error) {
    logger.error('发布公告失败:', error);
    res.status(500).json({
      success: false,
      error: '发布公告失败'
    });
  }
}

/**
 * 会议管理功能
 */

// 创建会议
async function createMeeting(req, res) {
  try {
    const {
      title,
      description,
      meetingType,
      startTime,
      endTime,
      location,
      participants,
      agenda,
      materials,
      notifications,
      recurring
    } = req.body;

    // 验证时间
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({
        success: false,
        error: '会议结束时间必须晚于开始时间'
      });
    }

    const meetingData = {
      title,
      description,
      meetingType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60)),
      villageId: req.user.villageId,
      organizerId: req.user.id,
      organizerName: req.user.name,
      organizerRole: req.user.role,
      participants,
      agenda: agenda || [],
      materials: materials || [],
      notifications: notifications || {}
    };

    if (location) {
      meetingData.location = location;
    }

    if (recurring) {
      meetingData.recurring = recurring;
    }

    const meeting = new Meeting(meetingData);
    await meeting.save();

    // 处理会议材料上传
    if (req.files && req.files.length > 0) {
      meeting.materials = req.files.map(file => ({
        title: file.originalname,
        filename: file.filename,
        path: file.path,
        type: file.mimetype,
        size: file.size,
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      }));
      await meeting.save();
    }

    // 发送会议通知
    await sendMeetingNotification(meeting, 'created');

    logger.info(`会议创建成功: ${meeting._id}`);

    res.status(201).json({
      success: true,
      data: meeting,
      message: '会议创建成功'
    });

  } catch (error) {
    logger.error('创建会议失败:', error);
    res.status(500).json({
      success: false,
      error: '创建会议失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 获取会议列表
async function getMeetings(req, res) {
  try {
    const {
      villageId,
      status,
      meetingType,
      dateRange,
      page = 1,
      limit = 20
    } = req.query;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    const meetings = await Meeting.findByVillage(queryVillageId, {
      status,
      meetingType,
      dateRange,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await Meeting.countDocuments({
      villageId: queryVillageId
    });

    res.json({
      success: true,
      data: {
        meetings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('获取会议列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取会议列表失败'
    });
  }
}

// 会议签到
async function checkInMeeting(req, res) {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: '会议不存在'
      });
    }

    // 验证参会权限
    const isParticipant = meeting.participants.required.some(
      p => p.toString() === req.user.id
    ) || meeting.participants.optional.some(
      p => p.toString() === req.user.id
    );

    if (!isParticipant && meeting.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '您不是此会议的参会人员'
      });
    }

    await meeting.checkIn(req.user.id);

    logger.info(`会议签到成功: ${id} - ${req.user.id}`);

    res.json({
      success: true,
      message: '签到成功'
    });

  } catch (error) {
    logger.error('会议签到失败:', error);
    res.status(500).json({
      success: false,
      error: '会议签到失败'
    });
  }
}

/**
 * 任务调度功能
 */

// 创建任务
async function createTask(req, res) {
  try {
    const {
      title,
      description,
      type,
      priority = 'medium',
      scheduledDate,
      dueDate,
      location,
      assignedTo,
      supervisor,
      requirements,
      resources,
      recurring
    } = req.body;

    const taskData = {
      title,
      description,
      type,
      priority,
      scheduledDate: new Date(scheduledDate),
      dueDate: new Date(dueDate),
      villageId: req.user.villageId,
      createdBy: req.user.id,
      assignedTo: assignedTo || [],
      supervisor: supervisor || {},
      requirements: requirements || [],
      resources: resources || []
    };

    if (location) {
      taskData.location = location;
    }

    let task = new Task(taskData);

    // 如果是重复任务，创建调度
    if (recurring) {
      const result = await Task.createRecurringTask(taskData, recurring);
      task = result.task;
    } else {
      await task.save();
    }

    // 处理任务附件上传
    if (req.files && req.files.length > 0) {
      // 这里可以添加附件处理逻辑
    }

    // 分配任务通知
    if (assignedTo && assignedTo.length > 0) {
      await sendTaskNotification(task, 'assigned');
    }

    logger.info(`任务创建成功: ${task._id}`);

    res.status(201).json({
      success: true,
      data: task,
      message: '任务创建成功'
    });

  } catch (error) {
    logger.error('创建任务失败:', error);
    res.status(500).json({
      success: false,
      error: '创建任务失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 获取任务列表
async function getTasks(req, res) {
  try {
    const {
      villageId,
      status,
      type,
      priority,
      assignedTo,
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
    if (priority) query.priority = priority;
    if (assignedTo) query['assignedTo.residentId'] = assignedTo;

    if (dateRange) {
      query.scheduledDate = {};
      if (dateRange.start) query.scheduledDate.$gte = new Date(dateRange.start);
      if (dateRange.end) query.scheduledDate.$lte = new Date(dateRange.end);
    }

    const tasks = await Task.find(query)
      .sort({ priority: -1, scheduledDate: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('assignedTo.residentId', 'name phone')
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
    logger.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取任务列表失败'
    });
  }
}

// 更新任务状态
async function updateTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes, location, attachments } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 权限检查
    const isAssignee = task.assignedTo.some(
      a => a.residentId.toString() === req.user.residentId
    );

    const isSupervisor = task.supervisor.userId.toString() === req.user.id;
    const isCreator = task.createdBy.toString() === req.user.id;

    if (!isAssignee && !isSupervisor && !isCreator) {
      return res.status(403).json({
        success: false,
        error: '没有权限操作此任务'
      });
    }

    // 更新状态
    task.status = status;

    // 添加执行记录
    const logEntry = {
      action: 'status_update',
      description: `状态更新为: ${status}`,
      performedBy: {
        userId: req.user.id,
        name: req.user.name
      },
      performedAt: new Date(),
      status
    };

    if (notes) logEntry.description += ` - ${notes}`;
    if (location) logEntry.location = location;
    if (attachments) logEntry.attachments = attachments;

    task.executionLog.push(logEntry);

    // 如果任务完成，记录完成时间
    if (status === 'completed') {
      task.completedAt = new Date();
    }

    await task.save();

    // 发送状态更新通知
    await sendTaskNotification(task, 'status_updated');

    logger.info(`任务状态更新成功: ${id} - ${status}`);

    res.json({
      success: true,
      data: task,
      message: '任务状态更新成功'
    });

  } catch (error) {
    logger.error('更新任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新任务状态失败'
    });
  }
}

/**
 * 治理数据统计
 */

// 获取治理统计数据
async function getGovernanceStats(req, res) {
  try {
    const { villageId, dateRange } = req.query;

    let queryVillageId = villageId;
    if (req.user.role !== 'admin') {
      queryVillageId = req.user.villageId;
    }

    // 并行获取各类统计数据
    const [announcementStats, meetingStats, taskStats] = await Promise.all([
      getAnnouncementStats(queryVillageId, dateRange),
      getMeetingStats(queryVillageId, dateRange),
      getTaskStats(queryVillageId, dateRange)
    ]);

    const stats = {
      announcements: announcementStats,
      meetings: meetingStats,
      tasks: taskStats,
      summary: {
        totalActivities: announcementStats.total + meetingStats.totalMeetings + taskStats.total,
        completionRate: Math.round(
          (meetingStats.completionRate + (taskStats.completed / taskStats.total * 100)) / 2
        )
      }
    };

    res.json({
      success: true,
      data: stats,
      message: '获取治理统计数据成功'
    });

  } catch (error) {
    logger.error('获取治理统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取治理统计数据失败'
    });
  }
}

// 辅助函数

async function sendAnnouncementNotification(announcement) {
  try {
    const title = announcement.pushNotification.title || announcement.title;
    const content = announcement.pushNotification.content || announcement.summary;

    await sendNotification({
      type: 'announcement',
      title,
      content,
      data: {
        announcementId: announcement._id,
        category: announcement.category,
        priority: announcement.priority
      },
      targetAudience: announcement.targetAudience,
      customAudience: announcement.customAudience,
      villageId: announcement.villageId
    });
  } catch (error) {
    logger.warn('发送公告通知失败:', error);
  }
}

async function sendMeetingNotification(meeting, action) {
  try {
    const titles = {
      created: '新会议通知',
      updated: '会议变更通知',
      reminder: '会议提醒',
      cancelled: '会议取消通知'
    };

    await sendNotification({
      type: 'meeting',
      title: titles[action] || '会议通知',
      content: `${meeting.title} - ${meeting.startTime.toLocaleString()}`,
      data: {
        meetingId: meeting._id,
        action,
        startTime: meeting.startTime,
        location: meeting.location?.name
      },
      targetUsers: meeting.participants.required,
      villageId: meeting.villageId
    });
  } catch (error) {
    logger.warn('发送会议通知失败:', error);
  }
}

async function sendTaskNotification(task, action) {
  try {
    const titles = {
      assigned: '新任务分配',
      status_updated: '任务状态更新',
      due_soon: '任务即将到期'
    };

    await sendNotification({
      type: 'task',
      title: titles[action] || '任务通知',
      content: `${task.title} - ${action}`,
      data: {
        taskId: task._id,
        action,
        dueDate: task.dueDate,
        priority: task.priority
      },
      targetUsers: task.assignedTo.map(a => a.residentId),
      villageId: task.villageId
    });
  } catch (error) {
    logger.warn('发送任务通知失败:', error);
  }
}

async function getAnnouncementStats(villageId, dateRange) {
  const matchQuery = { villageId: new mongoose.Types.ObjectId(villageId) };

  if (dateRange) {
    matchQuery.createdAt = {};
    if (dateRange.start) matchQuery.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchQuery.createdAt.$lte = new Date(dateRange.end);
  }

  const stats = await Announcement.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        published: {
          $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
        },
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: '$stats.likes' }
      }
    }
  ]);

  return stats[0] || { total: 0, published: 0, totalViews: 0, totalLikes: 0 };
}

async function getMeetingStats(villageId, dateRange) {
  return await Meeting.getMeetingStats(villageId, dateRange);
}

async function getTaskStats(villageId, dateRange) {
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
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        overdue: {
          $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || { total: 0, completed: 0, pending: 0, overdue: 0 };
}

module.exports = {
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
  upload: upload.fields([
    { name: 'announcement', maxCount: 10 },
    { name: 'meeting', maxCount: 10 },
    { name: 'task', maxCount: 10 }
  ])
};