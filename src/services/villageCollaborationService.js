/**
 * 村务协同平台服务
 * 提供在线讨论、任务调度、团队协作等功能
 */

const { VillageDiscussion, VillageTask, DiscussionTypes, TaskPriority, TaskStatus } = require('../models/VillageCollaboration');
const User = require('../models/User');
const NotificationService = require('./notificationService');
const logger = require('../config/logger');

class VillageCollaborationService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * 创建村务讨论
   * @param {Object} discussionData - 讨论数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 创建的讨论
   */
  async createDiscussion(discussionData, options = {}) {
    try {
      logger.info(`创建村务讨论: ${discussionData.title}`);

      // 1. 验证发起人权限
      const initiator = await User.findById(discussionData.initiator.userId);
      if (!initiator) {
        throw new Error('发起人不存在');
      }

      // 2. 创建讨论记录
      const discussion = new VillageDiscussion({
        ...discussionData,
        statistics: {
          viewCount: 0,
          replyCount: 0,
          participantCount: 1,
          likeCount: 0,
          shareCount: 0
        }
      });

      // 3. 添加发起人作为参与者
      discussion.participants.push({
        userId: discussionData.initiator.userId,
        userName: discussionData.initiator.userName,
        role: 'initiator',
        joinedAt: new Date()
      });

      // 4. 如果启用投票，初始化投票选项
      if (discussionData.voting && discussionData.voting.enabled) {
        discussion.voting = {
          ...discussionData.voting,
          options: discussionData.voting.options.map(option => ({
            text: option,
            votes: 0,
            voters: []
          }))
        };
      }

      // 5. 保存讨论
      await discussion.save();

      // 6. 发送通知
      await this.notifyNewDiscussion(discussion, initiator);

      // 7. 记录操作日志
      this.logCollaborationAction('create_discussion', discussion._id, initiator._id, {
        title: discussion.title,
        type: discussion.type
      });

      logger.info(`讨论创建成功: ${discussion._id}`);

      return {
        success: true,
        discussion,
        message: '讨论创建成功'
      };

    } catch (error) {
      logger.error('创建讨论失败:', error);
      throw error;
    }
  }

  /**
   * 回复讨论
   * @param {string} discussionId - 讨论ID
   * @param {Object} replyData - 回复数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 回复结果
   */
  async replyToDiscussion(discussionId, replyData, options = {}) {
    try {
      logger.info(`回复讨论: ${discussionId}`);

      // 1. 查找讨论
      const discussion = await VillageDiscussion.findById(discussionId);
      if (!discussion) {
        throw new Error('讨论不存在');
      }

      // 2. 验证讨论状态
      if (discussion.status !== 'active') {
        throw new Error('讨论已关闭，无法回复');
      }

      // 3. 创建回复
      const reply = {
        content: replyData.content,
        author: replyData.author,
        attachments: replyData.attachments || [],
        parentReply: replyData.parentReply || null
      };

      // 4. 添加回复到讨论
      discussion.replies.push(reply);

      // 5. 更新统计信息
      discussion.statistics.replyCount += 1;
      discussion.metadata.lastRepliedAt = new Date();
      discussion.metadata.updatedAt = new Date();

      // 6. 添加参与者（如果不存在）
      const existingParticipant = discussion.participants.find(
        p => p.userId.toString() === replyData.author.userId.toString()
      );

      if (!existingParticipant) {
        discussion.participants.push({
          userId: replyData.author.userId,
          userName: replyData.author.userName,
          role: 'interested',
          joinedAt: new Date(),
          lastActiveAt: new Date()
        });
        discussion.statistics.participantCount += 1;
      } else {
        existingParticipant.lastActiveAt = new Date();
      }

      // 7. 保存讨论
      await discussion.save();

      // 8. 发送通知给其他参与者
      await this.notifyNewReply(discussion, reply, replyData.author);

      // 9. 记录操作日志
      this.logCollaborationAction('reply_discussion', discussionId, replyData.author.userId, {
        content: replyData.content.substring(0, 100)
      });

      logger.info(`回复成功: ${discussionId}`);

      return {
        success: true,
        reply: discussion.replies[discussion.replies.length - 1],
        statistics: discussion.statistics,
        message: '回复成功'
      };

    } catch (error) {
      logger.error('回复讨论失败:', error);
      throw error;
    }
  }

  /**
   * 创建村务任务
   * @param {Object} taskData - 任务数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 创建的任务
   */
  async createTask(taskData, options = {}) {
    try {
      logger.info(`创建村务任务: ${taskData.title}`);

      // 1. 验证创建者权限
      const creator = await User.findById(taskData.creator.userId);
      if (!creator) {
        throw new Error('创建者不存在');
      }

      // 2. 验证时间安排
      if (new Date(taskData.schedule.startDate) >= new Date(taskData.schedule.endDate)) {
        throw new Error('开始时间必须早于结束时间');
      }

      // 3. 创建任务
      const task = new VillageTask({
        ...taskData,
        status: TaskStatus.PENDING,
        progress: 0,
        statistics: {
          totalUpdates: 0,
          totalComments: 0,
          totalAttachments: taskData.attachments ? taskData.attachments.length : 0,
          collaborationScore: 0
        }
      });

      // 4. 添加主要负责人
      if (taskData.assignees && taskData.assignees.length > 0) {
        task.assignees.forEach(assignee => {
          assignee.assignedAt = new Date();
          if (!assignee.assignedBy) {
            assignee.assignedBy = taskData.creator.userId;
          }
        });
      }

      // 5. 初始化里程碑
      if (taskData.schedule.milestones) {
        task.schedule.milestones.forEach(milestone => {
          milestone.status = 'pending';
        });
      }

      // 6. 保存任务
      await task.save();

      // 7. 发送通知给负责人
      await this.notifyTaskAssignment(task, creator);

      // 8. 记录操作日志
      this.logCollaborationAction('create_task', task._id, creator._id, {
        title: task.title,
        assignees: task.assignees.map(a => a.userName),
        deadline: task.schedule.endDate
      });

      logger.info(`任务创建成功: ${task._id}`);

      return {
        success: true,
        task,
        message: '任务创建成功'
      };

    } catch (error) {
      logger.error('创建任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务状态
   * @param {string} taskId - 任务ID
   * @param {string} newStatus - 新状态
   * @param {Object} updateData - 更新数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 更新结果
   */
  async updateTaskStatus(taskId, newStatus, updateData = {}, options = {}) {
    try {
      logger.info(`更新任务状态: ${taskId} -> ${newStatus}`);

      // 1. 查找任务
      const task = await VillageTask.findById(taskId)
        .populate('assignees.userId', 'userName email')
        .populate('creator.userId', 'userName email');

      if (!task) {
        throw new Error('任务不存在');
      }

      const oldStatus = task.status;

      // 2. 验证状态转换
      if (!this.isValidStatusTransition(oldStatus, newStatus)) {
        throw new Error(`无效的状态转换: ${oldStatus} -> ${newStatus}`);
      }

      // 3. 更新任务状态
      task.status = newStatus;

      // 4. 根据状态更新其他字段
      if (newStatus === TaskStatus.IN_PROGRESS) {
        if (!task.progress || task.progress === 0) {
          task.progress = 10; // 开始任务时设置进度为10%
        }
      } else if (newStatus === TaskStatus.COMPLETED) {
        task.progress = 100;
        task.completion = {
          ...task.completion,
          ...updateData.completion,
          completedAt: new Date(),
          completedBy: options.operatorId || task.assignees[0]?.userId
        };
      } else if (newStatus === TaskStatus.OVERDUE && !task.overdue) {
        // 标记为逾期
        task.statistics.collaborationScore = Math.max(0, task.statistics.collaborationScore - 10);
      }

      // 5. 添加更新记录
      const update = {
        type: 'status',
        content: `任务状态从 ${this.getStatusDisplayName(oldStatus)} 更新为 ${this.getStatusDisplayName(newStatus)}`,
        author: updateData.author,
        createdAt: new Date()
      };

      task.updates.push(update);
      task.statistics.totalUpdates += 1;

      // 6. 保存任务
      await task.save();

      // 7. 发送状态变更通知
      await this.notifyTaskStatusChange(task, oldStatus, newStatus, updateData.author);

      // 8. 记录操作日志
      this.logCollaborationAction('update_task_status', taskId, updateData.author.userId, {
        oldStatus,
        newStatus,
        title: task.title
      });

      logger.info(`任务状态更新成功: ${taskId}`);

      return {
        success: true,
        task,
        oldStatus,
        newStatus,
        message: '任务状态更新成功'
      };

    } catch (error) {
      logger.error('更新任务状态失败:', error);
      throw error;
    }
  }

  /**
   * 添加任务更新
   * @param {string} taskId - 任务ID
   * @param {Object} updateData - 更新数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 更新结果
   */
  async addTaskUpdate(taskId, updateData, options = {}) {
    try {
      logger.info(`添加任务更新: ${taskId}`);

      // 1. 查找任务
      const task = await VillageTask.findById(taskId)
        .populate('assignees.userId', 'userName email')
        .populate('collaborators.userId', 'userName email');

      if (!task) {
        throw new Error('任务不存在');
      }

      // 2. 创建更新记录
      const update = {
        type: updateData.type || 'progress',
        content: updateData.content,
        author: updateData.author,
        attachments: updateData.attachments || [],
        createdAt: new Date()
      };

      // 3. 添加更新到任务
      task.updates.push(update);
      task.statistics.totalUpdates += 1;

      // 4. 更新进度（如果是进度更新）
      if (updateData.progress !== undefined) {
        task.progress = Math.min(100, Math.max(0, updateData.progress));
      }

      // 5. 如果是里程碑更新，更新里程碑状态
      if (updateData.milestoneIndex !== undefined) {
        const milestone = task.schedule.milestones[updateData.milestoneIndex];
        if (milestone) {
          milestone.status = 'completed';
          milestone.completedAt = new Date();
        }
      }

      // 6. 计算协作分数
      task.statistics.collaborationScore = this.calculateCollaborationScore(task);

      // 7. 保存任务
      await task.save();

      // 8. 发送更新通知
      await this.notifyTaskUpdate(task, update);

      // 9. 记录操作日志
      this.logCollaborationAction('add_task_update', taskId, updateData.author.userId, {
        type: update.type,
        content: update.content.substring(0, 100)
      });

      logger.info(`任务更新添加成功: ${taskId}`);

      return {
        success: true,
        update: task.updates[task.updates.length - 1],
        task,
        message: '任务更新添加成功'
      };

    } catch (error) {
      logger.error('添加任务更新失败:', error);
      throw error;
    }
  }

  /**
   * 获取讨论列表
   * @param {string} villageId - 村庄ID
   * @param {Object} filters - 过滤条件
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 讨论列表
   */
  async getDiscussions(villageId, filters = {}, pagination = {}) {
    try {
      // 构建查询条件
      const query = {
        villageId,
        ...filters
      };

      // 排序
      let sort = { createdAt: -1 };
      if (filters.sortBy) {
        switch (filters.sortBy) {
        case 'popular':
          sort = { 'statistics.viewCount': -1, 'statistics.replyCount': -1 };
          break;
        case 'recent':
          sort = { 'metadata.lastRepliedAt': -1 };
          break;
        case 'pinned':
          sort = { 'metadata.pinned': -1, createdAt: -1 };
          break;
        default:
          sort = { createdAt: -1 };
        }
      }

      // 分页
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      // 查询
      const discussions = await VillageDiscussion.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('initiator.userId', 'userName avatar')
        .populate('participants.userId', 'userName avatar')
        .lean();

      // 统计总数
      const total = await VillageDiscussion.countDocuments(query);

      // 获取每个讨论的最新回复
      for (const discussion of discussions) {
        if (discussion.replies && discussion.replies.length > 0) {
          discussion.latestReply = discussion.replies
            .filter(r => !r.isDeleted)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        }
      }

      return {
        success: true,
        discussions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('获取讨论列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务列表
   * @param {string} villageId - 村庄ID
   * @param {Object} filters - 过滤条件
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 任务列表
   */
  async getTasks(villageId, filters = {}, pagination = {}) {
    try {
      // 构建查询条件
      const query = {
        villageId,
        ...filters
      };

      // 排序
      let sort = { createdAt: -1 };
      if (filters.sortBy) {
        switch (filters.sortBy) {
        case 'priority':
          sort = { priority: -1, 'schedule.endDate': 1 };
          break;
        case 'deadline':
          sort = { 'schedule.endDate': 1 };
          break;
        case 'progress':
          sort = { progress: -1 };
          break;
        default:
          sort = { createdAt: -1 };
        }
      }

      // 分页
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      // 查询
      const tasks = await VillageTask.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator.userId', 'userName avatar')
        .populate('assignees.userId', 'userName avatar')
        .populate('collaborators.userId', 'userName avatar')
        .lean();

      // 统计总数
      const total = await VillageTask.countDocuments(query);

      // 添加任务状态标签
      for (const task of tasks) {
        task.statusText = this.getStatusDisplayName(task.status);
        task.priorityText = this.getPriorityDisplayName(task.priority);
        task.overdue = task.status !== TaskStatus.COMPLETED && new Date() > task.schedule.endDate;
        task.daysUntilDeadline = Math.ceil((task.schedule.endDate - new Date()) / (1000 * 60 * 60 * 24));
      }

      return {
        success: true,
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('获取任务列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取待办任务
   * @param {string} userId - 用户ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 待办任务
   */
  async getMyTasks(userId, filters = {}) {
    try {
      const query = {
        $or: [
          { 'creator.userId': userId },
          { 'assignees.userId': userId },
          { 'collaborators.userId': userId }
        ],
        status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        ...filters
      };

      const tasks = await VillageTask.find(query)
        .sort({ priority: -1, 'schedule.endDate': 1 })
        .populate('creator.userId', 'userName avatar')
        .populate('assignees.userId', 'userName avatar')
        .lean();

      // 分类任务
      const myTasks = {
        created: [],
        assigned: [],
        collaborating: []
      };

      for (const task of tasks) {
        task.statusText = this.getStatusDisplayName(task.status);
        task.priorityText = this.getPriorityDisplayName(task.priority);
        task.overdue = task.status !== TaskStatus.COMPLETED && new Date() > task.schedule.endDate;

        if (task.creator.userId && task.creator.userId._id.toString() === userId) {
          myTasks.created.push(task);
        }

        if (task.assignees.some(a => a.userId && a.userId._id.toString() === userId)) {
          myTasks.assigned.push(task);
        }

        if (task.collaborators.some(c => c.userId && c.userId._id.toString() === userId)) {
          myTasks.collaborating.push(task);
        }
      }

      // 统计信息
      const statistics = {
        total: tasks.length,
        overdue: tasks.filter(t => t.overdue).length,
        urgent: tasks.filter(t => t.priority === TaskPriority.URGENT).length,
        today: tasks.filter(t => {
          const today = new Date();
          const deadline = new Date(t.schedule.endDate);
          return deadline.toDateString() === today.toDateString();
        }).length
      };

      return {
        success: true,
        tasks: myTasks,
        statistics
      };

    } catch (error) {
      logger.error('获取待办任务失败:', error);
      throw error;
    }
  }

  /**
   * 发送新讨论通知
   * @param {Object} discussion - 讨论
   * @param {Object} initiator - 发起人
   */
  async notifyNewDiscussion(discussion, initiator) {
    try {
      // 获取村庄管理员
      const villageAdmins = await User.find({
        'village.villageId': discussion.villageId,
        role: { $in: ['village_admin', 'department_head'] }
      });

      const notificationData = {
        title: '新的村务讨论',
        content: `${initiator.userName} 发起了新讨论: ${discussion.title}`,
        type: 'discussion_new',
        url: `/village/discussions/${discussion._id}`,
        recipients: villageAdmins.map(admin => admin._id),
        data: {
          discussionId: discussion._id,
          villageId: discussion.villageId,
          initiator: initiator.userName
        }
      };

      await this.notificationService.sendNotification(notificationData);

    } catch (error) {
      logger.error('发送新讨论通知失败:', error);
    }
  }

  /**
   * 发送回复通知
   * @param {Object} discussion - 讨论
   * @param {Object} reply - 回复
   * @param {Object} author - 作者
   */
  async notifyNewReply(discussion, reply, author) {
    try {
      // 通知除作者外的所有参与者
      const recipientIds = discussion.participants
        .filter(p => p.userId.toString() !== author.userId.toString() && p.notificationEnabled)
        .map(p => p.userId);

      if (recipientIds.length === 0) return;

      const notificationData = {
        title: '讨论新回复',
        content: `${author.userName} 在 "${discussion.title}" 中回复了: ${reply.content.substring(0, 50)}...`,
        type: 'discussion_reply',
        url: `/village/discussions/${discussion._id}#reply-${reply._id}`,
        recipients: recipientIds,
        data: {
          discussionId: discussion._id,
          replyId: reply._id,
          author: author.userName
        }
      };

      await this.notificationService.sendNotification(notificationData);

    } catch (error) {
      logger.error('发送回复通知失败:', error);
    }
  }

  /**
   * 发送任务分配通知
   * @param {Object} task - 任务
   * @param {Object} creator - 创建者
   */
  async notifyTaskAssignment(task, creator) {
    try {
      const assigneeIds = task.assignees.map(a => a.userId);

      const notificationData = {
        title: '新任务分配',
        content: `${creator.userName} 为您分配了新任务: ${task.title}`,
        type: 'task_assigned',
        url: `/village/tasks/${task._id}`,
        recipients: assigneeIds,
        data: {
          taskId: task._id,
          taskTitle: task.title,
          creator: creator.userName,
          deadline: task.schedule.endDate
        }
      };

      await this.notificationService.sendNotification(notificationData);

    } catch (error) {
      logger.error('发送任务分配通知失败:', error);
    }
  }

  /**
   * 发送任务状态变更通知
   * @param {Object} task - 任务
   * @param {string} oldStatus - 旧状态
   * @param {string} newStatus - 新状态
   * @param {Object} updater - 更新者
   */
  async notifyTaskStatusChange(task, oldStatus, newStatus, updater) {
    try {
      const recipientIds = [
        ...task.assignees.map(a => a.userId),
        task.creator.userId,
        ...task.collaborators.map(c => c.userId)
      ];

      const notificationData = {
        title: '任务状态更新',
        content: `${updater.userName} 将任务 "${task.title}" 状态从 ${this.getStatusDisplayName(oldStatus)} 更新为 ${this.getStatusDisplayName(newStatus)}`,
        type: 'task_status_change',
        url: `/village/tasks/${task._id}`,
        recipients: recipientIds,
        data: {
          taskId: task._id,
          taskTitle: task.title,
          oldStatus,
          newStatus,
          updater: updater.userName
        }
      };

      await this.notificationService.sendNotification(notificationData);

    } catch (error) {
      logger.error('发送任务状态变更通知失败:', error);
    }
  }

  /**
   * 发送任务更新通知
   * @param {Object} task - 任务
   * @param {Object} update - 更新
   */
  async notifyTaskUpdate(task, update) {
    try {
      const recipientIds = [
        ...task.assignees.map(a => a.userId),
        task.creator.userId,
        ...task.collaborators.map(c => c.userId)
      ].filter(id => id.toString() !== update.author.userId.toString());

      if (recipientIds.length === 0) return;

      const notificationData = {
        title: '任务更新',
        content: `${update.author.userName} 更新了任务 "${task.title}": ${update.content.substring(0, 50)}...`,
        type: 'task_update',
        url: `/village/tasks/${task._id}#update-${update._id}`,
        recipients: recipientIds,
        data: {
          taskId: task._id,
          taskTitle: task.title,
          updateId: update._id,
          author: update.author.userName,
          updateType: update.type
        }
      };

      await this.notificationService.sendNotification(notificationData);

    } catch (error) {
      logger.error('发送任务更新通知失败:', error);
    }
  }

  /**
   * 计算协作分数
   * @param {Object} task - 任务
   * @returns {number} 协作分数
   */
  calculateCollaborationScore(task) {
    let score = 0;

    // 基础分数
    score += 20;

    // 更新频率（最多40分）
    const updateFrequency = task.statistics.totalUpdates;
    score += Math.min(40, updateFrequency * 5);

    // 参与人数（最多20分）
    const participantCount = task.assignees.length + task.collaborators.length;
    score += Math.min(20, participantCount * 5);

    // 附件数量（最多10分）
    score += Math.min(10, task.statistics.totalAttachments * 2);

    // 进度完成（最多10分）
    score += (task.progress / 100) * 10;

    return Math.min(100, score);
  }

  /**
   * 验证状态转换
   * @param {string} fromStatus - 起始状态
   * @param {string} toStatus - 目标状态
   * @returns {boolean} 是否有效
   */
  isValidStatusTransition(fromStatus, toStatus) {
    const validTransitions = {
      [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      [TaskStatus.COMPLETED]: [TaskStatus.PENDING], // 允许重新开启
      [TaskStatus.CANCELLED]: [TaskStatus.PENDING], // 允许重新开启
      [TaskStatus.OVERDUE]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.IN_PROGRESS]
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * 获取状态显示名称
   * @param {string} status - 状态
   * @returns {string} 显示名称
   */
  getStatusDisplayName(status) {
    const statusNames = {
      [TaskStatus.PENDING]: '待处理',
      [TaskStatus.IN_PROGRESS]: '进行中',
      [TaskStatus.COMPLETED]: '已完成',
      [TaskStatus.CANCELLED]: '已取消',
      [TaskStatus.OVERDUE]: '已逾期'
    };

    return statusNames[status] || status;
  }

  /**
   * 获取优先级显示名称
   * @param {string} priority - 优先级
   * @returns {string} 显示名称
   */
  getPriorityDisplayName(priority) {
    const priorityNames = {
      [TaskPriority.URGENT]: '紧急',
      [TaskPriority.HIGH]: '高',
      [TaskPriority.MEDIUM]: '中等',
      [TaskPriority.LOW]: '低'
    };

    return priorityNames[priority] || priority;
  }

  /**
   * 记录协作操作日志
   * @param {string} action - 操作类型
   * @param {string} targetId - 目标ID
   * @param {string} userId - 用户ID
   * @param {Object} details - 详情
   */
  logCollaborationAction(action, targetId, userId, details) {
    const logEntry = {
      timestamp: new Date(),
      action,
      targetId,
      userId,
      details,
      module: 'village_collaboration'
    };

    logger.info('协作操作日志:', logEntry);
  }
}

module.exports = VillageCollaborationService;