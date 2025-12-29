const mongoose = require("mongoose");

const ApprovalType = {
  FINANCE: "finance",
  PROJECT: "project",
  PROCUREMENT: "procurement",
  LEAVE: "leave",
  EXPENSE: "expense",
  DOCUMENT: "document",
  POLICY: "policy",
  OTHER: "other"
};

const ApprovalStatus = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled"
};

const NodeStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SKIPPED: "skipped"
};

const approvalRequestSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "CollabWorkspace", required: true, index: true },
  villageId: { type: mongoose.Schema.Types.ObjectId, ref: "Village", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },
  approvalType: { type: String, enum: Object.values(ApprovalType), required: true },
  status: { type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING, index: true },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  committeeMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "CommitteeMember" },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  workflow: {
    nodes: [{
      nodeId: { type: String, required: true },
      nodeName: { type: String, required: true },
      approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approverRole: String,
      order: { type: Number, required: true },
      type: { type: String, enum: ["serial", "parallel", "conditional"], default: "serial" },
      autoApprove: { type: Boolean, default: false }
    }],
    currentNodeIndex: { type: Number, default: 0 }
  },
  approvalRecords: [{
    nodeId: String,
    nodeName: String,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: Object.values(NodeStatus) },
    comments: String,
    processedAt: Date
  }],
  formData: mongoose.Schema.Types.Mixed,
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  amount: { type: Number, default: 0 },
  relatedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "TaskAssignment" },
  relatedMeetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting" },
  dueDate: { type: Date, index: true },
  tags: [{ type: String, maxlength: 20 }],
  ccUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  rejectionReason: { type: String, maxlength: 500 },
  completedAt: { type: Date },
  processingHours: { type: Number, default: 0 }
}, { timestamps: true, collection: "approvalRequests" });

approvalRequestSchema.index({ workspaceId: 1, status: 1 });
approvalRequestSchema.index({ "approvalRecords.approverId": 1, status: 1 });

approvalRequestSchema.methods.approve = function(approverId, comments) {
  const currentNode = this.workflow.nodes[this.workflow.currentNodeIndex];
  this.approvalRecords.push({
    nodeId: currentNode.nodeId,
    nodeName: currentNode.nodeName,
    approverId,
    status: NodeStatus.APPROVED,
    comments,
    processedAt: new Date()
  });
  
  if (this.workflow.currentNodeIndex >= this.workflow.nodes.length - 1) {
    this.status = ApprovalStatus.APPROVED;
    this.completedAt = new Date();
  } else {
    this.workflow.currentNodeIndex++;
  }
  return this.save();
};

approvalRequestSchema.methods.reject = function(approverId, reason) {
  const currentNode = this.workflow.nodes[this.workflow.currentNodeIndex];
  this.approvalRecords.push({
    nodeId: currentNode.nodeId,
    nodeName: currentNode.nodeName,
    approverId,
    status: NodeStatus.REJECTED,
    comments: reason,
    processedAt: new Date()
  });
  this.status = ApprovalStatus.REJECTED;
  this.rejectionReason = reason;
  this.completedAt = new Date();
  return this.save();
};

approvalRequestSchema.statics.getWorkspaceApprovals = function(workspaceId, options = {}) {
  const query = { workspaceId, ...options };
  return this.find(query).populate("applicantId", "name avatar").sort({ createdAt: -1 }).lean();
};

approvalRequestSchema.statics.getPendingApprovals = function(userId, options = {}) {
  const query = { status: ApprovalStatus.IN_PROGRESS, ...options };
  return this.find(query).populate("applicantId", "name avatar").sort({ createdAt: 1 }).lean();
};

const ApprovalRequest = mongoose.model("ApprovalRequest", approvalRequestSchema);

module.exports = { ApprovalRequest, ApprovalType, ApprovalStatus, NodeStatus };
