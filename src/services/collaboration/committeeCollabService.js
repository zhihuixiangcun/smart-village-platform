/**
 * 村干部协作服务
 * 处理协作空间管理的业务逻辑
 */

const { CollabWorkspace, WorkspaceType, MemberRole, WorkspaceStatus } = require('../../models/CollabWorkspace');
const { ChatGroup, GroupType } = require('../../models/ChatGroup');
const { CommitteeMember } = require('../../models/CommitteeMember');
const { TaskAssignment } = require('../../models/TaskAssignment');
const webSocketService = require('../webSocketService');

// ==================== 协作空间管理 ====================

/**
 * 创建协作空间
 */
exports.createWorkspace = async (data, creatorId) => {
  const {
    name,
    description,
    villageId,
    workspaceType = WorkspaceType.GENERAL,
    settings = {}
  } = data;

  // 验证创建者是否是村委成员
  const committeeMember = await CommitteeMember.findOne({
    userId: creatorId,
    villageId,
    status: 'active'
  });

  if (!committeeMember) {
    throw new Error('只有村委成员才能创建协作空间');
  }

  // 创建关联的聊天群组
  const chatGroup = new ChatGroup({
    name: name || '村委协作群',
    groupType: GroupType.COMMITTEE,
    villageId,
    ownerId: creatorId,
    description: description || '村干部内部协作群组',
    joinMethod: 'invite'
  });

  await chatGroup.save();

  // 创建协作空间
  const workspace = new CollabWorkspace({
    name,
    description,
    villageId,
    workspaceType,
    chatGroupId: chatGroup._id,
    createdBy: creatorId,
    members: [{
      userId: creatorId,
      committeeMemberId: committeeMember._id,
      role: MemberRole.SECRETARY,
      permissions: committeeMember.roles[0]?.permissions || ['all'],
      joinedAt: new Date()
    }],
    settings: {
      enableTaskAssignment: settings.enableTaskAssignment !== false,
      enableMeeting: settings.enableMeeting !== false,
      enableApproval: settings.enableApproval !== false,
      enableWorkLog: settings.enableWorkLog !== false,
      autoArchiveDays: settings.autoArchiveDays || 90
    }
  });

  await workspace.save();

  // 将创建者添加到群组
  await chatGroup.addMember(creatorId, {
    role: 'owner'
  });

  // 发送通知
  await this._notifyMembers(workspace, 'workspace_created', {
    workspaceName: name,
    creatorId
  });

  return workspace.populate('createdBy chatGroupId members.userId');
};

/**
 * 获取用户的协作空间列表
 */
exports.getUserWorkspaces = async (userId, options = {}) => {
  return CollabWorkspace.getUserWorkspaces(userId, options);
};

/**
 * 获取协作空间详情
 */
exports.getWorkspaceDetail = async (workspaceId, userId) => {
  const workspace = await CollabWorkspace.findById(workspaceId)
    .populate('createdBy', 'name avatar')
    .populate('chatGroupId', 'name memberCount')
    .populate('members.userId', 'name avatar')
    .populate('members.committeeMemberId', 'position current')
    .lean();

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  // 检查用户是否是成员
  const isMember = workspace.members.some(
    m => m.userId._id.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权访问此协作空间');
  }

  // 获取最新统计
  await workspace.updateStats();

  return workspace;
};

/**
 * 更新协作空间
 */
exports.updateWorkspace = async (workspaceId, userId, updates) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  // 检查权限
  const hasPermission = workspace.checkPermission(userId, 'workspace:update');
  if (!hasPermission) {
    throw new Error('无权限修改协作空间');
  }

  // 更新允许的字段
  const allowedFields = ['name', 'description', 'avatar', 'tags'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      workspace[field] = updates[field];
    }
  }

  // 更新设置（需要更高权限）
  if (updates.settings) {
    const hasSettingsPermission = workspace.checkPermission(userId, 'workspace:update_settings');
    if (!hasSettingsPermission) {
      throw new Error('无权限修改协作空间设置');
    }
    workspace.settings = { ...workspace.settings, ...updates.settings };
  }

  await workspace.save();

  return workspace.populate('createdBy chatGroupId members.userId');
};

/**
 * 删除/归档协作空间
 */
exports.archiveWorkspace = async (workspaceId, userId) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  // 只有创建者可以归档
  if (workspace.createdBy.toString() !== userId.toString()) {
    throw new Error('只有创建者可以归档协作空间');
  }

  await workspace.archive();

  return { success: true, message: '协作空间已归档' };
};

// ==================== 成员管理 ====================

/**
 * 添加成员
 */
