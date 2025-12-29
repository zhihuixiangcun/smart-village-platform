/**
 * 协作平台定时任务调度器
 * 处理任务提醒、会议提醒、循环任务生成、工作空间自动归档等
 */

const cron = require('node-cron');
const { CollabWorkspace } = require('../../models/CollabWorkspace');
const { TaskAssignment, TaskStatus, TaskPriority } = require('../../models/TaskAssignment');
const { Meeting, MeetingStatus } = require('../../models/Meeting');
const { WorkLog } = require('../../models/WorkLog');
const { ApprovalRequest } = require('../../models/ApprovalRequest');
const webSocketService = require('../webSocketService');
const logger = require('../../config/logger');

class CollaborationScheduler {
  constructor() {
    this.scheduledTasks = new Map();
    this.config = {
      // 检查间隔 (分钟)
      checkInterval: 5,
      // 提醒时间设置 (分钟)
      taskReminder: {
        urgent: 60,     // 1小时前提醒紧急任务
        high: 1440,     // 1天前提醒高优先级任务
        medium: 2880    // 2天前提醒中优先级任务
      },
      meetingReminder: {
        upcoming: 1440,    // 1天前提醒
        imminent: 60       // 1小时前提醒
      },
      // 工作空间自动归档 (天)
      workspaceArchiveDays: 90,
      // 逾期任务检查频率 (小时)
      overdueCheckHours: 6
    };
  }

  /**
   * 启动所有调度任务
   */
  start() {
    logger.info('启动协作平台调度器...');

    // 每5分钟检查一次待提醒的任务
    this.scheduleTaskReminders();

    // 每5分钟检查一次待提醒的会议
    this.scheduleMeetingReminders();

    // 每小时检查一次循环任务
    this.scheduleRecurringTasks();

    // 每小时检查一次循环会议
    this.scheduleRecurringMeetings();

    // 每天凌晨2点执行归档检查
    this.scheduleWorkspaceArchiving();

    // 每6小时检查一次逾期任务
    this.scheduleOverdueTasks();

    logger.info('协作平台调度器启动成功');
  }

