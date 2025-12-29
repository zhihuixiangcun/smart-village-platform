/**
 * 协作平台权限中间件
 * 提供工作空间成员验证、角色权限检查、操作授权等功能
 */

const { CollabWorkspace } = require('../models/CollabWorkspace');
const { TaskAssignment } = require('../models/TaskAssignment');
const { Meeting } = require('../models/Meeting');
const { WorkLog } = require('../models/WorkLog');
const { ApprovalRequest } = require('../models/ApprovalRequest');
const { CommitteeMember } = require('../models/CommitteeMember');
const logger = require('../config/logger');

/**
 * 工作空间角色枚举
 */
const WorkspaceRole = {
  ADMIN: 'admin',       // 管理员：完全控制
  MEMBER: 'member',     // 成员：可参与协作
  GUEST: 'guest'        // 访客：只读访问
};

/**
 * 权限级别枚举
 */
const PermissionLevel = {
  READ: 'read',         // 只读
  WRITE: 'write',       // 读写
  MANAGE: 'manage',     // 管理
  ADMIN: 'admin'        // 完全控制
};

/**
 * 资源类型枚举
 */
const ResourceType = {
  WORKSPACE: 'workspace',
  TASK: 'task',
  MEETING: 'meeting',
  WORK_LOG: 'work_log',
  APPROVAL: 'approval',
  MEMBER: 'member'
};

/**
 * 操作类型枚举
 */
const ActionType = {
  // 通用操作
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',

  // 工作空间操作
  MANAGE_MEMBERS: 'manage_members',
  MANAGE_SETTINGS: 'manage_settings',
  ARCHIVE: 'archive',

  // 任务操作
  ASSIGN_TASK: 'assign_task',
  REASSIGN_TASK: 'reassign_task',
  START_TASK: 'start_task',
  COMPLETE_TASK: 'complete_task',
  CANCEL_TASK: 'cancel_task',
  REVIEW_TASK: 'review_task',
  ADD_CHECKPOINT: 'add_checkpoint',

  // 会议操作
  CREATE_MEETING: 'create_meeting',
  RESPOND_MEETING: 'respond_meeting',
  START_MEETING: 'start_meeting',
  END_MEETING: 'end_meeting',
  ADD_MINUTES: 'add_minutes',

  // 工作日志操作
  SUBMIT_LOG: 'submit_log',
  REVIEW_LOG: 'review_log',

  // 审批操作
  CREATE_APPROVAL: 'create_approval',
  APPROVE_REQUEST: 'approve_request',
  REJECT_REQUEST: 'reject_request',
  CANCEL_REQUEST: 'cancel_request'
};

/**
 * 权限映射表
 * 定义每个角色可以执行的操作
 */
const PERMISSION_MATRIX = {
  [WorkspaceRole.ADMIN]: [
    // 所有操作
    ActionType.VIEW, ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE, ActionType.EXPORT,
    ActionType.MANAGE_MEMBERS, ActionType.MANAGE_SETTINGS, ActionType.ARCHIVE,
    ActionType.ASSIGN_TASK, ActionType.REASSIGN_TASK, ActionType.START_TASK, ActionType.COMPLETE_TASK,
    ActionType.CANCEL_TASK, ActionType.REVIEW_TASK, ActionType.ADD_CHECKPOINT,
    ActionType.CREATE_MEETING, ActionType.RESPOND_MEETING, ActionType.START_MEETING,
    ActionType.END_MEETING, ActionType.ADD_MINUTES,
    ActionType.SUBMIT_LOG, ActionType.REVIEW_LOG,
    ActionType.CREATE_APPROVAL, ActionType.APPROVE_REQUEST, ActionType.REJECT_REQUEST, ActionType.CANCEL_REQUEST
  ],
  [WorkspaceRole.MEMBER]: [
    // 成员可执行的操作
    ActionType.VIEW, ActionType.CREATE,
    ActionType.START_TASK, ActionType.COMPLETE_TASK, ActionType.CANCEL_TASK,
    ActionType.CREATE_MEETING, ActionType.RESPOND_MEETING, ActionType.ADD_MINUTES,
    ActionType.SUBMIT_LOG,
    ActionType.CREATE_APPROVAL, ActionType.CANCEL_REQUEST
  ],
  [WorkspaceRole.GUEST]: [
    // 访客可执行的操作
    ActionType.VIEW
  ]
};

