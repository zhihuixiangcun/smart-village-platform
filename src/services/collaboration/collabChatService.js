/**
 * 协作群聊服务
 * 处理村干部之间的协作沟通、任务分配、会议通知等群聊功能
 */

const { ChatGroup, GroupType, GroupRole } = require('../../models/ChatGroup');
const { ChatMessage, MessageType, MessageStatus } = require('../../models/ChatMessage');
const { CollabWorkspace } = require('../../models/CollabWorkspace');
const { TaskAssignment } = require('../../models/TaskAssignment');
const { Meeting } = require('../../models/Meeting');
const { ApprovalRequest } = require('../../models/ApprovalRequest');
const webSocketService = require('../../services/webSocketService');

// ==================== 协作空间群聊管理 ====================

/**
 * 创建协作空间群聊
 */
exports.createWorkspaceGroup = async (workspaceId, creatorId) => {
  const workspace = await CollabWorkspace.findById(workspaceId)
    .populate('villageId', 'name')
    .populate('members.userId', 'name avatar')
    .lean();

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  // 检查是否已有群聊
  const existingGroup = await ChatGroup.findOne({
    workspaceId,
    groupType: GroupType.WORKSPACE
  });

  if (existingGroup) {
    return existingGroup;
  }

  // 创建群聊
  const group = new ChatGroup({
    name: `${workspace.name}协作群`,
    description: `${workspace.villageId?.name || '村庄'} - ${workspace.name}协作沟通群`,
    groupType: GroupType.WORKSPACE,
    workspaceId,
    villageId: workspace.villageId?._id,
    ownerId: creatorId,
    members: workspace.members.map(m => ({
      userId: m.userId,
      role: m.role === 'admin' ? GroupRole.ADMIN : GroupRole.MEMBER,
      joinedAt: new Date()
    })),
    settings: {
      allowInvite: false, // 只有管理员可以邀请
      allowKick: false,
      allowMute: false,
      allowAtAll: true,
      historyVisible: true,
      autoDelete: false
    }
  });

  await group.save();

  // 发送系统消息
  await this.sendSystemMessage(group._id, {
    text: `协作群聊已创建，欢迎加入！`,
    workspaceId: workspace._id,
    workspaceName: workspace.name
  });

  return group.populate('members.userId', 'name avatar');
};

/**
 * 获取协作空间群聊
 */
exports.getWorkspaceGroup = async (workspaceId, userId) => {
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

  let group = await ChatGroup.findOne({
    workspaceId,
    groupType: GroupType.WORKSPACE
  });

  // 如果群聊不存在，自动创建
  if (!group) {
    group = await this.createWorkspaceGroup(workspaceId, userId);
  }

  return group;
};

// ==================== 协作消息发送 ====================

/**
 * 发送任务分配消息
 */
exports.sendTaskAssignedMessage = async (taskId, workspaceId) => {
  const task = await TaskAssignment.findById(taskId)
    .populate('assigneeId', 'name avatar')
    .populate('assignerId', 'name avatar')
    .populate('workspaceId', 'name')
    .lean();

  if (!task) {
    throw new Error('任务不存在');
  }

  const group = await this.getWorkspaceGroup(workspaceId, task.assignerId._id);

  const message = new ChatMessage({
    conversationId: `group-${group._id}`,
    senderId: task.assignerId._id,
    groupId: group._id,
    messageType: MessageType.TASK_ASSIGNED,
    content: {
      text: `${task.assignerId.name} 分配了新任务「${task.title}」给 ${task.assigneeId.name}`
    },
    taskAssignment: {
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.deadline,
      assigneeName: task.assigneeId.name,
      status: task.status
    },
    taskId: task._id,
    workspaceId: task.workspaceId._id,
    quickActions: [
      {
        actionId: `task_accept_${task._id}`,
        text: '接受任务',
        type: 'accept_task',
        data: { taskId: task._id }
      },
      {
        actionId: `task_view_${task._id}`,
        text: '查看详情',
        type: 'view_detail',
        data: { taskId: task._id }
      }
    ],
    status: MessageStatus.SENT
  });

  await message.save();

  // 通知群组成员
  await this._notifyGroupMembers(group._id, message, task.assignerId._id);

  return message;
};

