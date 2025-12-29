/**
 * 任务工作流服务
 * 处理任务分配、跟踪和管理的业务逻辑
 */

const { TaskAssignment, TaskType, TaskPriority, TaskStatus } = require('../../models/TaskAssignment');
const { CollabWorkspace } = require('../../models/CollabWorkspace');
const { CommitteeMember } = require('../../models/CommitteeMember');
const webSocketService = require('../webSocketService');

// ==================== 任务创建与分配 ====================

/**
 * 创建任务
 */
exports.createTask = async (taskData, creatorId) => {
  const {
    workspaceId,
    title,
    description,
    taskType = TaskType.ROUTINE,
    priority = TaskPriority.MEDIUM,
    assigneeId,
    deadline,
    estimatedHours,
    tags,
    location,
    relatedMeetingId,
    parentTaskId,
    checkpoints,
    recurrence
  } = taskData;

  // 验证协作空间存在且有权限
  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const hasPermission = workspace.checkPermission(creatorId, 'task:create');
  if (!hasPermission) {
    throw new Error('无权限在此协作空间创建任务');
  }

  // 验证被分配人是协作空间成员
  const assigneeMember = workspace.members.find(
    m => m.userId.toString() === assigneeId.toString()
  );
  if (!assigneeMember) {
    throw new Error('被分配人不是协作空间成员');
  }

  // 创建任务
  const task = new TaskAssignment({
    workspaceId,
    villageId: workspace.villageId,
    title,
    description,
    taskType,
    priority,
    assignerId: creatorId,
    assigneeId,
    deadline,
    estimatedHours,
    tags,
    location,
    relatedMeetingId,
    parentTaskId,
    checkpoints: checkpoints || [],
    recurrence,
    status: TaskStatus.ASSIGNED
  });

  await task.save();

  // 如果是子任务，更新父任务的子任务列表
  if (parentTaskId) {
    const parentTask = await TaskAssignment.findById(parentTaskId);
    if (parentTask) {
      parentTask.subtaskIds.push(task._id);
      await parentTask.save();
    }
  }

  // 发送通知
  await this._notifyAssignee(task, assigneeId, 'task_assigned');

  return task.populate('assigneeId assignerId workspaceId parentTaskId');
};

/**
 * 批量创建任务（从会议纪要等场景）
 */
exports.batchCreateTasks = async (tasksData, creatorId) => {
  const results = [];
  const errors = [];

  for (const taskData of tasksData) {
    try {
      const task = await this.createTask(taskData, creatorId);
      results.push({ success: true, task });
    } catch (error) {
      errors.push({ taskData, error: error.message });
    }
  }

  return {
    created: results.length,
    failed: errors.length,
    results,
    errors
  };
};

// ==================== 任务状态管理 ====================

/**
 * 开始任务
 */
exports.startTask = async (taskId, userId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  // 验证操作权限
  if (task.assigneeId.toString() !== userId.toString()) {
    throw new Error('只有任务负责人才能开始任务');
  }

  await task.start();

  // 发送通知
  await this._notifyTaskUpdate(task, 'task_started', userId);

  return task.populate('assigneeId assignerId');
};

/**
 * 更新任务进度
 */
exports.updateProgress = async (taskId, progress, userId, comment = '') => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.assigneeId.toString() !== userId.toString()) {
    throw new Error('只有任务负责人才能更新进度');
  }

  await task.updateProgress(progress, userId);

  // 如果有评论，添加反馈
  if (comment) {
    await task.addFeedback(userId, comment);
  }

  // 如果进度100%，发送完成通知
  if (progress === 100) {
    await this._notifyTaskUpdate(task, 'task_completed', userId);
  } else {
    await this._notifyTaskUpdate(task, 'task_progress_updated', userId);
  }

  return task.populate('assigneeId assignerId');
};

/**
 * 完成任务
 */
exports.completeTask = async (taskId, actualHours, userId, summary = '') => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.assigneeId.toString() !== userId.toString()) {
    throw new Error('只有任务负责人才能完成任务');
  }

  await task.complete(actualHours, userId);

  // 添加完成总结
  if (summary) {
    await task.addFeedback(userId, `任务完成总结: ${summary}`);
  }

  // 检查父任务进度
  if (task.parentTaskId) {
    await this._updateParentTaskProgress(task.parentTaskId);
  }

  await this._notifyTaskUpdate(task, 'task_completed', userId);

  return task.populate('assigneeId assignerId');
};

/**
 * 取消任务
 */