/**
 * 验证工作空间成员身份
 * @param {string} workspaceIdParam - 工作空间ID的参数名
 * @param {Object} options - 选项
 * @param {string[]} options.allowedRoles - 允许的角色列表
 * @param {boolean} options.checkActive - 是否检查活跃状态
 */
const requireWorkspaceMember = (workspaceIdParam = 'workspaceId', options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id.toString();
      const workspaceId = req.params[workspaceIdParam] || req.body.workspaceId || req.query.workspaceId;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_WORKSPACE_ID',
          message: '缺少工作空间ID'
        });
      }

      // 查找工作空间
      const workspace = await CollabWorkspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'WORKSPACE_NOT_FOUND',
          message: '工作空间不存在'
        });
      }

      // 检查用户是否是成员
      const member = workspace.members.find(m => m.userId.toString() === userId);
      if (!member) {
        return res.status(403).json({
          success: false,
          error: 'NOT_WORKSPACE_MEMBER',
          message: '您不是该工作空间的成员'
        });
      }

      // 检查活跃状态
      if (options.checkActive && member.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'MEMBER_NOT_ACTIVE',
          message: '您在该工作空间的账号已被停用'
        });
      }

      // 检查角色权限
      if (options.allowedRoles && !options.allowedRoles.includes(member.role)) {
        return res.status(403).json({
          success: false,
          error: 'INSUFFICIENT_ROLE',
          message: `您的角色无权执行此操作`,
          requiredRoles: options.allowedRoles
        });
      }

      // 将工作空间和成员信息附加到请求对象
      req.workspace = workspace;
      req.workspaceMember = member;

      next();
    } catch (error) {
      logger.error('工作空间成员验证失败:', error);
      return res.status(500).json({
        success: false,
        error: 'VERIFICATION_ERROR',
        message: '验证过程中发生错误'
      });
    }
  };
};

/**
 * 验证工作空间管理员权限
 */
const requireWorkspaceAdmin = requireWorkspaceMember('workspaceId', {
  allowedRoles: [WorkspaceRole.ADMIN],
  checkActive: true
});

/**
 * 验证任务访问权限
 */
const requireTaskAccess = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const taskId = req.params.taskId || req.body.taskId;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TASK_ID',
        message: '缺少任务ID'
      });
    }

    const task = await TaskAssignment.findById(taskId).populate('workspaceId');
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'TASK_NOT_FOUND',
        message: '任务不存在'
      });
    }

    // 检查工作空间成员身份
    const workspace = task.workspaceId;
    const member = workspace.members.find(m => m.userId.toString() === userId);

    if (!member) {
      return res.status(403).json({
        success: false,
        error: 'NOT_WORKSPACE_MEMBER',
        message: '您无权访问此任务'
      });
    }

    // 将任务和工作空间信息附加到请求对象
    req.task = task;
    req.workspace = workspace;
    req.workspaceMember = member;

    next();
  } catch (error) {
    logger.error('任务访问权限验证失败:', error);
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: '验证过程中发生错误'
    });
  }
};

/**
 * 验证任务操作权限
 * @param {string} action - 操作类型
 */
const requireTaskPermission = (action) => {
  return [
    requireTaskAccess,
    (req, res, next) => {
      const member = req.workspaceMember;
      const task = req.task;

      // 管理员拥有所有权限
      if (member.role === WorkspaceRole.ADMIN) {
        return next();
      }

      // 检查具体操作权限
      let hasPermission = false;

      switch (action) {
        case ActionType.VIEW:
          hasPermission = true;
          break;

        case ActionType.START_TASK:
        case ActionType.COMPLETE_TASK:
        case ActionType.CANCEL_TASK:
          // 任务负责人可以执行这些操作
          hasPermission = task.assigneeId &&
            task.assigneeId.toString() === req.user._id.toString();
          break;

        case ActionType.ASSIGN_TASK:
        case ActionType.REASSIGN_TASK:
          // 只有管理员可以分配/重新分配任务
          hasPermission = member.role === WorkspaceRole.ADMIN;
          break;

        case ActionType.REVIEW_TASK:
          // 任务分配者或管理员可以审核
          hasPermission = member.role === WorkspaceRole.ADMIN ||
            (task.assignerId && task.assignerId.toString() === req.user._id.toString());
          break;

        case ActionType.UPDATE:
          // 负责人、分配者或管理员可以更新
          hasPermission = member.role === WorkspaceRole.ADMIN ||
            (task.assigneeId && task.assigneeId.toString() === req.user._id.toString()) ||
            (task.assignerId && task.assignerId.toString() === req.user._id.toString());
          break;

        case ActionType.DELETE:
        case ActionType.ADD_CHECKPOINT:
          hasPermission = member.role === WorkspaceRole.ADMIN ||
            (task.assignerId && task.assignerId.toString() === req.user._id.toString());
          break;

        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: '您无权执行此操作',
          requiredAction: action
        });
      }

      next();
    }
  ];
};

