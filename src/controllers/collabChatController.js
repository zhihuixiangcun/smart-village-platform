/**
 * 协作群聊控制器
 * 处理村干部之间的协作沟通、任务分配、会议通知等群聊功能的HTTP请求
 */

const collabChatService = require('../services/collaboration/collabChatService');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== 协作空间群聊管理 ====================

/**
 * 创建协作空间群聊
 */
exports.createWorkspaceGroup = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const group = await collabChatService.createWorkspaceGroup(workspaceId, userId);

    return successResponse(res, group, '协作群聊创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取协作空间群聊
 */
exports.getWorkspaceGroup = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const group = await collabChatService.getWorkspaceGroup(workspaceId, userId);

    return successResponse(res, group);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 协作消息发送 ====================

/**
 * 发送任务分配消息
 */
exports.sendTaskAssignedMessage = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { workspaceId } = req.body;

    const message = await collabChatService.sendTaskAssignedMessage(taskId, workspaceId);

    return successResponse(res, message, '任务分配消息已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发送任务更新消息
 */
exports.sendTaskUpdatedMessage = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { updateType } = req.body;
    const userId = req.user.id;

    const message = await collabChatService.sendTaskUpdatedMessage(taskId, updateType, userId);

    return successResponse(res, message, '任务更新消息已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发送任务提醒消息
 */
exports.sendTaskReminderMessage = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reminderType } = req.body;

    const message = await collabChatService.sendTaskReminderMessage(taskId, reminderType);

    return successResponse(res, message, '任务提醒消息已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发送会议创建消息
 */
exports.sendMeetingCreatedMessage = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { workspaceId } = req.body;

    const message = await collabChatService.sendMeetingCreatedMessage(meetingId, workspaceId);

    return successResponse(res, message, '会议创建消息已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发送会议提醒消息
 */
exports.sendMeetingReminderMessage = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { minutesBefore } = req.body;

    const message = await collabChatService.sendMeetingReminderMessage(meetingId, minutesBefore);

    return successResponse(res, message, '会议提醒消息已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发送审批待处理消息
 */
exports.sendApprovalPendingMessage = async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { workspaceId } = req.body;

    const message = await collabChatService.sendApprovalPendingMessage(approvalId, workspaceId);

    return successResponse(res, message, '审批待处理消息已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发送工作空间通知
 */
exports.sendWorkspaceNotification = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { notificationType, content } = req.body;
    const userId = req.user.id;

    const message = await collabChatService.sendWorkspaceNotification(
      workspaceId,
      notificationType,
      content,
      userId
    );

    return successResponse(res, message, '工作空间通知已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发送系统消息
 */
exports.sendSystemMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;

    const message = await collabChatService.sendSystemMessage(groupId, content);

    return successResponse(res, message, '系统消息已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 快速操作处理 ====================

/**
 * 处理快速操作响应
 */
exports.handleQuickAction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { actionId } = req.body;
    const userId = req.user.id;

    const result = await collabChatService.handleQuickAction(messageId, actionId, userId);

    return successResponse(res, result, '操作已处理');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 消息查询 ====================

/**
 * 获取群聊消息列表
 */
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const options = {
      limit: parseInt(req.query.limit) || 50,
      beforeTime: req.query.beforeTime,
      afterTime: req.query.afterTime
    };

    const messages = await collabChatService.getGroupMessages(groupId, userId, options);

    return successResponse(res, messages);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取群聊未读消息数
 */
exports.getGroupUnreadCount = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const count = await collabChatService.getGroupUnreadCount(groupId, userId);

    return successResponse(res, { count });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取协作空间群聊消息列表
 */
exports.getWorkspaceGroupMessages = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const options = {
      limit: parseInt(req.query.limit) || 50,
      beforeTime: req.query.beforeTime,
      afterTime: req.query.afterTime
    };

    // 先获取群聊
    const group = await collabChatService.getWorkspaceGroup(workspaceId, userId);

    // 再获取消息列表
    const messages = await collabChatService.getGroupMessages(group._id, userId, options);

    return successResponse(res, messages);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 批量操作 ====================

/**
 * 批量发送工作空间摘要
 */
exports.sendWorkspaceSummary = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { summaryType } = req.body;

    const result = await collabChatService.sendWorkspaceSummary(workspaceId, summaryType);

    return successResponse(res, result, '工作空间摘要已发送');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 综合操作 ====================

/**
 * 创建任务并发送群聊通知
 */
exports.createTaskWithNotification = async (req, res) => {
  try {
    const taskWorkflowService = require('../services/collaboration/taskWorkflowService');
    const userId = req.user.id;
    const taskData = req.body;

    // 创建任务
    const task = await taskWorkflowService.createTask(taskData, userId);

    // 发送群聊通知
    await collabChatService.sendTaskAssignedMessage(task._id, taskData.workspaceId);

    return successResponse(res, task, '任务创建成功，群聊通知已发送', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建会议并发送群聊通知
 */
exports.createMeetingWithNotification = async (req, res) => {
  try {
    const meetingService = require('../services/collaboration/meetingService');
    const organizerId = req.user.id;
    const meetingData = req.body;

    // 创建会议
    const meeting = await meetingService.createMeeting(meetingData, organizerId);

    // 发送群聊通知
    await collabChatService.sendMeetingCreatedMessage(meeting._id, meetingData.workspaceId);

    return successResponse(res, meeting, '会议创建成功，群聊通知已发送', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建审批请求并发送群聊通知
 */
exports.createApprovalWithNotification = async (req, res) => {
  try {
    const approvalService = require('../services/collaboration/approvalService');
    const applicantId = req.user.id;
    const requestData = req.body;

    // 创建审批请求
    const approval = await approvalService.createApprovalRequest(requestData, applicantId);

    // 发送群聊通知
    await collabChatService.sendApprovalPendingMessage(approval._id, requestData.workspaceId);

    return successResponse(res, approval, '审批请求已创建，群聊通知已发送', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 统计信息 ====================

/**
 * 获取协作空间群聊统计
 */
exports.getWorkspaceChatStats = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const group = await collabChatService.getWorkspaceGroup(workspaceId, userId);

    const { ChatMessage } = require('../models/ChatMessage');

    const totalMessages = await ChatMessage.countDocuments({
      conversationId: `group-${group._id}`
    });

    const todayMessages = await ChatMessage.countDocuments({
      conversationId: `group-${group._id}`,
      sentAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    return successResponse(res, {
      groupId: group._id,
      groupName: group.name,
      memberCount: group.members.length,
      totalMessages,
      todayMessages
    });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
