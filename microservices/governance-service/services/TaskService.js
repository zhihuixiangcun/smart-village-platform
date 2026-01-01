/**
 * 任务服务
 * 提供任务管理、分配、调度、追踪等功能
 */

const Task = require('../models/Task');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const MessageQueueManager = require('../../../src/messaging/MessageQueueManager');
const cron = require('node-cron');

class TaskService {
  constructor() {
    this.messageQueue = null;
    this.initMessageQueue();
    this.initTaskScheduler();
  }

  async initMessageQueue() {
    try {
      this.messageQueue = new MessageQueueManager();
      await this.messageQueue.initialize();
    } catch (error) {
      logger.error('初始化消息队列失败:', error);
    }
  }

  /**
   * 初始化任务调度器
   */
  initTaskScheduler() {
    // 每小时检查一次任务状态
    cron.schedule('0 * * * *', async () => {
      await this.checkTaskStatus();
    });

    // 每天检查重复任务
    cron.schedule('0 0 * * *', async () => {
      await this.createRecurringTasks();
    });
  }

  /**
   * 创建任务
   */
  async createTask(taskData, creatorId) {
    try {
      // 验证输入数据
      const errors = validationResult(taskData);
      if (!errors.isEmpty()) {
        throw new Error('数据验证失败: ' + errors.array().map(err => err.msg).join(', '));
      }

      // 设置创建者信息
      taskData.creator = {
        userId: creatorId,
        ...taskData.creator
      };

      const task = new Task(taskData);
      await task.save();

      // 如果已分配执行人员，自动分配任务
      if (task.assignees && task.assignees.length > 0) {
        task.status = '已分配';
        await task.save();

        // 发送任务分配通知
        await this.sendTaskAssignmentNotifications(task);
      }

      // 发送创建事件
      await this.sendEvent('task.created', {
        taskId: task._id,
        title: task.title,
        type: task.type,
        priority: task.priority,
        deadline: task.deadline,
        creator: creatorId
      });

      logger.info('任务创建成功:', task._id);
      return task;
    } catch (error) {
      logger.error('创建任务失败:', error);
      throw error;
    }
  }