exports.cancelTask = async (taskId, reason, userId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  // 验证权限（分配人或负责人可以取消）
  if (task.assignerId.toString() !== userId.toString() &&
      task.assigneeId.toString() !== userId.toString()) {
    throw new Error('无权限取消此任务');
  }

  await task.cancel(reason, userId);

  await this._notifyTaskUpdate(task, 'task_cancelled', userId);

  return task.populate('assigneeId assignerId');
};

/**
 * 重新分配任务
 */
exports.reassignTask = async (taskId, newAssigneeId, operatorId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  // 验证操作权限
  if (task.assignerId.toString() !== operatorId.toString()) {
    throw new Error('只有任务分配者才能重新分配');
  }

  const oldAssigneeId = task.assigneeId;
  await task.assign(newAssigneeId, operatorId);

  // 添加反馈记录
  await task.addFeedback(operatorId, `任务重新分配: 从 ${oldAssigneeId} 到 ${newAssigneeId}`);

  // 通知新负责人
  await this._notifyAssignee(task, newAssigneeId, 'task_reassigned');

  return task.populate('assigneeId assignerId');
};

// ==================== 检查点管理 ====================

/**
 * 添加检查点
 */
exports.addCheckpoint = async (taskId, checkpointData, userId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  // 验证权限
  if (task.assignerId.toString() !== userId.toString() &&
      task.assigneeId.toString() !== userId.toString()) {
    throw new Error('无权限添加检查点');
  }

  await task.addCheckpoint(checkpointData);

  return task.populate('assigneeId assignerId');
};

/**
 * 完成检查点
 */
exports.completeCheckpoint = async (taskId, checkpointId, userId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.assigneeId.toString() !== userId.toString()) {
    throw new Error('只有任务负责人才能完成检查点');
  }

  await task.completeCheckpoint(checkpointId);

  await this._notifyTaskUpdate(task, 'checkpoint_completed', userId);

  return task.populate('assigneeId assignerId');
};

/**
 * 更新检查点
 */
exports.updateCheckpoint = async (taskId, checkpointId, updates, userId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.assignerId.toString() !== userId.toString() &&
      task.assigneeId.toString() !== userId.toString()) {
    throw new Error('无权限修改检查点');
  }

  await task.updateCheckpoint(checkpointId, updates);

  return task.populate('assigneeId assignerId');
};

// ==================== 子任务管理 ====================

/**
 * 创建子任务
 */
exports.createSubtask = async (parentTaskId, subtaskData, userId) => {
  const parentTask = await TaskAssignment.findById(parentTaskId);

  if (!parentTask) {
    throw new Error('父任务不存在');
  }

  // 验证权限
  if (parentTask.assignerId.toString() !== userId.toString() &&
      parentTask.assigneeId.toString() !== userId.toString()) {
    throw new Error('无权限创建子任务');
  }

  const subtask = await parentTask.createSubtask(subtaskData);

  // 更新父任务的子任务列表
  parentTask.subtaskIds.push(subtask._id);
  await parentTask.save();

  return subtask.populate('assigneeId assignerId parentTaskId');
};

/**
 * 获取子任务列表
 */
exports.getSubtasks = async (parentTaskId, userId) => {
  const parentTask = await TaskAssignment.findById(parentTaskId);

  if (!parentTask) {
    throw new Error('父任务不存在');
  }

  return parentTask.getSubtasks();
};

// ==================== 关注与反馈 ====================

/**
 * 添加关注人
 */
exports.addWatcher = async (taskId, watcherId, operatorId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  await task.addWatcher(watcherId);

  return { success: true, message: '已添加关注人' };
};

/**
 * 移除关注人
 */
exports.removeWatcher = async (taskId, watcherId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  await task.removeWatcher(watcherId);

  return { success: true, message: '已移除关注人' };
};

/**
 * 添加反馈
 */
exports.addFeedback = async (taskId, userId, content, attachments = []) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  await task.addFeedback(userId, content, attachments);

  // 通知相关人员
  await this._notifyTaskUpdate(task, 'task_feedback', userId);

  return task.populate('assigneeId assignerId');
};

// ==================== 审核流程 ====================

/**
 * 提交审核
 */
exports.submitForReview = async (taskId, userId, reviewerId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.assigneeId.toString() !== userId.toString()) {
    throw new Error('只有任务负责人才能提交审核');
  }

  await task.submitForReview(reviewerId);

  await this._notifyTaskUpdate(task, 'task_submitted_for_review', userId, { reviewerId });

  return task.populate('assigneeId assignerId review.reviewerId');
};

/**
 * 审核任务
 */
