/**
 * 聊天服务
 * 处理好友关系、聊天消息、群组管理等业务逻辑
 */

const { Friendship, FriendshipStatus } = require('../../models/Friendship');
const { ChatMessage, MessageType, MessageStatus } = require('../../models/ChatMessage');
const { ChatGroup, GroupType, MemberRole, JoinMethod, GroupStatus } = require('../../models/ChatGroup');
const { User } = require('../../models/User');
const crypto = require('crypto');

// ==================== 好友管理 ====================

/**
 * 发送好友请求
 */
exports.sendFriendRequest = async (requesterId, friendId, requestMessage = '') => {
  // 不能添加自己为好友
  if (requesterId.toString() === friendId.toString()) {
    throw new Error('不能添加自己为好友');
  }

  // 检查是否已经是好友或存在待处理的请求
  const existing = await Friendship.findOne({
    $or: [
      { userId: requesterId, friendId },
      { userId: friendId, friendId: requesterId }
    ]
  });

  if (existing) {
    if (existing.status === FriendshipStatus.ACCEPTED) {
      throw new Error('已经是好友关系');
    }
    if (existing.status === FriendshipStatus.PENDING) {
      throw new Error('已有待处理的好友请求');
    }
    if (existing.status === FriendshipStatus.BLOCKED) {
      throw new Error('已被拉黑，无法添加好友');
    }
  }

  // 获取好友信息
  const friend = await User.findById(friendId);
  if (!friend) {
    throw new Error('用户不存在');
  }

  // 创建好友请求（双向记录）
  const friendship = new Friendship({
    userId: requesterId,
    friendId,
    status: FriendshipStatus.PENDING,
    requestMessage,
    villageId: friend.villageId,
    villageCode: friend.villageCode
  });

  await friendship.save();

  return friendship.populate('friendId', 'name avatar villageCode');
};

/**
 * 接受好友请求
 */
exports.acceptFriendRequest = async (userId, requesterId) => {
  // 查找好友请求
  const request = await Friendship.findOne({
    userId: requesterId,
    friendId: userId,
    status: FriendshipStatus.PENDING
  });

  if (!request) {
    throw new Error('好友请求不存在');
  }

  // 更新请求状态
  await request.accept();

  // 创建反向关系
  const reverseFriendship = new Friendship({
    userId,
    friendId: requesterId,
    status: FriendshipStatus.ACCEPTED,
    villageId: request.villageId,
    villageCode: request.villageCode
  });

  await reverseFriendship.save();

  return reverseFriendship.populate('friendId', 'name avatar villageCode');
};

/**
 * 拒绝好友请求
 */
exports.rejectFriendRequest = async (userId, requesterId) => {
  const request = await Friendship.findOne({
    userId: requesterId,
    friendId: userId,
    status: FriendshipStatus.PENDING
  });

  if (!request) {
    throw new Error('好友请求不存在');
  }

  // 删除请求
  await Friendship.deleteOne({ _id: request._id });

  return { success: true };
};

/**
 * 删除好友
 */
exports.deleteFriend = async (userId, friendId) => {
  const friendship = await Friendship.areFriends(userId, friendId);

  if (!friendship) {
    throw new Error('不是好友关系');
  }

  // 双向删除
  await Friendship.deleteMany({
    $or: [
      { userId, friendId },
      { userId: friendId, friendId: userId }
    ]
  });

  return { success: true };
};

/**
 * 拉黑好友
 */
exports.blockFriend = async (userId, friendId) => {
  const friendship = await Friendship.findOne({
    userId,
    friendId
  });

  if (!friendship) {
    throw new Error('好友关系不存在');
  }

  await friendship.block();

  return friendship;
};

/**
 * 设置好友备注
 */
exports.setFriendRemark = async (userId, friendId, remark) => {
  const friendship = await Friendship.findOne({
    userId,
    friendId,
    status: FriendshipStatus.ACCEPTED
  });

  if (!friendship) {
    throw new Error('好友关系不存在');
  }

  await friendship.setRemark(remark);

  return friendship;
};

/**
 * 设置好友分组
 */
exports.setFriendGroup = async (userId, friendId, group) => {
  const friendship = await Friendship.findOne({
    userId,
    friendId,
    status: FriendshipStatus.ACCEPTED
  });

  if (!friendship) {
    throw new Error('好友关系不存在');
  }

  await friendship.setGroup(group);

  return friendship;
};

