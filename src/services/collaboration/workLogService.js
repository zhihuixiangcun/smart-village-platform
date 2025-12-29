const { WorkLog, WorkLogType, WorkLogStatus } = require("../../models/WorkLog");
const { CollabWorkspace } = require("../../models/CollabWorkspace");
const webSocketService = require("../../services/webSocketService");

exports.createWorkLog = async (logData, authorId) => {
  const { workspaceId, title, logType, period, content } = logData;

  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) throw new Error("协作空间不存在");

  const log = new WorkLog({
    workspaceId,
    villageId: workspace.villageId,
    authorId,
    title,
    logType,
    period,
    content,
    statistics: {
      tasksCompleted: content.completedTasks?.length || 0,
      tasksInProgress: content.ongoingTasks?.length || 0
    }
  });

  await log.save();
  return log.populate("authorId committeeMemberId");
};

exports.getWorkspaceLogs = async (workspaceId, userId, options = {}) => {
  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) throw new Error("协作空间不存在");

  const isMember = workspace.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember) throw new Error("无权访问此协作空间");

  return WorkLog.getWorkspaceLogs(workspaceId, options);
};

exports.getUserLogs = async (userId, options = {}) => {
  return WorkLog.getUserLogs(userId, options);
};

exports.getLogDetail = async (logId, userId) => {
  const log = await WorkLog.findById(logId)
    .populate("authorId", "name avatar")
    .populate("committeeMemberId", "position")
    .populate("review.reviewerId", "name")
    .lean();

  if (!log) throw new Error("工作日志不存在");

  const workspace = await CollabWorkspace.findById(log.workspaceId);
  const isMember = workspace.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember && log.authorId.toString() !== userId.toString()) {
    throw new Error("无权访问此日志");
  }

  return log;
};

exports.submitWorkLog = async (logId, userId) => {
  const log = await WorkLog.findById(logId);
  if (!log) throw new Error("工作日志不存在");

  if (log.authorId.toString() !== userId.toString()) {
    throw new Error("只能提交自己的日志");
  }

  await log.submit();

  // 通知审核人
  if (log.reviewerId && webSocketService) {
    webSocketService.broadcastToUser(log.reviewerId.toString(), {
      type: "work_log_submitted",
      data: {
        logId: log._id,
        title: log.title,
        authorId: log.authorId
      }
    });
  }

  return log.populate("authorId");
};

exports.reviewWorkLog = async (logId, reviewerId, comments, approved) => {
  const log = await WorkLog.findById(logId);
  if (!log) throw new Error("工作日志不存在");

  await log.review(reviewerId, comments, approved);

  // 通知作者
  if (webSocketService) {
    webSocketService.broadcastToUser(log.authorId.toString(), {
      type: "work_log_reviewed",
      data: {
        logId: log._id,
        approved,
        comments
      }
    });
  }

  return log.populate("authorId review.reviewerId");
};

exports.updateWorkLog = async (logId, userId, updates) => {
  const log = await WorkLog.findById(logId);
  if (!log) throw new Error("工作日志不存在");

  if (log.authorId.toString() !== userId.toString()) {
    throw new Error("只能修改自己的日志");
  }

  if (log.status !== WorkLogStatus.DRAFT) {
    throw new Error("只能修改草稿状态的日志");
  }

  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      log[key] = updates[key];
    }
  });

  await log.save();
  return log.populate("authorId");
};