exports.reviewTask = async (taskId, approved, comments, reviewerId) => {
  const task = await TaskAssignment.findById(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (!task.review.required || task.review.reviewerId.toString() !== reviewerId.toString()) {
    throw new Error('无权限审核此任务');
  }

  await task.review(approved, comments, reviewerId);

  await this._notifyTaskUpdate(
    task,
    approved ? 'task_approved' : 'task_rejected',
    reviewerId
  );

  return task.populate('assigneeId assignerId review.reviewerId');
};

// ==================== 任务查询 ====================

/**
 * 获取任务详情
 */
exports.getTaskDetail = async (taskId, userId) => {
  const task = await TaskAssignment.findById(taskId)
    .populate('assigneeId', 'name avatar')
    .populate('assignerId', 'name avatar')
    .populate('workspaceId', 'name')
    .populate('parentTaskId', 'title status')
    .populate('relatedMeetingId', 'title scheduledStart')
    .populate('watchers', 'name avatar')
    .populate('feedbacks.userId', 'name avatar')
    .lean();

  if (!task) {
    throw new Error('任务不存在');
  }

  // 检查访问权限
  const workspace = await CollabWorkspace.findById(task.workspaceId._id);
  const isMember = workspace.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权访问此任务');
  }

  // 获取子任务
  if (task.subtaskIds && task.subtaskIds.length > 0) {
    task.subtasks = await TaskAssignment.find({
      _id: { $in: task.subtaskIds }
    })
      .populate('assigneeId', 'name avatar')
      .populate('assignerId', 'name avatar')
      .lean();
  }

  return task;
};

/**
 * 获取工作空间任务列表
 */
exports.getWorkspaceTasks = async (workspaceId, userId, options = {}) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const isMember = workspace.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权访问此协作空间的任务');
  }

  return TaskAssignment.getWorkspaceTasks(workspaceId, options);
};

/**
 * 获取用户的任务列表
 */
exports.getUserTasks = async (userId, options = {}) => {
  return TaskAssignment.getUserTasks(userId, options);
};

/**
 * 获取逾期任务
 */
exports.getOverdueTasks = async (workspaceId, userId) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const isMember = workspace.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权访问此协作空间');
  }

  return TaskAssignment.getOverdueTasks(workspaceId);
};

/**
 * 获取今日到期任务
 */
exports.getTodayDueTasks = async (workspaceId, userId) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const isMember = workspace.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权访问此协作空间');
  }

  return TaskAssignment.getTodayDueTasks(workspaceId);
};

/**
 * 搜索任务
 */
exports.searchTasks = async (workspaceId, userId, keyword, options = {}) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const isMember = workspace.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权搜索此协作空间的任务');
  }

  return TaskAssignment.searchTasks(workspaceId, keyword, options);
};

/**
 * 获取任务统计
 */
exports.getTaskStatistics = async (workspaceId, userId) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const isMember = workspace.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权访问此协作空间的统计数据');
  }

  return TaskAssignment.getStatistics(workspaceId);
};

/**
 * 获取任务日历视图
 */
exports.getCalendarView = async (workspaceId, userId, startDate, endDate) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const isMember = workspace.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权访问此协作空间的日历');
  }

  return TaskAssignment.getCalendarView(workspaceId, startDate, endDate);
};

// ==================== 私有辅助方法 ====================

/**
 * 更新父任务进度
 */
exports._updateParentTaskProgress = async (parentTaskId) => {
  const parentTask = await TaskAssignment.findById(parentTaskId);
  if (!parentTask) return;

  const subtasks = await TaskAssignment.find({ parentTaskId });
  if (subtasks.length === 0) return;

  // 计算子任务平均进度
  const totalProgress = subtasks.reduce((sum, task) => sum + task.progress, 0);
  const avgProgress = Math.round(totalProgress / subtasks.length);

  await parentTask.updateProgress(avgProgress, parentTask.assigneeId);
};

/**
 * 通知任务分配
 */
exports._notifyAssignee = async (task, assigneeId, eventType) => {
  const notifications = {
    task_assigned: '新任务分配',
    task_reassigned: '任务重新分配'
  };

  const message = notifications[eventType];
  if (!message) return;

  // 通过WebSocket发送通知
  if (webSocketService && webSocketService.notifyTask) {
    webSocketService.notifyTask(assigneeId.toString(), {
      taskId: task._id,
      title: task.title,
      message: `${message}: ${task.title}`,
      deadline: task.deadline,
      priority: task.priority
    });
  }
};

/**
 * 通知任务更新
 */