/**
 * 验证会议访问权限
 */
const requireMeetingAccess = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const meetingId = req.params.meetingId || req.body.meetingId;

    if (!meetingId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_MEETING_ID',
        message: '缺少会议ID'
      });
    }

    const meeting = await Meeting.findById(meetingId).populate('workspaceId');
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'MEETING_NOT_FOUND',
        message: '会议不存在'
      });
    }

    // 检查工作空间成员身份
    const workspace = meeting.workspaceId;
    const member = workspace.members.find(m => m.userId.toString() === userId);

    if (!member) {
      return res.status(403).json({
        success: false,
        error: 'NOT_WORKSPACE_MEMBER',
        message: '您无权访问此会议'
      });
    }

    // 将会议和工作空间信息附加到请求对象
    req.meeting = meeting;
    req.workspace = workspace;
    req.workspaceMember = member;

    next();
  } catch (error) {
    logger.error('会议访问权限验证失败:', error);
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: '验证过程中发生错误'
    });
  }
};

/**
 * 验证会议操作权限
 * @param {string} action - 操作类型
 */
const requireMeetingPermission = (action) => {
  return [
    requireMeetingAccess,
    (req, res, next) => {
      const member = req.workspaceMember;
      const meeting = req.meeting;
      const userId = req.user._id.toString();

      // 管理员拥有所有权限
      if (member.role === WorkspaceRole.ADMIN) {
        return next();
      }

      let hasPermission = false;

      switch (action) {
        case ActionType.VIEW:
          hasPermission = true;
          break;

        case ActionType.CREATE_MEETING:
          hasPermission = true; // 所有成员都可以创建会议
          break;

        case ActionType.RESPOND_MEETING:
          // 参与者可以响应会议邀请
          hasPermission = meeting.participants.some(p =>
            p.userId && p.userId.toString() === userId);
          break;

        case ActionType.START_MEETING:
        case ActionType.END_MEETING:
        case ActionType.ADD_MINUTES:
          // 只有组织者可以开始、结束会议和添加纪要
          hasPermission = meeting.organizerId &&
            meeting.organizerId.toString() === userId;
          break;

        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: '您无权执行此操作',
          requiredAction: action
        });
      }

      next();
    }
  ];
};

/**
 * 验证工作日志访问权限
 */
const requireWorkLogAccess = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const logId = req.params.logId || req.body.logId;

    if (!logId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_LOG_ID',
        message: '缺少日志ID'
      });
    }

    const log = await WorkLog.findById(logId).populate('workspaceId');
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'WORK_LOG_NOT_FOUND',
        message: '工作日志不存在'
      });
    }

    // 检查工作空间成员身份
    const workspace = log.workspaceId;
    const member = workspace.members.find(m => m.userId.toString() === userId);

    if (!member) {
      return res.status(403).json({
        success: false,
        error: 'NOT_WORKSPACE_MEMBER',
        message: '您无权访问此工作日志'
      });
    }

    // 将工作日志和工作空间信息附加到请求对象
    req.workLog = log;
    req.workspace = workspace;
    req.workspaceMember = member;

    next();
  } catch (error) {
    logger.error('工作日志访问权限验证失败:', error);
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: '验证过程中发生错误'
    });
  }
};

/**
 * 验证工作日志操作权限
 * @param {string} action - 操作类型
 */
const requireWorkLogPermission = (action) => {
  return [
    requireWorkLogAccess,
    (req, res, next) => {
      const member = req.workspaceMember;
      const log = req.workLog;
      const userId = req.user._id.toString();

      // 管理员拥有所有权限
      if (member.role === WorkspaceRole.ADMIN) {
        return next();
      }

      let hasPermission = false;

      switch (action) {
        case ActionType.VIEW:
          hasPermission = true;
          break;

        case ActionType.CREATE:
          hasPermission = true; // 所有成员都可以创建日志
          break;

        case ActionType.SUBMIT_LOG:
          // 只有作者可以提交
          hasPermission = log.authorId &&
            log.authorId.toString() === userId;
          break;

        case ActionType.UPDATE:
          // 作者或审核人可以更新
          hasPermission = (log.authorId && log.authorId.toString() === userId) ||
            (log.reviewerId && log.reviewerId.toString() === userId);
          break;

        case ActionType.REVIEW_LOG:
          // 只有审核人可以审核
          hasPermission = log.reviewerId &&
            log.reviewerId.toString() === userId;
          break;

        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: '您无权执行此操作',
          requiredAction: action
        });
      }

      next();
    }
  ];
};