/**
 * 发送任务更新消息
 */
exports.sendTaskUpdatedMessage = async (taskId, updateType, userId) => {
  const task = await TaskAssignment.findById(taskId)
    .populate('assigneeId', 'name avatar')
    .lean();

  if (!task) {
    throw new Error('任务不存在');
  }

  const group = await this.getWorkspaceGroup(task.workspaceId, userId);

  const messages = {
    started: `${task.assigneeId.name} 开始了任务「${task.title}」`,
    progress: `${task.assigneeId.name} 更新了任务「${task.title}」进度：${task.progress}%`,
    completed: `${task.assigneeId.name} 完成了任务「${task.title}」`,
    cancelled: `任务「${task.title}」已取消`,
    overdue: `任务「${task.title}」已逾期`
  };

  const message = new ChatMessage({
    conversationId: `group-${group._id}`,
    senderId: userId,
    groupId: group._id,
    messageType: MessageType.TASK_UPDATED,
    content: {
      text: messages[updateType] || `任务「${task.title}」已更新`
    },
    taskId: task._id,
    workspaceId: task.workspaceId,
    quickActions: updateType === 'progress' ? [] : [
      {
        actionId: `task_view_${task._id}`,
        text: '查看详情',
        type: 'view_detail',
        data: { taskId: task._id }
      }
    ],
    status: MessageStatus.SENT
  });

  await message.save();
  await this._notifyGroupMembers(group._id, message, userId);

  return message;
};

/**
 * 发送任务提醒消息
 */
exports.sendTaskReminderMessage = async (taskId, reminderType = 'deadline') => {
  const task = await TaskAssignment.findById(taskId)
    .populate('assigneeId', 'name')
    .lean();

  if (!task) {
    throw new Error('任务不存在');
  }

  const group = await this.getWorkspaceGroup(task.workspaceId, task.assigneeId._id);

  const messages = {
    deadline: `⏰ 任务提醒：「${task.title}」即将到期，截止时间：${new Date(task.deadline).toLocaleString('zh-CN')}`,
    overdue: `⚠️ 逾期提醒：「${task.title}」已逾期 ${Math.ceil((Date.now() - task.deadline) / (1000 * 60 * 60 * 24))} 天`,
    today: `📅 今日任务：「${task.title}」需要在今天完成`
  };

  const message = new ChatMessage({
    conversationId: `group-${group._id}`,
    senderId: task.assigneeId._id,
    groupId: group._id,
    messageType: MessageType.TASK_REMINDER,
    content: {
      text: messages[reminderType] || messages.deadline
    },
    taskId: task._id,
    workspaceId: task.workspaceId,
    quickActions: [
      {
        actionId: `task_view_${task._id}`,
        text: '查看详情',
        type: 'view_detail',
        data: { taskId: task._id }
      }
    ],
    status: MessageStatus.SENT
  });

  await message.save();
  await this._notifyGroupMembers(group._id, message, task.assigneeId._id);

  return message;
};

/**
 * 发送会议创建消息
 */