exports._notifyTaskUpdate = async (task, eventType, userId, extraData = {}) => {
  const notifications = {
    task_started: {
      title: '任务已开始',
      message: `任务"${task.title}"已开始执行`
    },
    task_completed: {
      title: '任务已完成',
      message: `任务"${task.title}"已完成`
    },
    task_cancelled: {
      title: '任务已取消',
      message: `任务"${task.title}"已取消`
    },
    task_progress_updated: {
      title: '任务进度更新',
      message: `任务"${task.title}"进度已更新`
    },
    checkpoint_completed: {
      title: '检查点完成',
      message: `任务"${task.title}"的检查点已完成`
    },
    task_feedback: {
      title: '新反馈',
      message: `任务"${task.title}"收到新反馈`
    },
    task_submitted_for_review: {
      title: '任务提交审核',
      message: `任务"${task.title}"已提交审核`
    },
    task_approved: {
      title: '任务审核通过',
      message: `任务"${task.title}"已通过审核`
    },
    task_rejected: {
      title: '任务审核拒绝',
      message: `任务"${task.title}"未通过审核`
    }
  };

  const notification = notifications[eventType];
  if (!notification) return;

  // 通知任务分配者和所有关注人
  const notifyUserIds = [task.assignerId, ...task.watchers];

  if (webSocketService && webSocketService.notifyWorkspace) {
    webSocketService.notifyWorkspace(task.workspaceId.toString(), {
      type: 'task_update',
      data: {
        ...notification,
        taskId: task._id,
        userId,
        ...extraData
      }
    });
  }
};

// ==================== 定时任务 ====================

/**
 * 检查并发送任务到期提醒（定时任务）
 */
exports.checkDueReminders = async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 查找24小时内到期的任务
  const dueTasks = await TaskAssignment.find({
    status: { $in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] },
    deadline: { $gte: now, $lte: tomorrow },
    'reminders.sent': false
  }).populate('assigneeId', 'name');

  const notifications = [];

  for (const task of dueTasks) {
    for (const reminder of task.reminders) {
      if (reminder.sent) continue;

      const shouldSend = reminder.type === 'deadline'
        ? (task.deadline - now) <= reminder.minutesBefore * 60 * 1000
        : reminder.customDate && (reminder.customDate - now) <= reminder.minutesBefore * 60 * 1000;

      if (shouldSend) {
        // 发送提醒
        if (webSocketService && webSocketService.notifyTask) {
          webSocketService.notifyTask(task.assigneeId._id.toString(), {
            taskId: task._id,
            title: task.title,
            message: `任务"${task.title}"将在${reminder.type === 'deadline' ? reminder.minutesBefore + '分钟' : '指定时间'}后到期`,
            deadline: task.deadline
          });
        }

        reminder.sent = true;
        notifications.push({
          taskId: task._id,
          assigneeId: task.assigneeId._id
        });
      }
    }

    await task.save();
  }

  return {
    checked: dueTasks.length,
    sent: notifications.length
  };
};

/**
 * 生成循环任务（定时任务）
 */
exports.generateRecurringTasks = async () => {
  const now = new Date();

  // 查找需要生成下次任务的循环任务
  const recurringTasks = await TaskAssignment.find({
    'recurrence.enabled': true,
    'recurrence.endDate': { $gte: now },
    status: TaskStatus.COMPLETED
  });

  const generatedTasks = [];

  for (const task of recurringTasks) {
    const { recurrence } = task;
    const lastGenerated = recurrence.lastGeneratedAt || task.completedAt;

    let shouldGenerate = false;
    let nextDueDate = new Date(lastGenerated);

    switch (recurrence.frequency) {
      case 'daily':
        nextDueDate.setDate(nextDueDate.getDate() + recurrence.interval);
        break;
      case 'weekly':
        nextDueDate.setDate(nextDueDate.getDate() + (7 * recurrence.interval));
        break;
      case 'monthly':
        nextDueDate.setMonth(nextDueDate.getMonth() + recurrence.interval);
        break;
      case 'yearly':
        nextDueDate.setFullYear(nextDueDate.getFullYear() + recurrence.interval);
        break;
    }

    if (nextDueDate <= now) {
      shouldGenerate = true;
    }

    if (shouldGenerate && nextDueDate <= recurrence.endDate) {
      // 创建新任务
      const newTask = new TaskAssignment({
        workspaceId: task.workspaceId,
        villageId: task.villageId,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        priority: task.priority,
        assignerId: task.assignerId,
        assigneeId: task.assigneeId,
        deadline: nextDueDate,
        estimatedHours: task.estimatedHours,
        tags: task.tags,
        location: task.location,
        checkpoints: task.checkpoints.map(cp => ({
          ...cp,
          completed: false,
          completedAt: null
        })),
        recurrence,
        status: TaskStatus.ASSIGNED
      });

      await newTask.save();

      // 更新原任务的最后生成时间
      recurrence.lastGeneratedAt = now;
      await task.save();

      generatedTasks.push({
        originalTaskId: task._id,
        newTaskId: newTask._id,
        nextDueDate
      });
    }
  }

  return {
    generated: generatedTasks.length
  };
};
