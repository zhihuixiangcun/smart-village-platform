const { ApprovalRequest, ApprovalType, ApprovalStatus } = require("../../models/ApprovalRequest");
const { CollabWorkspace } = require("../../models/CollabWorkspace");
const { TaskAssignment } = require("../../models/TaskAssignment");
const webSocketService = require("../../services/webSocketService");

exports.createApprovalRequest = async (requestData, applicantId) => {
  const { workspaceId, title, description, approvalType, workflow, formData, attachments, amount } = requestData;

  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) throw new Error("协作空间不存在");

  const request = new ApprovalRequest({
    workspaceId,
    villageId: workspace.villageId,
    title,
    description,
    approvalType,
    applicantId,
    workflow,
    formData,
    attachments: attachments || [],
    amount: amount || 0
  });

  await request.start();
  await _notifyNextApprover(request);
  return request.populate("applicantId");
};

exports.getWorkspaceApprovals = async (workspaceId, userId, options = {}) => {
  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) throw new Error("协作空间不存在");

  const isMember = workspace.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember) throw new Error("无权访问此协作空间");

  return ApprovalRequest.getWorkspaceApprovals(workspaceId, options);
};

exports.getPendingApprovals = async (userId, options = {}) => {
  return ApprovalRequest.getPendingApprovals(userId, options);
};

exports.getUserApplications = async (userId, options = {}) => {
  return ApprovalRequest.getUserApplications(userId, options);
};

exports.getApprovalDetail = async (approvalId, userId) => {
  const approval = await ApprovalRequest.findById(approvalId)
    .populate("applicantId", "name avatar")
    .populate("committeeMemberId", "position")
    .populate("approvalRecords.approverId", "name avatar")
    .populate("relatedTaskId")
    .lean();

  if (!approval) throw new Error("审批请求不存在");

  return approval;
};

exports.approveRequest = async (approvalId, approverId, comments) => {
  const approval = await ApprovalRequest.findById(approvalId);
  if (!approval) throw new Error("审批请求不存在");

  if (!approval.canApprove(approverId)) {
    throw new Error("当前用户无权审批此请求");
  }

  await approval.approve(approverId, comments);

  if (approval.status === ApprovalStatus.APPROVED) {
    await _handleApprovalCompleted(approval);
  } else {
    await _notifyNextApprover(approval);
  }

  return approval.populate("applicantId approvalRecords.approverId");
};

exports.rejectRequest = async (approvalId, approverId, reason) => {
  const approval = await ApprovalRequest.findById(approvalId);
  if (!approval) throw new Error("审批请求不存在");

  if (!approval.canApprove(approverId)) {
    throw new Error("当前用户无权审批此请求");
  }

  await approval.reject(approverId, reason);
  await _notifyApplicant(approval, "rejected");
  return approval.populate("applicantId approvalRecords.approverId");
};

exports.cancelRequest = async (approvalId, userId, reason) => {
  const approval = await ApprovalRequest.findById(approvalId);
  if (!approval) throw new Error("审批请求不存在");

  if (approval.applicantId.toString() !== userId.toString()) {
    throw new Error("只能取消自己的申请");
  }

  await approval.cancel(reason);
  return approval;
};

exports.getStatistics = async (workspaceId, userId, startDate, endDate) => {
  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) throw new Error("协作空间不存在");

  const isMember = workspace.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember) throw new Error("无权访问此协作空间");

  return ApprovalRequest.getStatistics(workspaceId, startDate, endDate);
};

async function _notifyNextApprover(approval) {
  const currentNode = approval.getCurrentNode();
  if (!currentNode || !currentNode.approverId) return;

  if (webSocketService && webSocketService.notifyApproval) {
    webSocketService.notifyApproval(currentNode.approverId.toString(), {
      approvalId: approval._id,
      title: approval.title,
      nodeName: currentNode.nodeName,
      type: "pending"
    });
  }
}

async function _notifyApplicant(approval, status) {
  if (webSocketService && webSocketService.notifyApproval) {
    webSocketService.notifyApproval(approval.applicantId.toString(), {
      approvalId: approval._id,
      title: approval.title,
      status,
      type: "completed"
    });
  }
}

async function _handleApprovalCompleted(approval) {
  await _notifyApplicant(approval, "approved");

  if (approval.relatedTaskId) {
    const task = await TaskAssignment.findById(approval.relatedTaskId);
    if (task && task.status === "review") {
      await task.review(true, "审批通过", approval.applicantId);
    }
  }
}