exports.sendMeetingCreatedMessage = async (meetingId, workspaceId) => {
  const meeting = await Meeting.findById(meetingId)
    .populate('organizerId', 'name avatar')
    .populate('workspaceId', 'name')
    .lean();

  if (!meeting) {
    throw new Error('会议不存在');
  }

  const group = await this.getWorkspaceGroup(workspaceId, meeting.organizerId._id);

  const startTime = new Date(meeting.scheduledStart);
  const endTime = new Date(meeting.scheduledEnd);

  const message = new ChatMessage({
    conversationId: `group-${group._id}`,
    senderId: meeting.organizerId._id,
    groupId: group._id,
    messageType: MessageType.MEETING_CREATED,
    content: {
      text: `📅 ${meeting.organizerId.name} 发起了会议「${meeting.title}」\n时间：${startTime.toLocaleString('zh-CN')} - ${endTime.toLocaleString('zh-CN')}\n地点：${meeting.location || '线上'}`
    },
    meetingInvitation: {
      title: meeting.title,
      scheduledStart: meeting.scheduledStart,
      scheduledEnd: meeting.scheduledEnd,
      location: meeting.location,
      agenda: meeting.agenda
    },
    meetingId: meeting._id,
    workspaceId: meeting.workspaceId._id,
    quickActions: [
      {
        actionId: `meeting_accept_${meeting._id}`,
        text: '接受',
        type: 'accept_meeting',
        data: { meetingId: meeting._id }
      },
      {
        actionId: `meeting_decline_${meeting._id}`,
        text: '拒绝',
        type: 'decline_meeting',
        data: { meetingId: meeting._id }
      },
      {
        actionId: `meeting_view_${meeting._id}`,
        text: '查看详情',
        type: 'view_detail',
        data: { meetingId: meeting._id }
      }
    ],
    status: MessageStatus.SENT
  });

  await message.save();
  await this._notifyGroupMembers(group._id, message, meeting.organizerId._id);

  return message;
};

/**
 * 发送会议提醒消息
 */
exports.sendMeetingReminderMessage = async (meetingId, minutesBefore) => {
  const meeting = await Meeting.findById(meetingId).lean();

  if (!meeting) {
    throw new Error('会议不存在');
  }

  const group = await this.getWorkspaceGroup(meeting.workspaceId, meeting.organizerId);

  const message = new ChatMessage({
    conversationId: `group-${group._id}`,
    senderId: meeting.organizerId,
    groupId: group._id,
    messageType: MessageType.MEETING_REMINDER,
    content: {
      text: minutesBefore <= 15
        ? `⏰ 会议「${meeting.title}」即将在 ${minutesBefore} 分钟后开始！`
        : `📅 会议提醒：「${meeting.title}」将在 ${minutesBefore} 分钟后开始`
    },
    meetingId: meeting._id,
    workspaceId: meeting.workspaceId,
    quickActions: [
      {
        actionId: `meeting_view_${meeting._id}`,
        text: '查看详情',
        type: 'view_detail',
        data: { meetingId: meeting._id }
      }
    ],
    status: MessageStatus.SENT
  });

  await message.save();
  await this._notifyGroupMembers(group._id, message, meeting.organizerId);

  return message;
};

/**
 * 发送审批待处理消息
 */
exports.sendApprovalPendingMessage = async (approvalId, workspaceId) => {
  const approval = await ApprovalRequest.findById(approvalId)
    .populate('applicantId', 'name avatar')
    .populate('workspaceId', 'name')
    .lean();

  if (!approval) {
    throw new Error('审批请求不存在');
  }

  const currentNode = approval.approvalRecords?.[approval.approvalRecords.length - 1];
  const approverId = currentNode?.approverId;

  if (!approverId) {
    throw new Error('未找到审批人');
  }

  const group = await this.getWorkspaceGroup(workspaceId, approval.applicantId._id);

  const amountText = approval.amount > 0 ? `，金额：¥${approval.amount.toLocaleString()}` : '';

  const message = new ChatMessage({
    conversationId: `group-${group._id}`,
    senderId: approval.applicantId._id,
    groupId: group._id,
    messageType: MessageType.APPROVAL_PENDING,
    content: {
      text: `📋 ${approval.applicantId.name} 提交了审批申请「${approval.title}」${amountText}\n类型：${approval.approvalType}`
    },
    approvalNotification: {
      title: approval.title,
      approvalType: approval.approvalType,
      amount: approval.amount,
      applicantName: approval.applicantId.name,
      status: approval.status
    },
    approvalId: approval._id,
    workspaceId: approval.workspaceId._id,
    quickActions: [
      {
        actionId: `approval_approve_${approval._id}`,
        text: '同意',
        type: 'approve',
        data: { approvalId: approval._id }
      },
      {
        actionId: `approval_reject_${approval._id}`,
        text: '拒绝',
        type: 'reject',
        data: { approvalId: approval._id }
      },
      {
        actionId: `approval_view_${approval._id}`,
        text: '查看详情',
        type: 'view_detail',
        data: { approvalId: approval._id }
      }
    ],
    status: MessageStatus.SENT
  });

  await message.save();
  await this._notifyGroupMembers(group._id, message, approval.applicantId._id);

  return message;
};