exports.addMember = async (workspaceId, userId, memberData) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  // 检查操作者权限
  const hasPermission = workspace.checkPermission(userId, 'workspace:add_member');
  if (!hasPermission) {
    throw new Error('无权限添加成员');
  }

  const { userId: newMemberId, committeeMemberId, role = MemberRole.MEMBER } = memberData;

  // 验证新成员是否是村委成员
  const committeeMember = await CommitteeMember.findById(committeeMemberId);
  if (!committeeMember || committeeMember.villageId.toString() !== workspace.villageId.toString()) {
    throw new Error('该用户不是本村庄的村委成员');
  }

  // 添加到协作空间
  await workspace.addMember(newMemberId, committeeMemberId, role, committeeMember.roles[0]?.permissions || []);

  // 添加到关联群组
  await ChatGroup.findById(workspace.chatGroupId).then(group => {
    return group.addMember(newMemberId, { role: 'member' });
  });

  // 发送通知
  await this._notifyMember(newMemberId, 'added_to_workspace', {
    workspaceName: workspace.name,
    workspaceId
  });

  return workspace.populate('members.userId');
};

/**
 * 移除成员
 */
exports.removeMember = async (workspaceId, userId, memberIdToRemove) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  // 检查权限
  const hasPermission = workspace.checkPermission(userId, 'workspace:remove_member');
  if (!hasPermission) {
    throw new Error('无权限移除成员');
  }

  await workspace.removeMember(memberIdToRemove);

  // 从群组中移除
  await ChatGroup.findById(workspace.chatGroupId).then(group => {
    return group.removeMember(memberIdToRemove);
  });

  return { success: true };
};

/**
 * 更新成员角色
 */
exports.updateMemberRole = async (workspaceId, userId, memberId, role, permissions) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  const hasPermission = workspace.checkPermission(userId, 'workspace:update_member_role');
  if (!hasPermission) {
    throw new Error('无权限修改成员角色');
  }

  await workspace.updateMemberRole(memberId, role, permissions);

  return { success: true };
};

/**
 * 更新成员活跃时间
 */
exports.updateMemberActivity = async (workspaceId, userId) => {
  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) return;

  await workspace.updateMemberActivity(userId);
};

// ==================== 统计信息 ====================

/**
 * 获取协作空间统计
 */
exports.getWorkspaceStats = async (workspaceId, userId) => {
  const workspace = await CollabWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new Error('协作空间不存在');
  }

  // 检查是否是成员
  const isMember = workspace.members.some(
    m => m.userId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new Error('无权访问此协作空间');
  }

  // 更新并获取统计
  const stats = await workspace.updateStats();

  return stats;
};

/**
 * 获取村庄统计
 */
exports.getVillageStats = async (villageId) => {
  return CollabWorkspace.getStatistics(villageId);
};

// ==================== 通知相关 ====================

/**
 * 通知协作空间成员
 */
exports._notifyMembers = async (workspace, eventType, data) => {
  // 获取所有成员ID
  const memberIds = workspace.members.map(m => m.userId);

  // 构建通知消息
  const notifications = {
    workspace_created: {
      title: '协作空间已创建',
      message: `协作空间"${data.workspaceName}"已创建`,
      type: 'collaboration',
      link: `/collaboration/${workspace._id}`
    },
    member_added: {
      title: '新成员加入',
      message: `新成员已加入协作空间"${data.workspaceName}"`,
      type: 'collaboration',
      link: `/collaboration/${workspace._id}`
    },
    task_assigned: {
      title: '新任务分配',
      message: `您收到了新任务：${data.taskTitle}`,
      type: 'task',
      link: `/tasks/${data.taskId}`
    }
  };

  const notification = notifications[eventType];
  if (!notification) return;

  // 通过WebSocket发送通知
  if (webSocketService && webSocketService.broadcastToRoom) {
    const roomName = `workspace:${workspace._id}`;
    webSocketService.broadcastToRoom(roomName, {
      type: 'collaboration_notification',
      data: {
        ...notification,
        ...data
      }
    });
  }
};

/**
 * 通知单个成员
 */
exports._notifyMember = async (userId, eventType, data) => {
  // 这里可以集成到现有的通知服务
  // 暂时记录日志
  console.log(`Notification to ${userId}:`, eventType, data);
};

// ==================== 群组集成 ====================

/**
 * 通过群组ID获取协作空间
 */
exports.getWorkspaceByChatGroup = async (chatGroupId) => {
  return CollabWorkspace.getByChatGroup(chatGroupId);
};

/**
 * 检查用户是否是协作空间成员（通过群组ID）
 */
exports.isChatGroupMember = async (chatGroupId, userId) => {
  const workspace = await CollabWorkspace.findOne({
    chatGroupId,
    'members.userId': userId,
    status: WorkspaceStatus.ACTIVE
  });

  return !!workspace;
};
