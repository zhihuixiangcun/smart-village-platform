/**
 * 聊天控制器
 * 处理聊天相关的HTTP请求
 */

const chatService = require('../services/chat/chatService');
const { validationResult } = require('express-validator');

// ==================== 好友管理 ====================

/**
 * 发送好友请求
 */
exports.sendFriendRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { friendId, requestMessage } = req.body;

    const friendship = await chatService.sendFriendRequest(
      req.user._id,
      friendId,
      requestMessage
    );

    res.status(201).json({
      success: true,
      message: '好友请求已发送',
      data: friendship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 接受好友请求
 */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.body;

    const friendship = await chatService.acceptFriendRequest(
      req.user._id,
      requesterId
    );

    res.json({
      success: true,
      message: '已添加为好友',
      data: friendship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 拒绝好友请求
 */
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.body;

    await chatService.rejectFriendRequest(req.user._id, requesterId);

    res.json({
      success: true,
      message: '已拒绝好友请求'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 删除好友
 */
exports.deleteFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    await chatService.deleteFriend(req.user._id, friendId);

    res.json({
      success: true,
      message: '已删除好友'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 拉黑好友
 */
exports.blockFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    const friendship = await chatService.blockFriend(req.user._id, friendId);

    res.json({
      success: true,
      message: '已拉黑该用户',
      data: friendship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 设置好友备注
 */
exports.setFriendRemark = async (req, res) => {
  try {
    const { friendId } = req.params;
    const { remark } = req.body;

    const friendship = await chatService.setFriendRemark(
      req.user._id,
      friendId,
      remark
    );

    res.json({
      success: true,
      message: '备注已更新',
      data: friendship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 设置好友分组
 */
exports.setFriendGroup = async (req, res) => {
  try {
    const { friendId } = req.params;
    const { group } = req.body;

    const friendship = await chatService.setFriendGroup(
      req.user._id,
      friendId,
      group
    );

    res.json({
      success: true,
      message: '分组已更新',
      data: friendship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取好友列表
 */
exports.getFriendList = async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      group: req.query.group,
      keyword: req.query.keyword,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };

    const friends = await chatService.getFriendList(req.user._id, options);

    res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取好友请求列表
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await chatService.getPendingRequests(req.user._id);

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 搜索好友
 */
exports.searchFriends = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请输入搜索关键词'
      });
    }

    const friends = await chatService.searchFriends(req.user._id, keyword);

    res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== 消息管理 ====================

/**
 * 发送单聊消息
 */
exports.sendPrivateMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { receiverId, messageType, content, quotedMessage, fileInfo, locationInfo, linkInfo } = req.body;

    const message = await chatService.sendPrivateMessage(
      req.user._id,
      receiverId,
      messageType,
      content,
      { quotedMessage, fileInfo, locationInfo, linkInfo }
    );

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 发送群聊消息
 */
exports.sendGroupMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { groupId, messageType, content, quotedMessage, mentionedUserIds, mentionedAll, fileInfo, locationInfo, linkInfo } = req.body;

    const message = await chatService.sendGroupMessage(
      req.user._id,
      groupId,
      messageType,
      content,
      {
        senderName: req.user.name,
        quotedMessage,
        mentionedUserIds,
        mentionedAll,
        fileInfo,
        locationInfo,
        linkInfo
      }
    );

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取会话消息
 */
exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      beforeTime: req.query.beforeTime,
      afterTime: req.query.afterTime
    };

    const messages = await chatService.getConversationMessages(conversationId, options);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 标记消息已读
 */
exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await chatService.markMessageAsRead(messageId, req.user._id);

    res.json({
      success: true,
      message: '已标记为已读',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 标记会话已读
 */
exports.markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await chatService.markConversationAsRead(conversationId, req.user._id);

    res.json({
      success: true,
      message: '会话已标记为已读',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 撤回消息
 */
exports.revokeMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await chatService.revokeMessage(messageId, req.user._id);

    res.json({
      success: true,
      message: '消息已撤回',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取未读消息数
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const count = await chatService.getUnreadCount(req.user._id, conversationId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取所有未读消息数
 */
exports.getTotalUnreadCount = async (req, res) => {
  try {
    const result = await chatService.getTotalUnreadCount(req.user._id);

    let totalCount = 0;
    if (result.length > 0 && result[0].total) {
      totalCount = result[0].total;
    }

    res.json({
      success: true,
      data: { total: totalCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 搜索消息
 */
exports.searchMessages = async (req, res) => {
  try {
    const { keyword } = req.query;
    const options = {
      conversationId: req.query.conversationId,
      messageType: req.query.messageType,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请输入搜索关键词'
      });
    }

    const messages = await chatService.searchMessages(req.user._id, keyword, options);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 举报消息
 */
exports.reportMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason, description } = req.body;

    const message = await chatService.reportMessage(
      messageId,
      req.user._id,
      req.user.name,
      reason
    );

    res.json({
      success: true,
      message: '举报已提交',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== 群组管理 ====================

/**
 * 创建群组
 */
exports.createGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { name, description, avatar, groupType, villageId, maxMembers, joinMethod, memberIds } = req.body;

    const group = await chatService.createGroup(name, req.user._id, {
      description,
      avatar,
      groupType,
      villageId,
      maxMembers,
      joinMethod,
      memberIds
    });

    res.status(201).json({
      success: true,
      message: '群组创建成功',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 更新群组信息
 */
exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;

    const group = await chatService.updateGroup(groupId, req.user._id, updates);

    res.json({
      success: true,
      message: '群组信息已更新',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 更新群设置
 */
exports.updateGroupSettings = async (req, res) => {
  try {
    const { groupId } = req.params;
    const settings = req.body;

    const group = await chatService.updateGroupSettings(groupId, req.user._id, settings);

    res.json({
      success: true,
      message: '群设置已更新',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 添加群成员
 */
exports.addGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId, joinMethod } = req.body;

    const group = await chatService.addGroupMember(groupId, req.user._id, memberId, { joinMethod });

    res.json({
      success: true,
      message: '成员添加成功',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 移除群成员
 */
exports.removeGroupMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    const group = await chatService.removeGroupMember(groupId, req.user._id, memberId);

    res.json({
      success: true,
      message: '成员已移除',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 设置群管理员
 */
exports.setGroupAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { isAdmin } = req.body;

    const group = await chatService.setGroupAdmin(groupId, req.user._id, memberId, isAdmin);

    res.json({
      success: true,
      message: isAdmin ? '已设置为管理员' : '已取消管理员',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 转让群主
 */
exports.transferGroupOwner = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newOwnerId } = req.body;

    const group = await chatService.transferGroupOwner(groupId, req.user._id, newOwnerId);

    res.json({
      success: true,
      message: '群主已转让',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 更新群公告
 */
exports.updateGroupAnnouncement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;

    const group = await chatService.updateGroupAnnouncement(
      groupId,
      req.user._id,
      content,
      req.user.name
    );

    res.json({
      success: true,
      message: '群公告已更新',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 生成群邀请码
 */
exports.generateGroupInviteCode = async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await chatService.generateGroupInviteCode(groupId, req.user._id);

    res.json({
      success: true,
      message: '邀请码已生成',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 通过邀请码加入群组
 */
exports.joinGroupByCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const group = await chatService.joinGroupByCode(inviteCode, req.user._id);

    res.json({
      success: true,
      message: '已加入群组',
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 退出群组
 */
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    await chatService.leaveGroup(groupId, req.user._id);

    res.json({
      success: true,
      message: '已退出群组'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 解散群组
 */
exports.dismissGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    await chatService.dismissGroup(groupId, req.user._id);

    res.json({
      success: true,
      message: '群组已解散'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取用户群组列表
 */
exports.getUserGroups = async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      keyword: req.query.keyword,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };

    const groups = await chatService.getUserGroups(req.user._id, options);

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 搜索群组
 */
exports.searchGroups = async (req, res) => {
  try {
    const { keyword } = req.query;
    const villageId = req.query.villageId || req.user.villageId;
    const options = {
      groupType: req.query.groupType,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请输入搜索关键词'
      });
    }

    const groups = await chatService.searchGroups(keyword, villageId, options);

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取热门群组
 */
exports.getPopularGroups = async (req, res) => {
  try {
    const villageId = req.query.villageId || req.user.villageId;
    const limit = parseInt(req.query.limit) || 10;

    const groups = await chatService.getPopularGroups(villageId, limit);

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取群详情
 */
exports.getGroupDetail = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await chatService.getGroupDetail(groupId, req.user._id);

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== 通话管理 ====================

/**
 * 发起通话
 */
exports.initiateCall = async (req, res) => {
  try {
    const { receiverId, callType } = req.body;

    const message = await chatService.initiateCall(req.user._id, receiverId, callType);

    res.status(201).json({
      success: true,
      message: '通话已发起',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 接听通话
 */
exports.answerCall = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await chatService.answerCall(messageId, req.user._id);

    res.json({
      success: true,
      message: '已接听',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 拒绝通话
 */
exports.rejectCall = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;

    const message = await chatService.rejectCall(messageId, req.user._id, reason);

    res.json({
      success: true,
      message: '已拒绝',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 结束通话
 */
exports.endCall = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await chatService.endCall(messageId, req.user._id);

    res.json({
      success: true,
      message: '通话已结束',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