/**
 * 发送工作空间通知
 */
exports.sendWorkspaceNotification = async (workspaceId, notificationType, content, senderId) => {
  const group = await this.getWorkspaceGroup(workspaceId, senderId);

  const message = new ChatMessage({
    conversationId: `group-${group._id}`,
    senderId,
    groupId: group._id,
    messageType: MessageType.WORKSPACE_NOTIF,
    content: {
      text: content.text || content
    },
    workspaceId,
    quickActions: content.quickActions || [],
    status: MessageStatus.SENT
  });

  await message.save();
  await this._notifyGroupMembers(group._id, message, senderId);

  return message;
};

/**
 * 发送系统消息
 */
exports.sendSystemMessage = async (groupId, content) => {
  const message = new ChatMessage({
    conversationId: `group-${groupId}`,
    senderId: null, // 系统消息没有发送者
    groupId,
    messageType: MessageType.SYSTEM,
    content: {
      text: content.text,
      system: content
    },
    status: MessageStatus.SENT
  });

  await message.save();
  await this._notifyGroupMembers(groupId, message);

  return message;
};

// ==================== 快速操作处理 ====================

/**
 * 处理快速操作响应
 */
exports.handleQuickAction = async (messageId, actionId, userId) => {
  const message = await ChatMessage.findById(messageId);

  if (!message) {
    throw new Error('消息不存在');
  }

  const action = message.quickActions?.find(a => a.actionId === actionId);
  if (!action) {
    throw new Error('操作不存在');
  }

  let result;

  switch (action.type) {
    case 'accept_task':
      result = await this._handleAcceptTask(action.data.taskId, userId);
      break;
    case 'decline_task':
      result = await this._handleDeclineTask(action.data.taskId, userId);
      break;
    case 'view_task':
      result = await this._handleViewTask(action.data.taskId, userId);
      break;
    case 'accept_meeting':
      result = await this._handleAcceptMeeting(action.data.meetingId, userId);
      break;
    case 'decline_meeting':
      result = await this._handleDeclineMeeting(action.data.meetingId, userId);
      break;
    case 'approve':
      result = await this._handleApprove(action.data.approvalId, userId);
      break;
    case 'reject':
      result = await this._handleReject(action.data.approvalId, userId);
      break;
    case 'view_detail':
      result = { action: 'view_detail', data: action.data };
      break;
    default:
      throw new Error('未知操作类型');
  }

  // 发送操作响应消息
  await this.sendActionResponseMessage(message.groupId, action, userId, result);

  return result;
};

/**
 * 发送操作响应消息
 */
exports.sendActionResponseMessage = async (groupId, action, userId, result) => {
  const responseTexts = {
    accept_task: '已接受任务',
    decline_task: '已拒绝任务',
    accept_meeting: '已接受会议邀请',
    decline_meeting: '已拒绝会议邀请',
    approve: '已同意审批',
    reject: '已拒绝审批'
  };

  const message = new ChatMessage({
    conversationId: `group-${groupId}`,
    senderId: userId,
    groupId,
    messageType: MessageType.NOTICE,
    content: {
      text: `${responseTexts[action.type] || '操作已完成'}: ${action.text}`
    },
    status: MessageStatus.SENT
  });

  await message.save();
  await this._notifyGroupMembers(groupId, message, userId);

  return message;
};

// ==================== 消息查询 ====================

/**
 * 获取群聊消息列表
 */
