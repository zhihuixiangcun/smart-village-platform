/**
 * Friend Controller
 * 好友控制器 - 处理好友关系相关的业务逻辑
 * 支持通过手机号、乡村号等方式搜索和添加好友
 */

const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const SocialFollow = require('../models/SocialFollow');
const logger = require('../utils/logger');

// WebSocket服务（用于实时推送）
let webSocketService = null;
try {
  webSocketService = require('../services/webSocketService');
} catch (e) {
  logger.warn('WebSocket service not available for friend controller');
}

/**
 * 通过手机号搜索用户
 */
async function searchByPhone(req, res) {
  try {
    const { phone } = req.params;
    const userId = req.user.id;

    // 脱敏处理：允许模糊搜索
    const user = await User.findOne({
      'profile.phone': phone
    }).select('username profile.nickName profile.avatar committeeProfile.qrCode committeeProfile.position');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 不能添加自己为好友
    if (user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: '不能添加自己为好友'
      });
    }

    // 检查是否已经是好友
    const areFriends = await SocialFollow.findOne({
      $or: [
        { follower: userId, following: user._id, relationType: 'friend' },
        { follower: user._id, following: userId, relationType: 'friend' }
      ]
    });

    const result = {
      _id: user._id,
      username: user.username,
      nickName: user.profile?.nickName,
      avatar: user.profile?.avatar,
      qrCode: user.committeeProfile?.qrCode,
      position: user.committeeProfile?.position,
      isFriend: !!areFriends
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('通过手机号搜索用户失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败: ' + error.message
    });
  }
}

/**
 * 通过乡村号/二维码搜索用户
 */
async function searchByQRCode(req, res) {
  try {
    const { qrcode } = req.params;
    const userId = req.user.id;

    const user = await User.findOne({
      'committeeProfile.qrCode': qrcode
    }).select('username profile.nickName profile.avatar committeeProfile.qrCode committeeProfile.position');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 不能添加自己为好友
    if (user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: '不能添加自己为好友'
      });
    }

    // 检查是否已经是好友
    const areFriends = await SocialFollow.findOne({
      $or: [
        { follower: userId, following: user._id, relationType: 'friend' },
        { follower: user._id, following: userId, relationType: 'friend' }
      ]
    });

    const result = {
      _id: user._id,
      username: user.username,
      nickName: user.profile?.nickName,
      avatar: user.profile?.avatar,
      qrCode: user.committeeProfile?.qrCode,
      position: user.committeeProfile?.position,
      isFriend: !!areFriends
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('通过乡村号搜索用户失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败: ' + error.message
    });
  }
}

/**
 * 发送好友请求
 */
async function sendFriendRequest(req, res) {
  try {
    const userId = req.user.id;
    const { toUserId, message, source, sourceDetail } = req.body;

    if (!toUserId) {
      return res.status(400).json({
        success: false,
        message: '请指定要添加的用户'
      });
    }

    if (toUserId === userId) {
      return res.status(400).json({
        success: false,
        message: '不能添加自己为好友'
      });
    }

    // 验证目标用户存在
    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 创建好友请求
    const request = await FriendRequest.createRequest(userId, toUserId, {
      message: message || '',
      source: source || 'other',
      sourceDetail,
      villageId: req.user.villageId
    });

    // 填充完整的请求信息
    const populatedRequest = await FriendRequest.findById(request._id)
      .populate('from', 'username profile.avatar profile.nickName')
      .populate('to', 'username profile.avatar profile.nickName');

    // 通过WebSocket通知目标用户
    if (webSocketService) {
      webSocketService.sendToUser(toUserId, {
        type: 'new_friend_request',
        data: populatedRequest
      });
    }

    res.json({
      success: true,
      data: populatedRequest
    });
  } catch (error) {
    logger.error('发送好友请求失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '发送好友请求失败'
    });
  }
}

/**
 * 获取收到的好友请求列表
 */
async function getPendingRequests(req, res) {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.getPendingRequests(userId);

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    logger.error('获取好友请求列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取好友请求列表失败: ' + error.message
    });
  }
}

/**
 * 获取发送的请求列表
 */
async function getSentRequests(req, res) {
  try {
    const userId = req.user.id;
    const { status, limit = 20 } = req.query;

    const requests = await FriendRequest.getSentRequests(userId, {
      status,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    logger.error('获取发送的请求列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取发送的请求列表失败: ' + error.message
    });
  }
}

/**
 * 接受好友请求
 */
async function acceptFriendRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await FriendRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '请求不存在'
      });
    }

    // 验证请求是发给当前用户的
    if (request.to.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权操作此请求'
      });
    }

    // 接受请求
    await request.accept();

    // 创建双向好友关系（使用SocialFollow模型）
    const follow1 = new SocialFollow({
      follower: request.from,
      following: request.to,
      relationType: 'friend',
      friendshipStatus: 'accepted'
    });

    const follow2 = new SocialFollow({
      follower: request.to,
      following: request.from,
      relationType: 'friend',
      friendshipStatus: 'accepted'
    });

    await Promise.all([follow1.save(), follow2.save()]);

    // 填充用户信息
    const fromUser = await User.findById(request.from)
      .select('username profile.avatar profile.nickName profile.phone');
    const toUser = await User.findById(request.to)
      .select('username profile.avatar profile.nickName profile.phone');

    // 通过WebSocket通知双方
    if (webSocketService) {
      // 通知请求发起者
      webSocketService.sendToUser(request.from.toString(), {
        type: 'friend_request_accepted',
        data: {
          request,
          friend: toUser
        }
      });

      // 通知请求接受者
      webSocketService.sendToUser(request.to.toString(), {
        type: 'new_friend_added',
        data: {
          friend: fromUser
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: '已添加为好友',
        friend: fromUser
      }
    });
  } catch (error) {
    logger.error('接受好友请求失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '接受好友请求失败'
    });
  }
}