/**
 * 获取好友列表
 */
exports.getFriendList = async (userId, options = {}) => {
  return Friendship.getFriendList(userId, options);
};

/**
 * 获取好友请求列表
 */
exports.getPendingRequests = async (userId) => {
  return Friendship.getPendingRequests(userId);
};

/**
 * 搜索好友
 */
exports.searchFriends = async (userId, keyword) => {
  return Friendship.searchFriends(userId, keyword);
};

// ==================== 消息管理 ====================

/**
 * 发送单聊消息
 */
exports.sendPrivateMessage = async (senderId, receiverId, messageType, content, options = {}) => {
  // 检查是否是好友
  const friendship = await Friendship.areFriends(senderId, receiverId);
  if (!friendship) {
    throw new Error('不是好友关系，无法发送消息');
  }

  // 生成会话ID（按用户ID排序，确保一致性）
  const userIds = [senderId.toString(), receiverId.toString()].sort();
  const conversationId = `${userIds[0]}-${userIds[1]}`;

  // 内容审核
  const moderationResult = await this.moderateContent(messageType, content);
  if (moderationResult.isSensitive) {
    throw new Error('消息内容包含违规内容，无法发送');
  }

  // 创建消息
  const message = new ChatMessage({
    conversationId,
    senderId,
    receiverId,
    messageType,
    content,
    status: MessageStatus.SENT,
    moderationResult,
    quotedMessage: options.quotedMessage,
    fileInfo: options.fileInfo,
    locationInfo: options.locationInfo,
    linkInfo: options.linkInfo
  });

  await message.save();

  // 更新好友关系最后互动时间
  await Friendship.findOneAndUpdate(
    { userId: senderId, friendId: receiverId },
    { $inc: { interactionCount: 1 }, lastInteractionAt: new Date() }
  );

  return message.populate('senderId', 'name avatar');
};

/**
 * 发送群聊消息
 */
exports.sendGroupMessage = async (senderId, groupId, messageType, content, options = {}) => {
  // 检查群组是否存在
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  if (group.status !== GroupStatus.ACTIVE) {
    throw new Error('群组已解散');
  }

  // 检查是否是群成员
  const member = group.members.find(m => m.userId.toString() === senderId.toString());
  if (!member) {
    throw new Error('不是群成员');
  }

  // 检查是否被禁言
  if (member.isMuted || group.settings.allMuted) {
    throw new Error('已被禁言，无法发送消息');
  }

  // 仅管理员发言检查
  if (group.settings.adminOnly && member.role === MemberRole.MEMBER) {
    throw new Error('仅管理员可发言');
  }

  // 生成会话ID
  const conversationId = `group-${groupId}`;

  // 内容审核
  const moderationResult = await this.moderateContent(messageType, content);
  if (moderationResult.isSensitive) {
    throw new Error('消息内容包含违规内容，无法发送');
  }

  // 处理@提及
  const mentionedUserIds = options.mentionedUserIds || [];
  const mentionedAll = options.mentionedAll || false;

  // 创建消息
  const message = new ChatMessage({
    conversationId,
    senderId,
    groupId,
    messageType,
    content,
    status: MessageStatus.SENT,
    moderationResult,
    quotedMessage: options.quotedMessage,
    mentioned: mentionedUserIds.length > 0 || mentionedAll,
    mentionedUserIds,
    mentionedAll,
    fileInfo: options.fileInfo,
    locationInfo: options.locationInfo,
    linkInfo: options.linkInfo
  });

  await message.save();

  // 更新群组最后消息
  await group.updateLastMessage(
    messageType,
    content,
    senderId,
    options.senderName || ''
  );

  return message.populate('senderId', 'name avatar');
};

/**
 * 标记消息已读
 */
exports.markMessageAsRead = async (messageId, userId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('消息不存在');
  }

  await message.markAsRead(userId);

  return message;
};

/**
 * 标记会话所有消息已读
 */
exports.markConversationAsRead = async (conversationId, userId) => {
  const messages = await ChatMessage.find({
    conversationId,
    senderId: { $ne: userId },
    status: { $ne: MessageStatus.READ }
  });

  const promises = messages.map(msg => msg.markAsRead(userId));
  await Promise.all(promises);

  // 如果是群聊，更新群组成员已读时间
  if (conversationId.startsWith('group-')) {
    const groupId = conversationId.replace('group-', '');
    const group = await ChatGroup.findById(groupId);
    if (group) {
      await group.markMemberRead(userId);
    }
  }

  return { success: true, count: messages.length };
};

