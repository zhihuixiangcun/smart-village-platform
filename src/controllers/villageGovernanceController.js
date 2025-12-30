/**
 * 村务治理控制器
 * 处理公告、会议、任务调度等村务管理功能
 */

const Announcement = require('../models/Announcement');
const Meeting = require('../models/Meeting');
const { Task, TaskSchedule } = require('../models/Task');
const Feedback = require('../models/Feedback');
const Village = require('../models/Village');
const Resident = require('../models/Resident');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { sendNotification } = require('../services/notificationService');
const { createAuditLog } = require('../utils/audit');

// 配置文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads/governance');
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
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * 创建公告
 */
async function createAnnouncement(req, res) {
  try {
    const {
      title,
      content,
      category,
      priority = 'normal',
      targetAudience = 'all',
      tags = [],
      attachments = []
    } = req.body;

    // 验证必填字段
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        error: '标题、内容和分类为必填项'
      });
    }

    // 验证村庄权限
    const hasPermission = await checkVillagePermission(req.user, req.body.villageId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: '没有权限在该村庄发布公告'
      });
    }

    // 创建公告
    const announcement = new Announcement({
      title,
      content,
      category,
      priority,
      targetAudience,
      tags,
      attachments,
      villageId: req.body.villageId,
      createdBy: req.user.id,
      status: 'published',
      publishTime: new Date()
    });

    await announcement.save();

    // 处理附件
    if (req.files && req.files.length > 0) {
      const attachmentPaths = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        size: file.size,
        uploadTime: new Date()
      }));

      announcement.attachments = attachmentPaths;
      await announcement.save();
    }

    // 发送通知给目标用户
    await notifyTargetUsers(announcement);

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE_ANNOUNCEMENT',
      resourceType: 'Announcement',
      resourceId: announcement._id,
      details: {
        title: announcement.title,
        category: announcement.category,
        villageId: announcement.villageId
      }
    });

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
      error: '创建公告失败'
    });
  }
}

/**
 * 获取公告列表
 */
async function getAnnouncements(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      category,
      priority,
      status = 'published',
      keyword,
      startDate,
      endDate,
      sortBy = 'publishTime',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query = { status };

    if (villageId) {
      query.villageId = villageId;
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.publishTime = {};
      if (startDate) query.publishTime.$gte = new Date(startDate);
      if (endDate) query.publishTime.$lte = new Date(endDate);
    }

    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 执行查询
    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('villageId', 'name')
        .populate('createdBy', 'name')
        .lean(),
      Announcement.countDocuments(query)
    ]);

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

/**
 * 创建会议
 */
async function createMeeting(req, res) {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      type = 'regular',
      participants = [],
      agenda = [],
      attachments = []
    } = req.body;

    // 验证必填字段
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: '标题、开始时间和结束时间为必填项'
      });
    }

    // 验证时间
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: '结束时间必须晚于开始时间'
      });
    }

    // 验证参与者
    for (const participant of participants) {
      const resident = await Resident.findById(participant.residentId);
      if (!resident) {
        return res.status(400).json({
          success: false,
          error: `参与者不存在: ${participant.residentId}`
        });
      }
    }

    // 创建会议
    const meeting = new Meeting({
      title,
      description,
      startTime: start,
      endTime: end,
      location,
      type,
      participants,
      agenda,
      attachments,
      villageId: req.body.villageId,
      createdBy: req.user.id,
      status: 'scheduled'
    });

    await meeting.save();

    // 发送会议通知
    await sendMeetingNotifications(meeting);

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE_MEETING',
      resourceType: 'Meeting',
      resourceId: meeting._id,
      details: {
        title: meeting.title,
        startTime: meeting.startTime,
        villageId: meeting.villageId
      }
    });

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
      error: '创建会议失败'
    });
  }
}

/**
 * 获取会议列表
 */
