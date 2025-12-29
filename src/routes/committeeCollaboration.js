/**
 * 村委协作空间和任务管理路由
 * 定义村委内部协作平台的API端点
 */

const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const { authenticate } = require('../middleware/auth');

// 所有路由需要身份验证
router.use(authenticate);

// ==================== 协作空间管理 ====================

/**
 * @route   POST /api/v1/committee-collab/workspaces
 * @desc    创建协作空间
 * @access  Committee Member
 */
router.post('/workspaces', collaborationController.createWorkspace);

/**
 * @route   GET /api/v1/committee-collab/workspaces
 * @desc    获取用户的协作空间列表
 * @access  Authenticated
 */
router.get('/workspaces', collaborationController.getUserWorkspaces);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId
 * @desc    获取协作空间详情
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId', collaborationController.getWorkspaceDetail);

/**
 * @route   PUT /api/v1/committee-collab/workspaces/:workspaceId
 * @desc    更新协作空间
 * @access  Workspace Admin
 */
router.put('/workspaces/:workspaceId', collaborationController.updateWorkspace);

/**
 * @route   DELETE /api/v1/committee-collab/workspaces/:workspaceId
 * @desc    归档协作空间
 * @access  Workspace Creator
 */
router.delete('/workspaces/:workspaceId', collaborationController.archiveWorkspace);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/stats
 * @desc    获取协作空间统计
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/stats', collaborationController.getWorkspaceStats);

/**
 * @route   GET /api/v1/committee-collab/villages/:villageId/stats
 * @desc    获取村庄统计
 * @access  Village Committee
 */
router.get('/villages/:villageId/stats', collaborationController.getVillageStats);

// ==================== 成员管理 ====================

/**
 * @route   POST /api/v1/committee-collab/workspaces/:workspaceId/members
 * @desc    添加成员
 * @access  Workspace Admin
 */
router.post('/workspaces/:workspaceId/members', collaborationController.addMember);

/**
 * @route   DELETE /api/v1/committee-collab/workspaces/:workspaceId/members/:memberId
 * @desc    移除成员
 * @access  Workspace Admin
 */
router.delete('/workspaces/:workspaceId/members/:memberId', collaborationController.removeMember);

/**
 * @route   PUT /api/v1/committee-collab/workspaces/:workspaceId/members/:memberId/role
 * @desc    更新成员角色
 * @access  Workspace Admin
 */
router.put('/workspaces/:workspaceId/members/:memberId/role', collaborationController.updateMemberRole);

/**
 * @route   POST /api/v1/committee-collab/workspaces/:workspaceId/activity
 * @desc    更新成员活跃时间
 * @access  Workspace Member
 */
router.post('/workspaces/:workspaceId/activity', collaborationController.updateMemberActivity);

// ==================== 任务管理 ====================

/**
 * @route   POST /api/v1/committee-collab/tasks
 * @desc    创建任务
 * @access  Workspace Admin
 */
router.post('/tasks', collaborationController.createTask);

/**
 * @route   POST /api/v1/committee-collab/tasks/batch
 * @desc    批量创建任务
 * @access  Workspace Admin
 */
router.post('/tasks/batch', collaborationController.batchCreateTasks);

/**
 * @route   GET /api/v1/committee-collab/tasks/:taskId
 * @desc    获取任务详情
 * @access  Workspace Member
 */
router.get('/tasks/:taskId', collaborationController.getTaskDetail);

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/start
 * @desc    开始任务
 * @access  Task Assignee
 */
router.post('/tasks/:taskId/start', collaborationController.startTask);

/**
 * @route   PUT /api/v1/committee-collab/tasks/:taskId/progress
 * @desc    更新任务进度
 * @access  Task Assignee
 */
router.put('/tasks/:taskId/progress', collaborationController.updateProgress);

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/complete
 * @desc    完成任务
 * @access  Task Assignee
 */
router.post('/tasks/:taskId/complete', collaborationController.completeTask);

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/cancel
 * @desc    取消任务
 * @access  Task Assigner/Assignee
 */
router.post('/tasks/:taskId/cancel', collaborationController.cancelTask);

/**
 * @route   PUT /api/v1/committee-collab/tasks/:taskId/reassign
 * @desc    重新分配任务
 * @access  Task Assigner
 */