/**
 * 撤回消息
 */
exports.revokeMessage = async (messageId, userId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('消息不存在');
  }

  // 检查是否是发送者
  if (message.senderId.toString() !== userId.toString()) {
    throw new Error('只能撤回自己发送的消息');
  }

  await message.revoke();

  return message;
};

/**
 * 获取会话消息列表
 */
exports.getConversationMessages = async (conversationId, options = {}) => {
  return ChatMessage.getConversationMessages(conversationId, options);
};

/**
 * 获取未读消息数
 */
exports.getUnreadCount = async (userId, conversationId) => {
  return ChatMessage.getUnreadCount(userId, conversationId);
};

/**
 * 获取所有未读消息数
 */
exports.getTotalUnreadCount = async (userId) => {
  return ChatMessage.getTotalUnreadCount(userId);
};

/**
 * 搜索消息
 */
exports.searchMessages = async (userId, keyword, options = {}) => {
  return ChatMessage.searchMessages(userId, keyword, options);
};

/**
 * 举报消息
 */
exports.reportMessage = async (messageId, reporterId, reporterName, reason) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('消息不存在');
  }

  await message.addReport(reporterId, reporterName, reason);

  return message;
};

// ==================== 群组管理 ====================

/**
 * 创建群组
 */
exports.createGroup = async (name, ownerId, options = {}) => {
  const {
    description,
    avatar,
    groupType = GroupType.NORMAL,
    villageId,
    maxMembers = 500,
    joinMethod = JoinMethod.APPROVAL,
    memberIds = []
  } = options;

  // 创建群组
  const group = new ChatGroup({
    name,
    description,
    avatar,
    groupType,
    villageId,
    ownerId,
    maxMembers,
    joinMethod,
    members: [{
      userId: ownerId,
      role: MemberRole.OWNER,
      joinMethod: JoinMethod.INVITE
    }]
  });

  // 添加其他成员
  for (const memberId of memberIds) {
    if (memberId.toString() !== ownerId.toString()) {
      try {
        await group.addMember(memberId, {
          role: MemberRole.MEMBER,
          joinMethod: JoinMethod.INVITE
        });
      } catch (err) {
        // 忽略添加失败的成员
        console.error(`Failed to add member ${memberId}:`, err.message);
      }
    }
  }

  await group.save();

  return group.populate('members.userId', 'name avatar');
};

/**
 * 更新群组信息
 */
exports.updateGroup = async (groupId, userId, updates) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 检查权限
  const member = group.members.find(m => m.userId.toString() === userId.toString());
  if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
    throw new Error('无权限修改群组信息');
  }

  // 更新字段
  const allowedFields = ['name', 'description', 'avatar', 'category', 'tags'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      group[field] = updates[field];
    }
  }

  await group.save();

  return group;
};

/**
 * 更新群设置
 */
exports.updateGroupSettings = async (groupId, userId, settings) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 只有群主可以修改群设置
  if (group.ownerId.toString() !== userId.toString()) {
    throw new Error('只有群主可以修改群设置');
  }

  group.settings = { ...group.settings, ...settings };
  await group.save();

  return group;
};

/**
 * 添加群成员
 */
exports.addGroupMember = async (groupId, operatorId, memberId, options = {}) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 检查权限
  const operator = group.members.find(m => m.userId.toString() === operatorId.toString());
  if (!operator) {
    throw new Error('不是群成员');
  }

  // 检查是否允许成员邀请
  if (operator.role === MemberRole.MEMBER && !group.settings.allowMemberInvite) {
    throw new Error('无权限邀请成员');
  }

  await group.addMember(memberId, {
    role: MemberRole.MEMBER,
    joinMethod: options.joinMethod || JoinMethod.INVITE
  });

  return group.populate('members.userId', 'name avatar');
};

/**
 * 移除群成员
 */