  /**
   * 停止所有调度任务
   */
  stop() {
    logger.info('停止协作平台调度器...');

    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.info(`已停止调度任务: ${name}`);
    });

    this.scheduledTasks.clear();
    logger.info('协作平台调度器已停止');
  }

  /**
   * 调度任务提醒
   */
  scheduleTaskReminders() {
    // 每5分钟执行一次
    const task = cron.schedule('*/5 * * * *', async () => {
      await this._checkTaskReminders();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Shanghai'
    });

    this.scheduledTasks.set('taskReminders', task);
    logger.info('任务提醒调度已启动');
  }

  /**
   * 调度会议提醒
   */
  scheduleMeetingReminders() {
    const task = cron.schedule('*/5 * * * *', async () => {
      await this._checkMeetingReminders();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Shanghai'
    });

    this.scheduledTasks.set('meetingReminders', task);
    logger.info('会议提醒调度已启动');
  }

  /**
   * 调度循环任务生成
   */
  scheduleRecurringTasks() {
    const task = cron.schedule('0 * * * *', async () => {
      await this._generateRecurringTasks();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Shanghai'
    });

    this.scheduledTasks.set('recurringTasks', task);
    logger.info('循环任务生成调度已启动');
  }

  /**
   * 调度循环会议生成
   */
  scheduleRecurringMeetings() {
    const task = cron.schedule('0 * * * *', async () => {
      await this._generateRecurringMeetings();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Shanghai'
    });

    this.scheduledTasks.set('recurringMeetings', task);
    logger.info('循环会议生成调度已启动');
  }

  /**
   * 调度工作空间归档
   */
  scheduleWorkspaceArchiving() {
    const task = cron.schedule('0 2 * * *', async () => {
      await this._archiveExpiredWorkspaces();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Shanghai'
    });

    this.scheduledTasks.set('workspaceArchiving', task);
    logger.info('工作空间归档调度已启动');
  }

  /**
   * 调度逾期任务检查
   */
  scheduleOverdueTasks() {
    const task = cron.schedule('0 */6 * * *', async () => {
      await this._checkOverdueTasks();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Shanghai'
    });

    this.scheduledTasks.set('overdueTasks', task);
    logger.info('逾期任务检查调度已启动');
  }

  // ==================== 具体任务实现 ====================

  /**
   * 检查任务提醒
   * @private
   */
  async _checkTaskReminders() {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + this.config.taskReminder.urgent * 60 * 1000);
      const oneDayLater = new Date(now.getTime() + this.config.taskReminder.high * 60 * 1000);
      const twoDaysLater = new Date(now.getTime() + this.config.taskReminder.medium * 60 * 1000);

      // 查找需要提醒的任务
      const tasksToRemind = await TaskAssignment.find({
        status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        dueDate: {
          $gte: now,
          $lte: twoDaysLater
        },
        $or: [
          { reminderSent: { $exists: false } },
          { reminderSent: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
        ]
      }).populate('assigneeId assignerId workspaceId');

      for (const task of tasksToRemind) {
        const dueDate = new Date(task.dueDate);
        let shouldRemind = false;
        let reminderType = '';

        // 紧急任务：1小时前
        if (task.priority === TaskPriority.URGENT && dueDate <= oneHourLater) {
          shouldRemind = true;
          reminderType = 'urgent';
        }
        // 高优先级：1天前
        else if (task.priority === TaskPriority.HIGH && dueDate <= oneDayLater) {
          shouldRemind = true;
          reminderType = 'high';
        }
        // 中优先级：2天前
        else if (task.priority === TaskPriority.MEDIUM && dueDate <= twoDaysLater) {
          shouldRemind = true;
          reminderType = 'medium';
        }

        if (shouldRemind) {
          await this._sendTaskReminder(task, reminderType);
          task.reminderSent = now;
          await task.save();
        }
      }

      logger.debug(`任务提醒检查完成，处理了 ${tasksToRemind.length} 个任务`);
    } catch (error) {
      logger.error('任务提醒检查失败:', error);
    }
  }

  /**
   * 发送任务提醒
   * @private
   */
  async _sendTaskReminder(task, reminderType) {
    const messages = {
      urgent: `紧急提醒：任务 "${task.title}" 将于1小时后到期`,
      high: `提醒：任务 "${task.title}" 将于1天后到期`,
      medium: `提醒：任务 "${task.title}" 将于2天后到期`
    };

    // 通知任务负责人
    if (task.assigneeId) {
      webSocketService.notifyTask(task.assigneeId._id.toString(), {
        taskId: task._id,
        title: task.title,
        dueDate: task.dueDate,
        message: messages[reminderType],
        reminderType,
        priority: task.priority
      });
    }

    // 通知关注人
    if (task.watchers && task.watchers.length > 0) {
      for (const watcherId of task.watchers) {
        if (task.assigneeId && watcherId.toString() !== task.assigneeId._id.toString()) {
          webSocketService.notifyTask(watcherId.toString(), {
            taskId: task._id,
            title: task.title,
            dueDate: task.dueDate,
            message: `关注的任务 "${task.title}" ${messages[reminderType]}`,
            reminderType,
            priority: task.priority
          });
        }
      }
    }

    logger.info(`已发送任务提醒: ${task.title} (${reminderType})`);
  }

  /**
   * 检查会议提醒
   * @private
   */
  async _checkMeetingReminders() {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + this.config.meetingReminder.imminent * 60 * 1000);
      const oneDayLater = new Date(now.getTime() + this.config.meetingReminder.upcoming * 60 * 1000);

      // 查找需要提醒的会议
      const meetingsToRemind = await Meeting.find({
        status: MeetingStatus.SCHEDULED,
        scheduledStart: {
          $gte: now,
          $lte: oneDayLater
        },
        $or: [
          { reminderSent: { $exists: false } },
          { reminderSent: { $lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) } }
        ]
      }).populate('organizerId participants.userId');

      for (const meeting of meetingsToRemind) {
        const startTime = new Date(meeting.scheduledStart);
        let shouldRemind = false;
        let reminderType = '';

        // 1小时前提醒
        if (startTime <= oneHourLater) {
          shouldRemind = true;
          reminderType = 'imminent';
        }
        // 1天前提醒
        else if (startTime <= oneDayLater) {
          shouldRemind = true;
          reminderType = 'upcoming';
        }

        if (shouldRemind) {
          await this._sendMeetingReminder(meeting, reminderType);
          meeting.reminderSent = now;
          await meeting.save();
        }
      }

      logger.debug(`会议提醒检查完成，处理了 ${meetingsToRemind.length} 个会议`);
    } catch (error) {
      logger.error('会议提醒检查失败:', error);
    }
  }

  /**
   * 发送会议提醒
   * @private
   */
  async _sendMeetingReminder(meeting, reminderType) {
    const messages = {
      imminent: `会议 "${meeting.title}" 将于1小时后开始`,
      upcoming: `提醒：会议 "${meeting.title}" 将于明天开始`
    };

    // 通知组织者
    if (meeting.organizerId) {
      webSocketService.notifyMeeting(meeting.workspaceId.toString(), {
        meetingId: meeting._id,
        title: meeting.title,
        scheduledStart: meeting.scheduledStart,
        message: messages[reminderType],
        reminderType
      });
    }

    // 通知参与者
    if (meeting.participants && meeting.participants.length > 0) {
      for (const participant of meeting.participants) {
        if (participant.userId) {
          webSocketService.notifyMeeting(meeting.workspaceId.toString(), {
            meetingId: meeting._id,
            title: meeting.title,
            scheduledStart: meeting.scheduledStart,
            message: messages[reminderType],
            reminderType
          });
        }
      }
    }

    logger.info(`已发送会议提醒: ${meeting.title} (${reminderType})`);
  }

  /**
   * 生成循环任务
   * @private
   */
  async _generateRecurringTasks() {
    try {
      const now = new Date();
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      // 查找需要生成的循环任务模板
      const recurringTasks = await TaskAssignment.find({
        isRecurring: true,
        status: TaskStatus.PENDING,
        nextOccurrence: { $lte: startOfHour }
      }).populate('workspaceId assignerId');

      for (const template of recurringTasks) {
        try {
          const newTask = await this._createNextOccurrence(template);
          if (newTask) {
            // 计算下次生成时间
            const nextDate = this._calculateNextOccurrence(template.recurrence, template.dueDate);
            template.nextOccurrence = nextDate;
            await template.save();

            logger.info(`已生成循环任务: ${newTask.title}`);
          }
        } catch (error) {
          logger.error(`生成循环任务失败 (${template.title}):`, error);
        }
      }

      logger.debug(`循环任务生成完成，处理了 ${recurringTasks.length} 个模板`);
    } catch (error) {
      logger.error('循环任务生成失败:', error);
    }
  }

  /**
   * 创建下一次任务实例
   * @private
   */
  async _createNextOccurrence(template) {
    const { TaskAssignment } = require('../../models/TaskAssignment');

    const newTask = new TaskAssignment({
      workspaceId: template.workspaceId,
      villageId: template.villageId,
      title: template.title,
      description: template.description,
      assignerId: template.assignerId,
      assigneeId: template.assigneeId,
      priority: template.priority,
      dueDate: this._calculateNextOccurrence(template.recurrence, template.dueDate),
      labels: template.labels,
      tags: template.tags,
      checkpoints: template.checkpoints,
      parentTaskId: template.isRecurring ? template._id : undefined,
      isRecurring: false
    });

    await newTask.save();
    return newTask;
  }

  /**
   * 计算下一次发生时间
   * @private
   */
  _calculateNextOccurrence(recurrence, fromDate) {
    const date = new Date(fromDate);

    switch (recurrence.frequency) {
      case 'daily':
        date.setDate(date.getDate() + (recurrence.interval || 1));
        break;
      case 'weekly':
        date.setDate(date.getDate() + (recurrence.interval || 1) * 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + (recurrence.interval || 1));
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + (recurrence.interval || 1));
        break;
      default:
        return null;
    }

    return date;
  }

  /**
   * 生成循环会议
   * @private
   */
  async _generateRecurringMeetings() {
    try {
      const now = new Date();
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      // 查找需要生成的循环会议模板
      const recurringMeetings = await Meeting.find({
        isRecurring: true,
        status: MeetingStatus.SCHEDULED,
        nextOccurrence: { $lte: startOfHour }
      }).populate('organizerId');

      for (const template of recurringMeetings) {
        try {
          const newMeeting = await this._createNextMeeting(template);
          if (newMeeting) {
            // 计算下次生成时间
            const nextDate = this._calculateNextOccurrence(template.recurrence, template.scheduledStart);
            template.nextOccurrence = nextDate;
            await template.save();

            logger.info(`已生成循环会议: ${newMeeting.title}`);
          }
        } catch (error) {
          logger.error(`生成循环会议失败 (${template.title}):`, error);
        }
      }

      logger.debug(`循环会议生成完成，处理了 ${recurringMeetings.length} 个模板`);
    } catch (error) {
      logger.error('循环会议生成失败:', error);
    }
  }

  /**
   * 创建下一次会议实例
   * @private
   */
  async _createNextMeeting(template) {
    const { Meeting } = require('../../models/Meeting');

    const nextStart = this._calculateNextOccurrence(template.recurrence, template.scheduledStart);
    const duration = new Date(template.scheduledEnd) - new Date(template.scheduledStart);
    const nextEnd = new Date(nextStart.getTime() + duration);

    const newMeeting = new Meeting({
      workspaceId: template.workspaceId,
      villageId: template.villageId,
      title: template.title,
      description: template.description,
      meetingType: template.meetingType,
      organizerId: template.organizerId,
      scheduledStart: nextStart,
      scheduledEnd: nextEnd,
      location: template.location,
      agenda: template.agenda,
      participants: template.participants.map(p => ({
        userId: p.userId,
        committeeMemberId: p.committeeMemberId,
        role: p.role,
        isRequired: p.isRequired
      })),
      parentMeetingId: template.isRecurring ? template._id : undefined,
      isRecurring: false
    });

    await newMeeting.save();
    return newMeeting;
  }

  /**
   * 归档过期工作空间
   * @private
   */
  async _archiveExpiredWorkspaces() {
    try {
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - this.config.workspaceArchiveDays);

      // 查找需要归档的工作空间
      const expiredWorkspaces = await CollabWorkspace.find({
        status: 'active',
        updatedAt: { $lt: archiveDate }
      });

      for (const workspace of expiredWorkspaces) {
        try {
          // 检查是否有活跃的任务或会议
          const activeTasksCount = await TaskAssignment.countDocuments({
            workspaceId: workspace._id,
            status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] }
          });

          const activeMeetingsCount = await Meeting.countDocuments({
            workspaceId: workspace._id,
            status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS] }
          });

          // 只有在没有活跃任务和会议时才归档
          if (activeTasksCount === 0 && activeMeetingsCount === 0) {
            workspace.status = 'archived';
            workspace.archivedAt = new Date();
            await workspace.save();

            // 通知工作空间成员
            webSocketService.notifyWorkspace(workspace._id.toString(), {
              type: 'workspace_archived',
              data: {
                workspaceId: workspace._id,
                name: workspace.name,
                archivedAt: workspace.archivedAt
              }
            });

            logger.info(`已归档工作空间: ${workspace.name}`);
          }
        } catch (error) {
          logger.error(`归档工作空间失败 (${workspace.name}):`, error);
        }
      }

      logger.info(`工作空间归档完成，处理了 ${expiredWorkspaces.length} 个工作空间`);
    } catch (error) {
      logger.error('工作空间归档失败:', error);
    }
  }

  /**
   * 检查逾期任务
   * @private
   */
  async _checkOverdueTasks() {
    try {
      const now = new Date();

      // 查找逾期任务
      const overdueTasks = await TaskAssignment.find({
        status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        dueDate: { $lt: now }
      }).populate('assigneeId assignerId workspaceId');

      for (const task of overdueTasks) {
        // 标记为逾期
        if (task.status !== TaskStatus.OVERDUE) {
          task.status = TaskStatus.OVERDUE;
          await task.save();

          // 通知相关人员
          if (task.assigneeId) {
            webSocketService.notifyTask(task.assigneeId._id.toString(), {
              taskId: task._id,
              title: task.title,
              dueDate: task.dueDate,
              message: `任务 "${task.title}" 已逾期`,
              type: 'overdue'
            });
          }

          if (task.assignerId && task.assigneeId &&
              task.assignerId._id.toString() !== task.assigneeId._id.toString()) {
            webSocketService.notifyTask(task.assignerId._id.toString(), {
              taskId: task._id,
              title: task.title,
              dueDate: task.dueDate,
              assignee: task.assigneeId.name,
              message: `分配给 ${task.assigneeId.name} 的任务 "${task.title}" 已逾期`,
              type: 'overdue'
            });
          }

          logger.info(`已标记逾期任务: ${task.title}`);
        }
      }

      logger.info(`逾期任务检查完成，处理了 ${overdueTasks.length} 个逾期任务`);
    } catch (error) {
      logger.error('逾期任务检查失败:', error);
    }
  }

  /**
   * 手动触发特定任务
   * @param {string} taskName - 任务名称
   */
  async triggerTask(taskName) {
    logger.info(`手动触发任务: ${taskName}`);

    switch (taskName) {
      case 'taskReminders':
        await this._checkTaskReminders();
        break;
      case 'meetingReminders':
        await this._checkMeetingReminders();
        break;
      case 'recurringTasks':
        await this._generateRecurringTasks();
        break;
      case 'recurringMeetings':
        await this._generateRecurringMeetings();
        break;
      case 'workspaceArchiving':
        await this._archiveExpiredWorkspaces();
        break;
      case 'overdueTasks':
        await this._checkOverdueTasks();
        break;
      default:
        throw new Error(`未知任务: ${taskName}`);
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      running: this.scheduledTasks.size > 0,
      tasks: Array.from(this.scheduledTasks.keys()),
      config: this.config
    };
  }
}

// 创建单例实例
const collaborationScheduler = new CollaborationScheduler();

module.exports = collaborationScheduler;