router.put('/tasks/:taskId/reassign', collaborationController.reassignTask);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/tasks
 * @desc    获取工作空间任务列表
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/tasks', collaborationController.getWorkspaceTasks);

/**
 * @route   GET /api/v1/committee-collab/users/tasks
 * @desc    获取用户的任务列表
 * @access  Authenticated
 */
router.get('/users/tasks', collaborationController.getUserTasks);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/tasks/overdue
 * @desc    获取逾期任务
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/tasks/overdue', collaborationController.getOverdueTasks);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/tasks/today
 * @desc    获取今日到期任务
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/tasks/today', collaborationController.getTodayDueTasks);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/tasks/search
 * @desc    搜索任务
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/tasks/search', collaborationController.searchTasks);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/tasks/statistics
 * @desc    获取任务统计
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/tasks/statistics', collaborationController.getTaskStatistics);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/tasks/calendar
 * @desc    获取任务日历视图
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/tasks/calendar', collaborationController.getCalendarView);

// ==================== 检查点管理 ====================

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/checkpoints
 * @desc    添加检查点
 * @access  Task Assigner/Assignee
 */
router.post('/tasks/:taskId/checkpoints', collaborationController.addCheckpoint);

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/checkpoints/:checkpointId/complete
 * @desc    完成检查点
 * @access  Task Assignee
 */
router.post('/tasks/:taskId/checkpoints/:checkpointId/complete', collaborationController.completeCheckpoint);

/**
 * @route   PUT /api/v1/committee-collab/tasks/:taskId/checkpoints/:checkpointId
 * @desc    更新检查点
 * @access  Task Assigner/Assignee
 */
router.put('/tasks/:taskId/checkpoints/:checkpointId', collaborationController.updateCheckpoint);

// ==================== 子任务管理 ====================

/**
 * @route   POST /api/v1/committee-collab/tasks/:parentTaskId/subtasks
 * @desc    创建子任务
 * @access  Task Assigner/Assignee
 */
router.post('/tasks/:parentTaskId/subtasks', collaborationController.createSubtask);

/**
 * @route   GET /api/v1/committee-collab/tasks/:parentTaskId/subtasks
 * @desc    获取子任务列表
 * @access  Workspace Member
 */
router.get('/tasks/:parentTaskId/subtasks', collaborationController.getSubtasks);

// ==================== 关注与反馈 ====================

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/watchers
 * @desc    添加关注人
 * @access  Workspace Member
 */
router.post('/tasks/:taskId/watchers', collaborationController.addWatcher);

/**
 * @route   DELETE /api/v1/committee-collab/tasks/:taskId/watchers/:watcherId
 * @desc    移除关注人
 * @access  Authenticated
 */
router.delete('/tasks/:taskId/watchers/:watcherId', collaborationController.removeWatcher);

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/feedbacks
 * @desc    添加反馈
 * @access  Workspace Member
 */
router.post('/tasks/:taskId/feedbacks', collaborationController.addFeedback);

// ==================== 审核流程 ====================

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/submit-review
 * @desc    提交审核
 * @access  Task Assignee
 */
router.post('/tasks/:taskId/submit-review', collaborationController.submitForReview);

/**
 * @route   POST /api/v1/committee-collab/tasks/:taskId/review
 * @desc    审核任务
 * @access  Reviewer
 */
router.post('/tasks/:taskId/review', collaborationController.reviewTask);

// ==================== 会议管理 ====================

/**
 * @route   POST /api/v1/committee-collab/meetings
 * @desc    创建会议
 * @access  Workspace Member
 */
router.post('/meetings', collaborationController.createMeeting);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/meetings
 * @desc    获取工作空间会议列表
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/meetings', collaborationController.getWorkspaceMeetings);

/**
 * @route   GET /api/v1/committee-collab/users/meetings
 * @desc    获取用户的会议列表
 * @access  Authenticated
 */
router.get('/users/meetings', collaborationController.getUserMeetings);

/**
 * @route   GET /api/v1/committee-collab/meetings/:meetingId
 * @desc    获取会议详情
 * @access  Workspace Member
 */
router.get('/meetings/:meetingId', collaborationController.getMeetingDetail);

/**
 * @route   POST /api/v1/committee-collab/meetings/:meetingId/respond
 * @desc    响应会议邀请
 * @access  Participant
 */