exports.getGroupMessages = async (groupId, userId, options = {}) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群聊不存在');
  }

  // 检查是否是群成员
  const isMember = group.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权查看此群聊消息');
  }

  const { limit = 50, beforeTime, afterTime } = options;

  return ChatMessage.getConversationMessages(
    `group-${groupId}`,
    { limit, beforeTime, afterTime }
  );
};

/**
 * 获取群聊未读消息数
 */
exports.getGroupUnreadCount = async (groupId, userId) => {
  return ChatMessage.getUnreadCount(userId, `group-${groupId}`);
};

// ==================== 私有辅助方法 ====================

/**
 * 通知群组成员
 */
exports._notifyGroupMembers = async (groupId, message, excludeUserId = null) => {
  const group = await ChatGroup.findById(groupId)
    .populate('members.userId', 'name')
    .lean();

  if (!group) return;

  const recipientIds = group.members
    .map(m => m.userId._id.toString())
    .filter(id => !excludeUserId || id !== excludeUserId.toString());

  if (webSocketService && webSocketService.notifyGroup) {
    webSocketService.notifyGroup(groupId.toString(), {
      type: 'new_message',
      messageId: message._id,
      groupId,
      messageType: message.messageType,
      content: message.content,
      senderId: message.senderId,
      sentAt: message.sentAt
    });
  }
};

/**
 * 处理接受任务
 */
exports._handleAcceptTask = async (taskId, userId) => {
  const taskWorkflowService = require('./taskWorkflowService');
  return await taskWorkflowService.startTask(taskId, userId);
};

/**
 * 处理拒绝任务
 */
exports._handleDeclineTask = async (taskId, userId) => {
  const taskWorkflowService = require('./taskWorkflowService');
  return await taskWorkflowService.cancelTask(taskId, '用户拒绝', userId);
};

/**
 * 处理查看任务
 */
exports._handleViewTask = async (taskId, userId) => {
  const taskWorkflowService = require('./taskWorkflowService');
  return await taskWorkflowService.getTaskDetail(taskId, userId);
};

/**
 * 处理接受会议
 */
exports._handleAcceptMeeting = async (meetingId, userId) => {
  const meetingService = require('./meetingService');
  return await meetingService.respondToMeeting(meetingId, userId, 'accepted');
};

/**
 * 处理拒绝会议
 */
exports._handleDeclineMeeting = async (meetingId, userId) => {
  const meetingService = require('./meetingService');
  return await meetingService.respondToMeeting(meetingId, userId, 'declined');
};

/**
 * 处理同意审批
 */
exports._handleApprove = async (approvalId, userId) => {
  const approvalService = require('./approvalService');
  return await approvalService.approveRequest(approvalId, userId, '同意');
};

/**
 * 处理拒绝审批
 */
exports._handleReject = async (approvalId, userId) => {
  const approvalService = require('./approvalService');
  return await approvalService.rejectRequest(approvalId, userId, '拒绝');
};

// ==================== 批量操作 ====================

/**
 * 批量发送工作空间摘要
 */
exports.sendWorkspaceSummary = async (workspaceId, summaryType) => {
  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const group = await this.getWorkspaceGroup(workspaceId, workspace.members[0].userId);

  let content = { text: '', quickActions: [] };

  switch (summaryType) {
    case 'daily':
      const todayTasks = await TaskAssignment.getTodayDueTasks(workspaceId);
      const overdueTasks = await TaskAssignment.getOverdueTasks(workspaceId);
      content.text = `📊 每日工作摘要\n\n今日到期任务：${todayTasks.length}个\n逾期任务：${overdueTasks.length}个`;
      break;
    case 'weekly':
      const stats = await TaskAssignment.getStatistics(workspaceId);
      content.text = `📈 周工作摘要\n\n已完成：${stats.completed}个\n进行中：${stats.inProgress}个\n待处理：${stats.assigned}个`;
      break;
    default:
      throw new Error('未知摘要类型');
  }

  return await this.sendWorkspaceNotification(
    workspaceId,
    'summary',
    content,
    workspace.members[0].userId
  );
};