  /**
   * 分配任务
   */
  async assignTask(taskId, assignees, operatorId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      // 检查权限
      if (task.creator.userId.toString() !== operatorId.toString()) {
        throw new Error('无权限分配此任务');
      }

      await task.assignTo(assignees, operatorId);

      // 发送分配通知
      await this.sendTaskAssignmentNotifications(task);

      logger.info('任务分配成功:', taskId);
      return task;
    } catch (error) {
      logger.error('分配任务失败:', error);
      throw error;
    }
  }

  /**
   * 开始任务
   */
  async startTask(taskId, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      // 检查用户权限
      const isAssignee = task.assignees.some(a =>
        a.userId.toString() === userId.toString()
      );

      if (!isAssignee) {
        throw new Error('您不是此任务的执行人员');
      }

      if (task.status !== '已分配') {
        throw new Error('任务状态不允许开始');
      }

      task.status = '进行中';
      task.actualStartTime = new Date();

      await task.save();

      // 添加开始日志
      await task.addLog(userId, '', '开始', '任务开始执行');

      // 发送开始通知
      await this.sendTaskStatusNotification(task, 'started');

      logger.info('任务开始成功:', taskId, userId);
      return task;
    } catch (error) {
      logger.error('开始任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId, progress, userId, note = '') {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      // 检查用户权限
      const isAssignee = task.assignees.some(a =>
        a.userId.toString() === userId.toString()
      );

      if (!isAssignee) {
        throw new Error('您不是此任务的执行人员');
      }

      await task.updateProgress(progress, userId, note);

      // 检查是否完成
      if (progress >= 100) {
        await this.completeTask(taskId, userId);
      }

      // 发送进度更新通知
      await this.sendTaskProgressNotification(task, progress);

      logger.info('任务进度更新成功:', taskId, progress);
      return task;
    } catch (error) {
      logger.error('更新任务进度失败:', error);
      throw error;
    }
  }

  /**
   * 完成任务
   */
  async completeTask(taskId, userId, resultData = {}) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      // 检查用户权限
      const isAssignee = task.assignees.some(a =>
        a.userId.toString() === userId.toString()
      );

      if (!isAssignee) {
        throw new Error('您不是此任务的执行人员');
      }

      task.status = '已完成';
      task.progress = 100;
      task.actualEndTime = new Date();

      // 保存任务结果
      if (Object.keys(resultData).length > 0) {
        task.result = resultData;
      }

      await task.save();

      // 添加完成日志
      await task.addLog(userId, '', '完成', '任务已完成');

      // 发送完成通知
      await this.sendTaskStatusNotification(task, 'completed');

      // 创建任务评价任务
      await this.createTaskEvaluationTask(task);

      logger.info('任务完成成功:', taskId, userId);
      return task;
    } catch (error) {
      logger.error('完成任务失败:', error);
      throw error;
    }
  }

  /**
   * 暂停任务
   */
  async pauseTask(taskId, userId, reason = '') {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      // 检查用户权限
      const isAssignee = task.assignees.some(a =>
        a.userId.toString() === userId.toString()
      );

      if (!isAssignee) {
        throw new Error('您不是此任务的执行人员');
      }

      task.status = '暂停';

      await task.save();

      // 添加暂停日志
      await task.addLog(userId, '', '暂停', `任务暂停: ${reason}`);

      // 发送暂停通知
      await this.sendTaskStatusNotification(task, 'paused');

      logger.info('任务暂停成功:', taskId, userId);
      return task;
    } catch (error) {
      logger.error('暂停任务失败:', error);
      throw error;
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId, operatorId, reason = '') {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      // 检查权限
      if (task.creator.userId.toString() !== operatorId.toString()) {
        throw new Error('无权限取消此任务');
      }

      task.status = '已取消';

      await task.save();

      // 添加取消日志
      await task.addLog(operatorId, '', '取消', `任务取消: ${reason}`);

      // 发送取消通知
      await this.sendTaskStatusNotification(task, 'cancelled');

      logger.info('任务取消成功:', taskId);
      return task;
    } catch (error) {
      logger.error('取消任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务列表
   */
  async getTasks(queryOptions = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        type,
        creatorId,
        assigneeId,
        startDate,
        endDate,
        keyword
      } = queryOptions;

      const filter = {};

      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (type) filter.type = type;
      if (creatorId) filter['creator.userId'] = creatorId;
      if (assigneeId) filter['assignees.userId'] = assigneeId;

      // 日期范围过滤
      if (startDate || endDate) {
        filter.deadline = {};
        if (startDate) filter.deadline.$gte = new Date(startDate);
        if (endDate) filter.deadline.$lte = new Date(endDate);
      }

      // 关键词搜索
      if (keyword) {
        filter.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } }
        ];
      }

      const tasks = await Task.find(filter)
        .sort({ priority: -1, deadline: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('creator.userId', 'name avatar')
        .populate('assignees.userId', 'name avatar')
        .lean();

      const total = await Task.countDocuments(filter);

      return {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取任务列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务详情
   */
  async getTaskById(taskId) {
    try {
      const task = await Task.findById(taskId)
        .populate('creator.userId', 'name avatar position contact')
        .populate('assignees.userId', 'name avatar contact')
        .populate('logs.userId', 'name avatar')
        .populate('checkpoints.reporter', 'name avatar')
        .populate('evaluation.self.userId', 'name avatar')
        .populate('evaluation.supervisor.userId', 'name avatar');

      if (!task) {
        throw new Error('任务不存在');
      }

      return task;
    } catch (error) {
      logger.error('获取任务详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取今日任务
   */
  async getTodayTasks(userId) {
    try {
      return await Task.findTodayTasks(userId);
    } catch (error) {
      logger.error('获取今日任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取即将到来的任务
   */
  async getUpcomingTasks(userId, days = 7) {
    try {
      return await Task.findUpcomingTasks(userId, days);
    } catch (error) {
      logger.error('获取即将到来的任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取超时任务
   */
  async getOverdueTasks(assigneeId) {
    try {
      const filter = {
        deadline: { $lt: new Date() },
        status: { $in: ['进行中', '暂停'] }
      };

      if (assigneeId) {
        filter['assignees.userId'] = assigneeId;
      }

      return await Task.find(filter)
        .sort({ deadline: 1 })
        .populate('assignees.userId', 'name avatar');
    } catch (error) {
      logger.error('获取超时任务失败:', error);
      throw error;
    }
  }

  /**
   * 完成检查点
   */
  async completeCheckpoint(taskId, checkpointId, userId, notes = '', attachments = []) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      await task.completeCheckpoint(checkpointId, userId, notes);

      // 添加日志
      await task.addLog(userId, '', '更新', `检查点完成: ${notes}`, attachments);

      logger.info('检查点完成成功:', taskId, checkpointId);
      return task;
    } catch (error) {
      logger.error('完成检查点失败:', error);
      throw error;
    }
  }

  /**
   * 检查任务状态
   */
  async checkTaskStatus() {
    try {
      const now = new Date();

      // 检查即将到期的任务
      const upcomingTasks = await Task.find({
        deadline: {
          $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24小时内
          $gt: now
        },
        status: '进行中',
        'notifications.deadline.reminder1.sent': false
      });

      for (const task of upcomingTasks) {
        await this.sendDeadlineReminder(task, 'first');
      }

      // 检查已超时的任务
      const overdueTasks = await Task.findOverdueTasks();

      for (const task of overdueTasks) {
        await this.handleOverdueTask(task);
      }
    } catch (error) {
      logger.error('检查任务状态失败:', error);
    }
  }

  /**
   * 创建重复任务
   */
  async createRecurringTasks() {
    try {
      const now = new Date();

      const recurringTasks = await Task.find({
        'recurrence.enabled': true,
        'recurrence.nextCreation': { $lte: now },
        status: '已完成'
      });

      for (const task of recurringTasks) {
        await this.createNextRecurringTask(task);
      }
    } catch (error) {
      logger.error('创建重复任务失败:', error);
    }
  }

  /**
   * 创建下一个重复任务
   */
  async createNextRecurringTask(originalTask) {
    try {
      const newTaskData = {
        title: originalTask.title,
        description: originalTask.description,
        type: originalTask.type,
        category: originalTask.category,
        priority: originalTask.priority,
        creator: originalTask.creator,
        assignees: originalTask.assignees,
        locations: originalTask.locations,
        requirements: originalTask.requirements,
        resources: originalTask.resources,
        scheduledTime: originalTask.recurrence.nextCreation,
        deadline: new Date(originalTask.recurrence.nextCreation.getTime() +
          (originalTask.deadline.getTime() - originalTask.scheduledTime.getTime())),
        estimatedDuration: originalTask.estimatedDuration,
        notifications: originalTask.notifications,
        tags: originalTask.tags,
        keywords: originalTask.keywords
      };

      const newTask = new Task(newTaskData);
      await newTask.save();

      // 更新原任务的下次创建时间
      originalTask.calculateNextCreation();
      await originalTask.save();

      // 发送新任务通知
      await this.sendTaskAssignmentNotifications(newTask);

      logger.info('重复任务创建成功:', newTask._id);
    } catch (error) {
      logger.error('创建重复任务失败:', error);
    }
  }

  /**
   * 处理超时任务
   */
  async handleOverdueTask(task) {
    try {
      // 发送超时通知
      await this.sendTaskStatusNotification(task, 'overdue');

      // 标记为超时
      task.status = '已超时';
      await task.save();

      // 创建催办任务
      await this.createFollowUpTask(task);
    } catch (error) {
      logger.error('处理超时任务失败:', error);
    }
  }

  /**
   * 创建催办任务
   */
  async createFollowUpTask(overdueTask) {
    try {
      const followUpTask = {
        title: `催办: ${overdueTask.title}`,
        description: `原任务已超时，请尽快完成。原任务截止时间: ${overdueTask.deadline.toLocaleString()}`,
        type: '其他',
        category: '紧急任务',
        priority: '高',
        creator: {
          userId: overdueTask.creator.userId,
          name: '系统',
          position: '任务提醒'
        },
        assignees: overdueTask.assignees,
        scheduledTime: new Date(),
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后
        estimatedDuration: overdueTask.estimatedDuration,
        notifications: {
          assignees: {
            enabled: true,
            channels: ['系统通知', '短信'],
            beforeStart: 0
          }
        },
        originalTaskId: overdueTask._id
      };

      const task = new Task(followUpTask);
      await task.save();

      await this.sendTaskAssignmentNotifications(task);
    } catch (error) {
      logger.error('创建催办任务失败:', error);
    }
  }

  /**
   * 发送截止日期提醒
   */
  async sendDeadlineReminder(task, reminderType) {
    try {
      const reminderKey = reminderType === 'first' ? 'reminder1' : 'reminder2';

      for (const assignee of task.assignees) {
        await this.sendNotification('task_deadline_reminder', {
          taskId: task._id,
          title: task.title,
          deadline: task.deadline,
          reminderType,
          recipient: assignee.userId,
          timeRemaining: task.timeRemaining
        });
      }

      // 更新提醒状态
      task.notifications.deadline[reminderKey].sent = true;
      await task.save();
    } catch (error) {
      logger.error('发送截止日期提醒失败:', error);
    }
  }

  /**
   * 发送任务分配通知
   */
  async sendTaskAssignmentNotifications(task) {
    try {
      for (const assignee of task.assignees) {
        await this.sendNotification('task_assigned', {
          taskId: task._id,
          title: task.title,
          type: task.type,
          priority: task.priority,
          deadline: task.deadline,
          scheduledTime: task.scheduledTime,
          creator: task.creator,
          recipient: assignee.userId
        });
      }
    } catch (error) {
      logger.error('发送任务分配通知失败:', error);
    }
  }

  /**
   * 发送任务状态通知
   */
  async sendTaskStatusNotification(task, status) {
    try {
      const statusData = {
        taskId: task._id,
        title: task.title,
        status,
        recipient: task.creator.userId
      };

      if (status === 'started' || status === 'paused' || status === 'completed') {
        statusData.assignee = task.assignees[0]?.userId;
      }

      await this.sendNotification(`task_${status}`, statusData);
    } catch (error) {
      logger.error('发送任务状态通知失败:', error);
    }
  }

  /**
   * 发送任务进度通知
   */
  async sendTaskProgressNotification(task, progress) {
    try {
      await this.sendNotification('task_progress_updated', {
        taskId: task._id,
        title: task.title,
        progress,
        recipient: task.creator.userId
      });
    } catch (error) {
      logger.error('发送任务进度通知失败:', error);
    }
  }

  /**
   * 创建任务评价任务
   */
  async createTaskEvaluationTask(task) {
    try {
      await this.sendTask('task_evaluation', {
        taskId: task._id,
        title: task.title,
        assignees: task.assignees,
        creator: task.creator,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 一周后
      });
    } catch (error) {
      logger.error('创建任务评价任务失败:', error);
    }
  }

  /**
   * 发送事件消息
   */
  async sendEvent(eventType, eventData) {
    try {
      if (this.messageQueue) {
        await this.messageQueue.sendMessage('village_events', {
          event_type: eventType,
          data: eventData,
          timestamp: new Date(),
          source: 'governance-service'
        });
      }
    } catch (error) {
      logger.error('发送事件消息失败:', error);
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(type, data) {
    try {
      if (this.messageQueue) {
        await this.messageQueue.sendMessage('notifications', {
          type,
          data,
          timestamp: new Date(),
          source: 'governance-service'
        });
      }
    } catch (error) {
      logger.error('发送通知失败:', error);
    }
  }

  /**
   * 发送任务
   */
  async sendTask(taskType, data) {
    try {
      if (this.messageQueue) {
        await this.messageQueue.sendMessage('tasks', {
          taskType,
          data,
          timestamp: new Date(),
          source: 'governance-service'
        });
      }
    } catch (error) {
      logger.error('发送任务失败:', error);
    }
  }
}

module.exports = TaskService;