router.post('/meetings/:meetingId/respond', collaborationController.respondToMeeting);

/**
 * @route   POST /api/v1/committee-collab/meetings/:meetingId/start
 * @desc    开始会议
 * @access  Organizer
 */
router.post('/meetings/:meetingId/start', collaborationController.startMeeting);

/**
 * @route   POST /api/v1/committee-collab/meetings/:meetingId/end
 * @desc    结束会议
 * @access  Organizer
 */
router.post('/meetings/:meetingId/end', collaborationController.endMeeting);

/**
 * @route   POST /api/v1/committee-collab/meetings/:meetingId/minutes
 * @desc    添加会议纪要
 * @access  Organizer
 */
router.post('/meetings/:meetingId/minutes', collaborationController.addMeetingMinutes);

// ==================== 工作日志管理 ====================

/**
 * @route   POST /api/v1/committee-collab/work-logs
 * @desc    创建工作日志
 * @access  Workspace Member
 */
router.post('/work-logs', collaborationController.createWorkLog);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/work-logs
 * @desc    获取工作空间日志列表
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/work-logs', collaborationController.getWorkspaceLogs);

/**
 * @route   GET /api/v1/committee-collab/users/work-logs
 * @desc    获取用户的日志列表
 * @access  Authenticated
 */
router.get('/users/work-logs', collaborationController.getUserLogs);

/**
 * @route   GET /api/v1/committee-collab/work-logs/:logId
 * @desc    获取工作日志详情
 * @access  Workspace Member
 */
router.get('/work-logs/:logId', collaborationController.getWorkLogDetail);

/**
 * @route   POST /api/v1/committee-collab/work-logs/:logId/submit
 * @desc    提交工作日志
 * @access  Author
 */
router.post('/work-logs/:logId/submit', collaborationController.submitWorkLog);

/**
 * @route   POST /api/v1/committee-collab/work-logs/:logId/review
 * @desc    审核工作日志
 * @access  Reviewer
 */
router.post('/work-logs/:logId/review', collaborationController.reviewWorkLog);

/**
 * @route   PUT /api/v1/committee-collab/work-logs/:logId
 * @desc    更新工作日志
 * @access  Author
 */
router.put('/work-logs/:logId', collaborationController.updateWorkLog);

// ==================== 审批管理 ====================

/**
 * @route   POST /api/v1/committee-collab/approvals
 * @desc    创建审批请求
 * @access  Workspace Member
 */
router.post('/approvals', collaborationController.createApprovalRequest);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/approvals
 * @desc    获取工作空间审批列表
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/approvals', collaborationController.getWorkspaceApprovals);

/**
 * @route   GET /api/v1/committee-collab/users/pending-approvals
 * @desc    获取待审批列表
 * @access  Authenticated
 */
router.get('/users/pending-approvals', collaborationController.getPendingApprovals);

/**
 * @route   GET /api/v1/committee-collab/users/applications
 * @desc    获取用户的审批申请
 * @access  Authenticated
 */
router.get('/users/applications', collaborationController.getUserApplications);

/**
 * @route   GET /api/v1/committee-collab/approvals/:approvalId
 * @desc    获取审批详情
 * @access  Workspace Member
 */
router.get('/approvals/:approvalId', collaborationController.getApprovalDetail);

/**
 * @route   POST /api/v1/committee-collab/approvals/:approvalId/approve
 * @desc    批准审批
 * @access  Approver
 */
router.post('/approvals/:approvalId/approve', collaborationController.approveRequest);

/**
 * @route   POST /api/v1/committee-collab/approvals/:approvalId/reject
 * @desc    拒绝审批
 * @access  Approver
 */
router.post('/approvals/:approvalId/reject', collaborationController.rejectRequest);

/**
 * @route   POST /api/v1/committee-collab/approvals/:approvalId/cancel
 * @desc    取消审批请求
 * @access  Applicant
 */
router.post('/approvals/:approvalId/cancel', collaborationController.cancelRequest);

/**
 * @route   GET /api/v1/committee-collab/workspaces/:workspaceId/approvals/statistics
 * @desc    获取审批统计
 * @access  Workspace Member
 */
router.get('/workspaces/:workspaceId/approvals/statistics', collaborationController.getApprovalStatistics);

module.exports = router;