exports.removeGroupMember = async (groupId, operatorId, memberId) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 检查权限
  const operator = group.members.find(m => m.userId.toString() === operatorId.toString());
  const targetMember = group.members.find(m => m.userId.toString() === memberId.toString());

  if (!operator) {
    throw new Error('不是群成员');
  }

  // 只有管理员可以移除成员，且不能移除群主
  if (operator.role === MemberRole.MEMBER) {
    throw new Error('无权限移除成员');
  }

  if (targetMember && targetMember.role === MemberRole.OWNER) {
    throw new Error('不能移除群主');
  }

  await group.removeMember(memberId);

  return group.populate('members.userId', 'name avatar');
};

/**
 * 设置管理员
 */
exports.setGroupAdmin = async (groupId, ownerId, memberId, isAdmin) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 只有群主可以设置管理员
  if (group.ownerId.toString() !== ownerId.toString()) {
    throw new Error('只有群主可以设置管理员');
  }

  await group.setAdmin(memberId, isAdmin);

  return group.populate('members.userId', 'name avatar');
};

/**
 * 转让群主
 */
exports.transferGroupOwner = async (groupId, ownerId, newOwnerId) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 只有群主可以转让
  if (group.ownerId.toString() !== ownerId.toString()) {
    throw new Error('只有群主可以转让群主');
  }

  await group.transferOwner(newOwnerId, ownerId);

  return group.populate('members.userId', 'name avatar');
};

/**
 * 更新群公告
 */
exports.updateGroupAnnouncement = async (groupId, userId, content, publisherName) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 检查权限
  const member = group.members.find(m => m.userId.toString() === userId.toString());
  if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
    throw new Error('无权限修改群公告');
  }

  await group.updateAnnouncement(content, userId, publisherName);

  return group;
};

/**
 * 生成群邀请码
 */
exports.generateGroupInviteCode = async (groupId, userId) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 只有群主和管理员可以生成邀请码
  const member = group.members.find(m => m.userId.toString() === userId.toString());
  if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
    throw new Error('无权限生成邀请码');
  }

  await group.generateInviteCode();

  return { inviteCode: group.inviteCode };
};

/**
 * 通过邀请码加入群组
 */
exports.joinGroupByCode = async (inviteCode, userId) => {
  const group = await ChatGroup.getByInviteCode(inviteCode);
  if (!group) {
    throw new Error('邀请码无效');
  }

  // 检查是否已是成员
  const isMember = group.members.some(m => m.userId.toString() === userId.toString());
  if (isMember) {
    throw new Error('已是群成员');
  }

  // 检查群人数
  if (group.members.length >= group.maxMembers) {
    throw new Error('群成员已满');
  }

  await group.addMember(userId, {
    role: MemberRole.MEMBER,
    joinMethod: JoinMethod.CODE
  });

  return group.populate('members.userId', 'name avatar');
};

/**
 * 退出群组
 */
exports.leaveGroup = async (groupId, userId) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 群主不能直接退出，需要先转让
  if (group.ownerId.toString() === userId.toString()) {
    throw new Error('群主不能退出群组，请先转让群主');
  }

  await group.removeMember(userId);

  return { success: true };
};

/**
 * 解散群组
 */
exports.dismissGroup = async (groupId, userId) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) {
    throw new Error('群组不存在');
  }

  // 只有群主可以解散
  if (group.ownerId.toString() !== userId.toString()) {
    throw new Error('只有群主可以解散群组');
  }

  await group.dismiss();

  return { success: true };
};

/**
 * 获取用户群组列表
 */
exports.getUserGroups = async (userId, options = {}) => {
  return ChatGroup.getUserGroups(userId, options);
};

/**
 * 搜索群组
 */
exports.searchGroups = async (keyword, villageId, options = {}) => {
  return ChatGroup.searchGroups(keyword, villageId, options);
};

/**
 * 获取热门群组
 */
exports.getPopularGroups = async (villageId, limit = 10) => {
  return ChatGroup.getPopularGroups(villageId, limit);
};

/**
 * 获取群详情
 */
exports.getGroupDetail = async (groupId, userId) => {
  const group = await ChatGroup.findById(groupId)
    .populate('ownerId', 'name avatar')
    .populate('members.userId', 'name avatar')
    .populate('adminIds', 'name avatar')
    .lean();

  if (!group) {
    throw new Error('群组不存在');
  }

  // 获取成员未读数
  const member = group.members.find(m => m.userId?.toString() === userId?.toString());
  if (member) {
    group.unreadCount = await group.getMemberUnreadCount(userId);
  }

  return group;
};

// ==================== 内容审核 ====================

/**
 * 内容审核（敏感词过滤）
 */