/**
 * 验证审批请求访问权限
 */
const requireApprovalAccess = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const approvalId = req.params.approvalId || req.body.approvalId;

    if (!approvalId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_APPROVAL_ID',
        message: '缺少审批ID'
      });
    }

    const approval = await ApprovalRequest.findById(approvalId).populate('workspaceId');
    if (!approval) {
      return res.status(404).json({
        success: false,
        error: 'APPROVAL_NOT_FOUND',
        message: '审批请求不存在'
      });
    }

    // 检查工作空间成员身份
    const workspace = approval.workspaceId;
    const member = workspace.members.find(m => m.userId.toString() === userId);

    if (!member) {
      return res.status(403).json({
        success: false,
        error: 'NOT_WORKSPACE_MEMBER',
        message: '您无权访问此审批请求'
      });
    }

    // 将审批请求和工作空间信息附加到请求对象
    req.approval = approval;
    req.workspace = workspace;
    req.workspaceMember = member;

    next();
  } catch (error) {
    logger.error('审批请求访问权限验证失败:', error);
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: '验证过程中发生错误'
    });
  }
};

/**
 * 验证审批操作权限
 * @param {string} action - 操作类型
 */
const requireApprovalPermission = (action) => {
  return [
    requireApprovalAccess,
    (req, res, next) => {
      const member = req.workspaceMember;
      const approval = req.approval;
      const userId = req.user._id.toString();

      // 管理员拥有所有权限
      if (member.role === WorkspaceRole.ADMIN) {
        return next();
      }

      let hasPermission = false;

      switch (action) {
        case ActionType.VIEW:
          hasPermission = true;
          break;

        case ActionType.CREATE:
          hasPermission = true; // 所有成员都可以创建审批请求
          break;

        case ActionType.APPROVE_REQUEST:
        case ActionType.REJECT_REQUEST:
          // 检查是否是当前审批节点
          const currentNode = approval.getCurrentNode();
          hasPermission = currentNode &&
            currentNode.approverId &&
            currentNode.approverId.toString() === userId;
          break;

        case ActionType.CANCEL_REQUEST:
          // 只有申请人可以取消
          hasPermission = approval.applicantId &&
            approval.applicantId.toString() === userId;
          break;

        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: '您无权执行此操作',
          requiredAction: action
        });
      }

      next();
    }
  ];
};

/**
 * 验证村委成员身份
 */
const requireCommitteeMember = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const villageId = req.params.villageId || req.body.villageId || req.user.villageId;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_VILLAGE_ID',
        message: '缺少村庄ID'
      });
    }

    // 查找村委成员记录
    const committeeMember = await CommitteeMember.findOne({
      userId,
      villageId,
      status: 'active'
    });

    if (!committeeMember) {
      return res.status(403).json({
        success: false,
        error: 'NOT_COMMITTEE_MEMBER',
        message: '您不是该村庄的村委成员'
      });
    }

    // 将村委成员信息附加到请求对象
    req.committeeMember = committeeMember;

    next();
  } catch (error) {
    logger.error('村委成员身份验证失败:', error);
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: '验证过程中发生错误'
    });
  }
};

/**
 * 检查权限辅助函数
 */
function hasPermission(role, action) {
  const permissions = PERMISSION_MATRIX[role] || [];
  return permissions.includes(action);
}

function hasMinimumRole(role, minimumRole) {
  const roleHierarchy = {
    [WorkspaceRole.GUEST]: 0,
    [WorkspaceRole.MEMBER]: 1,
    [WorkspaceRole.ADMIN]: 2
  };
  return roleHierarchy[role] >= roleHierarchy[minimumRole];
}

module.exports = {
  // 枚举导出
  WorkspaceRole,
  PermissionLevel,
  ResourceType,
  ActionType,

  // 权限矩阵
  PERMISSION_MATRIX,

  // 中间件
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  requireTaskAccess,
  requireTaskPermission,
  requireMeetingAccess,
  requireMeetingPermission,
  requireWorkLogAccess,
  requireWorkLogPermission,
  requireApprovalAccess,
  requireApprovalPermission,
  requireCommitteeMember,

  // 辅助函数
  hasPermission,
  hasMinimumRole
};