async function getMeetings(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      type,
      status,
      startDate,
      endDate,
      keyword
    } = req.query;

    const query = {};

    if (villageId) {
      query.villageId = villageId;
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const [meetings, total] = await Promise.all([
      Meeting.find(query)
        .sort({ startTime: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('villageId', 'name')
        .populate('createdBy', 'name')
        .lean(),
      Meeting.countDocuments(query)
    ]);

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

/**
 * 创建任务
 */
async function createTask(req, res) {
  try {
    const {
      title,
      description,
      type,
      priority = 'normal',
      assignedTo = [],
      dueDate,
      tags = [],
      attachments = [],
      villageId
    } = req.body;

    // 验证必填字段
    if (!title || !type || !villageId) {
      return res.status(400).json({
        success: false,
        error: '标题、类型和村庄ID为必填项'
      });
    }

    // 验证被分配人
    for (const assignee of assignedTo) {
      const resident = await Resident.findOne({
        _id: assignee.residentId,
        villageId
      });
      if (!resident) {
        return res.status(400).json({
          success: false,
          error: `被分配人不存在: ${assignee.residentId}`
        });
      }
    }

    // 创建任务
    const task = new Task({
      title,
      description,
      type,
      priority,
      assignedTo,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags,
      attachments,
      villageId,
      createdBy: req.user.id,
      status: 'pending'
    });

    await task.save();

    // 生成任务调度
    if (task.type === 'recurring') {
      await generateTaskSchedule(task, req.body.schedule);
    }

    // 发送任务通知
    await sendTaskNotifications(task);

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE_TASK',
      resourceType: 'Task',
      resourceId: task._id,
      details: {
        title: task.title,
        type: task.type,
        villageId: task.villageId
      }
    });

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
      error: '创建任务失败'
    });
  }
}

/**
 * 获取任务列表
 */
async function getTasks(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      type,
      status,
      priority,
      assignedTo,
      dueDate,
      keyword,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (villageId) {
      query.villageId = villageId;
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (assignedTo) {
      query['assignedTo.residentId'] = assignedTo;
    }

    if (dueDate) {
      query.dueDate = { $lte: new Date(dueDate) };
    }

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('assignedTo.residentId', 'name phone')
        .populate('villageId', 'name')
        .populate('createdBy', 'name')
        .lean(),
      Task.countDocuments(query)
    ]);

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

/**
 * 更新任务状态
 */
async function updateTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, completionNote, attachments = [] } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 验证权限
    const hasPermission = await checkTaskPermission(req.user, task);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: '没有权限更新该任务'
      });
    }

    // 更新任务状态
    const updateData = {
      status,
      updatedAt: new Date(),
      updatedBy: req.user.id
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
      updateData.completionNote = completionNote;
    }

    if (attachments && attachments.length > 0) {
      updateData.attachments = [...task.attachments, ...attachments];
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('assignedTo.residentId', 'name phone');

    // 发送状态更新通知
    await sendTaskStatusNotification(updatedTask);

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_TASK_STATUS',
      resourceType: 'Task',
      resourceId: task._id,
      details: {
        oldStatus: task.status,
        newStatus: status
      }
    });

    logger.info(`任务状态更新成功: ${id} -> ${status}`);

    res.json({
      success: true,
      data: updatedTask,
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
 * 创建村民反馈
 */
async function createFeedback(req, res) {
  try {
    const {
      type,
      category,
      content,
      attachments = [],
      isAnonymous = false
    } = req.body;

    // 验证必填字段
    if (!type || !category || !content) {
      return res.status(400).json({
        success: false,
        error: '类型、分类和内容为必填项'
      });
    }

    const feedback = new Feedback({
      type,
      category,
      content,
      attachments,
      isAnonymous,
      villageId: req.body.villageId,
      residentId: isAnonymous ? null : req.user.residentId,
      status: 'pending'
    });

    await feedback.save();

    // 处理附件
    if (req.files && req.files.length > 0) {
      const attachmentPaths = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        size: file.size,
        uploadTime: new Date()
      }));

      feedback.attachments = attachmentPaths;
      await feedback.save();
    }

    // 发送反馈通知给村委
    if (!isAnonymous) {
      await notifyVillageAdmins(feedback);
    }

    logger.info(`反馈创建成功: ${feedback._id}`);

    res.status(201).json({
      success: true,
      data: feedback,
      message: '反馈提交成功'
    });

  } catch (error) {
    logger.error('创建反馈失败:', error);
    res.status(500).json({
      success: false,
      error: '创建反馈失败'
    });
  }
}