/**
 * 拒绝好友请求
 */
async function declineFriendRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const request = await FriendRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '请求不存在'
      });
    }

    // 验证请求是发给当前用户的
    if (request.to.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权操作此请求'
      });
    }

    // 拒绝请求
    await request.decline(reason);

    // 通过WebSocket通知请求发起者
    if (webSocketService) {
      webSocketService.sendToUser(request.from.toString(), {
        type: 'friend_request_declined',
        data: {
          requestId: request._id,
          reason: reason || ''
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: '已拒绝好友请求'
      }
    });
  } catch (error) {
    logger.error('拒绝好友请求失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '拒绝好友请求失败'
    });
  }
}

/**
 * 获取好友列表
 */
async function getFriends(req, res) {
  try {
    const userId = req.user.id;

    // 查找所有好友关系
    const friendships = await SocialFollow.find({
      $or: [
        { follower: userId, relationType: 'friend', friendshipStatus: 'accepted' },
        { following: userId, relationType: 'friend', friendshipStatus: 'accepted' }
      ]
    })
      .populate('follower', 'username profile.avatar profile.nickName profile.phone committeeProfile.qrCode committeeProfile.position')
      .populate('following', 'username profile.avatar profile.nickName profile.phone committeeProfile.qrCode committeeProfile.position')
      .sort({ createdAt: -1 });

    // 提取好友信息（去重）
    const friendsMap = new Map();

    friendships.forEach(friendship => {
      // 确定哪个是好友（不是自己）
      const isFollower = friendship.follower._id.toString() === userId;
      const friend = isFollower ? friendship.following : friendship.follower;

      if (friend && !friendsMap.has(friend._id.toString())) {
        friendsMap.set(friend._id.toString(), {
          _id: friend._id,
          username: friend.username,
          nickName: friend.profile?.nickName,
          avatar: friend.profile?.avatar,
          phone: friend.profile?.phone,
          qrCode: friend.committeeProfile?.qrCode,
          position: friend.committeeProfile?.position,
          alias: friendship.alias,
          tags: friendship.tags || [],
          addedAt: friendship.createdAt
        });
      }
    });

    const friends = Array.from(friendsMap.values());

    res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    logger.error('获取好友列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取好友列表失败: ' + error.message
    });
  }
}

/**
 * 修改好友备注
 */
async function updateFriendAlias(req, res) {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;
    const { alias } = req.body;

    // 查找好友关系
    const friendship = await SocialFollow.findOne({
      follower: userId,
      following: friendId,
      relationType: 'friend'
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: '好友关系不存在'
      });
    }

    friendship.alias = alias;
    await friendship.save();

    res.json({
      success: true,
      data: {
        alias
      }
    });
  } catch (error) {
    logger.error('修改好友备注失败:', error);
    res.status(500).json({
      success: false,
      message: '修改好友备注失败: ' + error.message
    });
  }
}

/**
 * 删除好友
 */
async function deleteFriend(req, res) {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    // 删除双向好友关系
    await SocialFollow.deleteMany({
      $or: [
        { follower: userId, following: friendId, relationType: 'friend' },
        { follower: friendId, following: userId, relationType: 'friend' }
      ]
    });

    // 通过WebSocket通知对方
    if (webSocketService) {
      webSocketService.sendToUser(friendId, {
        type: 'friend_deleted',
        data: {
          userId
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: '已删除好友'
      }
    });
  } catch (error) {
    logger.error('删除好友失败:', error);
    res.status(500).json({
      success: false,
      message: '删除好友失败: ' + error.message
    });
  }
}

/**
 * 获取好友统计信息
 */
async function getFriendStats(req, res) {
  try {
    const userId = req.user.id;

    // 好友总数
    const totalFriends = await SocialFollow.countDocuments({
      follower: userId,
      relationType: 'friend',
      friendshipStatus: 'accepted'
    });

    // 待处理请求数
    const pendingCount = await FriendRequest.countDocuments({
      to: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    res.json({
      success: true,
      data: {
        totalFriends,
        pendingCount
      }
    });
  } catch (error) {
    logger.error('获取好友统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取好友统计失败: ' + error.message
    });
  }
}

/**
 * 上传用户头像
 */
async function uploadAvatar(req, res) {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    // 生成图片访问URL
    const avatarUrl = `/uploads/images/${req.file.filename}`;

    // 更新用户头像
    const user = await User.findByIdAndUpdate(
      userId,
      { 'profile.avatar': avatarUrl },
      { new: true }
    ).select('profile.avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        avatar: user.profile.avatar
      },
      message: '头像上传成功'
    });
  } catch (error) {
    logger.error('上传头像失败:', error);
    res.status(500).json({
      success: false,
      message: '上传头像失败: ' + error.message
    });
  }
}

module.exports = {
  searchByPhone,
  searchByQRCode,
  sendFriendRequest,
  getPendingRequests,
  getSentRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  updateFriendAlias,
  deleteFriend,
  getFriendStats,
  uploadAvatar
};