exports.moderateContent = async (messageType, content) => {
  const result = {
    isSensitive: false,
    sensitiveWords: [],
    filteredContent: content,
    confidence: 0
  };

  // 文本消息敏感词检测
  if (messageType === MessageType.TEXT && content?.text) {
    const sensitiveWords = await this.checkSensitiveWords(content.text);
    if (sensitiveWords.length > 0) {
      result.isSensitive = true;
      result.sensitiveWords = sensitiveWords;
    }
  }

  // 图片消息需要调用AI审核服务
  if (messageType === MessageType.IMAGE && content?.imageUrl) {
    // TODO: 调用图片审核API
    // const imageResult = await imageModerationService.check(content.imageUrl);
    // if (imageResult.isSensitive) {
    //   result.isSensitive = true;
    //   result.confidence = imageResult.confidence;
    // }
  }

  // 语音消息转文字后审核
  if (messageType === MessageType.VOICE && content?.voiceUrl) {
    // TODO: 语音转文字后再审核
    // const text = await speechToTextService.convert(content.voiceUrl);
    // const voiceResult = await this.checkSensitiveWords(text);
    // if (voiceResult.length > 0) {
    //   result.isSensitive = true;
    //   result.sensitiveWords = voiceResult;
    // }
  }

  return result;
};

/**
 * 敏感词检测
 */
exports.checkSensitiveWords = async (text) => {
  // TODO: 实现实际的敏感词库检测
  // 这里提供一个基础实现
  const sensitiveWords = [
    // 示例敏感词，实际应该从数据库或配置文件加载
    '暴力', '色情', '赌博', '毒品'
  ];

  const found = [];
  for (const word of sensitiveWords) {
    if (text.includes(word)) {
      found.push(word);
    }
  }

  return found;
};

/**
 * 过滤敏感词
 */
exports.filterSensitiveWords = async (text, replaceChar = '*') => {
  const sensitiveWords = await this.checkSensitiveWords(text);
  let filteredText = text;

  for (const word of sensitiveWords) {
    const regex = new RegExp(word, 'g');
    filteredText = filteredText.replace(regex, replaceChar.repeat(word.length));
  }

  return filteredText;
};

// ==================== 通话管理 ====================

/**
 * 发起通话
 */
exports.initiateCall = async (callerId, receiverId, callType) => {
  const { CallType, MessageType } = require('../../models/ChatMessage');

  // 检查是否是好友
  const friendship = await Friendship.areFriends(callerId, receiverId);
  if (!friendship) {
    throw new Error('不是好友关系');
  }

  // 生成会话ID
  const userIds = [callerId.toString(), receiverId.toString()].sort();
  const conversationId = `${userIds[0]}-${userIds[1]}`;

  // 创建通话消息
  const message = new ChatMessage({
    conversationId,
    senderId: callerId,
    receiverId,
    messageType: MessageType.CALL,
    content: {},
    status: MessageStatus.SENDING,
    callInfo: {
      callType,
      callStatus: 'calling',
      startTime: new Date()
    }
  });

  await message.save();

  return message.populate('senderId', 'name avatar');
};

/**
 * 接听通话
 */
exports.answerCall = async (messageId, userId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('通话消息不存在');
  }

  if (message.messageType !== MessageType.CALL) {
    throw new Error('不是通话消息');
  }

  message.callInfo.callStatus = 'accepted';
  message.status = MessageStatus.DELIVERED;

  await message.save();

  return message;
};

/**
 * 拒绝通话
 */
exports.rejectCall = async (messageId, userId, reason = '') => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('通话消息不存在');
  }

  if (message.messageType !== MessageType.CALL) {
    throw new Error('不是通话消息');
  }

  message.callInfo.callStatus = 'rejected';
  message.callInfo.rejectedReason = reason;
  message.status = MessageStatus.FAILED;

  await message.save();

  return message;
};

/**
 * 结束通话
 */
exports.endCall = async (messageId, userId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('通话消息不存在');
  }

  if (message.messageType !== MessageType.CALL) {
    throw new Error('不是通话消息');
  }

  message.callInfo.callStatus = 'ended';
  message.callInfo.endTime = new Date();
  message.callInfo.duration = Math.floor(
    (message.callInfo.endTime - message.callInfo.startTime) / 1000
  );
  message.status = MessageStatus.DELIVERED;

  await message.save();

  return message;
};