/**
 * 处理反馈
 */
async function handleFeedback(req, res) {
  try {
    const { id } = req.params;
    const { status, response } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: '反馈不存在'
      });
    }

    // 验证权限
    const hasPermission = await checkFeedbackPermission(req.user, feedback);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: '没有权限处理该反馈'
      });
    }

    // 更新反馈状态
    feedback.status = status;
    feedback.response = response;
    feedback.respondedBy = req.user.id;
    feedback.respondedAt = new Date();
    await feedback.save();

    // 如果反馈不是匿名的，通知村民
    if (feedback.residentId) {
      await sendFeedbackResponseNotification(feedback);
    }

    logger.info(`反馈处理成功: ${id} -> ${status}`);

    res.json({
      success: true,
      data: feedback,
      message: '反馈处理成功'
    });

  } catch (error) {
    logger.error('处理反馈失败:', error);
    res.status(500).json({
      success: false,
      error: '处理反馈失败'
    });
  }
}

/**
 * 获取村庄治理统计
 */
async function getGovernanceStats(req, res) {
  try {
    const { villageId, startDate, endDate } = req.query;

    // 构建时间查询条件
    const timeQuery = {};
    if (startDate || endDate) {
      timeQuery.createdAt = {};
      if (startDate) timeQuery.createdAt.$gte = new Date(startDate);
      if (endDate) timeQuery.createdAt.$lte = new Date(endDate);
    }

    const villageQuery = villageId ? { villageId } : {};

    // 获取各项统计
    const [announcementStats, meetingStats, taskStats, feedbackStats] = await Promise.all([
      // 公告统计
      Announcement.aggregate([
        { $match: { ...villageQuery, ...timeQuery } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            }
          }
        }
      ]),
      // 会议统计
      Meeting.aggregate([
        { $match: { ...villageQuery } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // 任务统计
      Task.aggregate([
        { $match: { ...villageQuery, ...timeQuery } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // 反馈统计
      Feedback.aggregate([
        { $match: { ...villageQuery, ...timeQuery } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        announcements: announcementStats,
        meetings: meetingStats,
        tasks: taskStats,
        feedbacks: feedbackStats
      }
    });

  } catch (error) {
    logger.error('获取治理统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取治理统计失败'
    });
  }
}

// 辅助函数

/**
 * 检查村庄权限
 */
async function checkVillagePermission(user, villageId) {
  // 管理员有所有权限
  if (user.role === 'admin') return true;

  // 村委成员只能管理自己的村庄
  if (user.role === 'village_admin' && user.villageId === villageId) return true;

  return false;
}

/**
 * 通知目标用户
 */
async function notifyTargetUsers(announcement) {
  try {
    const recipients = [];

    // 根据目标受众获取用户列表
    if (announcement.targetAudience === 'all') {
      // 通知村庄所有村民
      const residents = await Resident.find({
        villageId: announcement.villageId
      });
      recipients.push(...residents.map(r => r._id));
    } else if (announcement.targetAudience === 'committee') {
      // 通知村委成员
      const officials = await Resident.find({
        villageId: announcement.villageId,
        'positions.role': { $exists: true }
      });
      recipients.push(...officials.map(o => o._id));
    }

    // 发送通知
    for (const recipientId of recipients) {
      await sendNotification({
        type: 'ANNOUNCEMENT',
        title: announcement.title,
        content: `${announcement.content.substring(0, 100)  }...`,
        recipientId,
        data: {
          announcementId: announcement._id,
          category: announcement.category,
          priority: announcement.priority
        }
      });
    }
  } catch (error) {
    logger.error('发送公告通知失败:', error);
  }
}

/**
 * 发送会议通知
 */
async function sendMeetingNotifications(meeting) {
  try {
    for (const participant of meeting.participants) {
      await sendNotification({
        type: 'MEETING_REMINDER',
        title: `会议提醒: ${meeting.title}`,
        content: `会议时间: ${meeting.startTime}`,
        recipientId: participant.residentId,
        data: {
          meetingId: meeting._id,
          location: meeting.location,
          startTime: meeting.startTime
        }
      });
    }
  } catch (error) {
    logger.error('发送会议通知失败:', error);
  }
}

/**
 * 发送任务通知
 */
async function sendTaskNotifications(task) {
  try {
    for (const assignee of task.assignedTo) {
      await sendNotification({
        type: 'TASK_ASSIGNED',
        title: `新任务: ${task.title}`,
        content: `${task.description.substring(0, 100)  }...`,
        recipientId: assignee.residentId,
        data: {
          taskId: task._id,
          dueDate: task.dueDate,
          priority: task.priority
        }
      });
    }
  } catch (error) {
    logger.error('发送任务通知失败:', error);
  }
}

/**
 * 发送任务状态更新通知
 */
async function sendTaskStatusNotification(task) {
  try {
    for (const assignee of task.assignedTo) {
      await sendNotification({
        type: 'TASK_STATUS_UPDATE',
        title: '任务状态更新',
        content: `任务"${task.title}"已更新为${task.status}`,
        recipientId: assignee.residentId,
        data: {
          taskId: task._id,
          status: task.status
        }
      });
    }
  } catch (error) {
    logger.error('发送任务状态通知失败:', error);
  }
}

/**
 * 通知村委管理员
 */
async function notifyVillageAdmins(feedback) {
  try {
    // 获取村委成员
    const officials = await Resident.find({
      villageId: feedback.villageId,
      'positions.role': { $exists: true }
    });

    for (const official of officials) {
      await sendNotification({
        type: 'NEW_FEEDBACK',
        title: '新村民反馈',
        content: `${feedback.content.substring(0, 100)  }...`,
        recipientId: official._id,
        data: {
          feedbackId: feedback._id,
          category: feedback.category
        }
      });
    }
  } catch (error) {
    logger.error('通知村委失败:', error);
  }
}

/**
 * 发送反馈回复通知
 */
async function sendFeedbackResponseNotification(feedback) {
  try {
    await sendNotification({
      type: 'FEEDBACK_RESPONSE',
      title: '反馈回复',
      content: `${feedback.response?.substring(0, 100)  }...`,
      recipientId: feedback.residentId,
      data: {
        feedbackId: feedback._id
      }
    });
  } catch (error) {
    logger.error('发送反馈回复通知失败:', error);
  }
}

/**
 * 检查任务权限
 */
async function checkTaskPermission(user, task) {
  // 管理员有所有权限
  if (user.role === 'admin') return true;

  // 村委成员可以管理本村任务
  if (user.role === 'village_admin' && user.villageId === task.villageId) return true;

  // 被分配人可以更新自己的任务
  const isAssigned = task.assignedTo.some(
    assignee => assignee.residentId.toString() === user.residentId
  );
  if (isAssigned) return true;

  return false;
}

/**
 * 检查反馈权限
 */
async function checkFeedbackPermission(user, feedback) {
  // 管理员有所有权限
  if (user.role === 'admin') return true;

  // 村委成员可以处理本村反馈
  if (user.role === 'village_admin' && user.villageId === feedback.villageId) return true;

  return false;
}

module.exports = {
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
  upload: upload.array('attachments', 5)
};