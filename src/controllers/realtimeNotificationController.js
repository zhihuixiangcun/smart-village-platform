/**
 * 实时通知控制器
 * 处理通知相关的API请求
 */

const multiChannelPushService = require('../services/multiChannelPushService');
const webSocketService = require('../services/webSocketService');
const RealtimeNotification = require('../models/RealtimeNotification');
const Logger = require('../utils/logger');

/**
 * 创建并发送通知
 */
async function createNotification(req, res) {
  try {
    const {
      recipient,
      type,
      title,
      content,
      richContent,
      priority = 'normal',
      data,
      related,
      scheduledAt,
      tags,
      channels
    } = req.body;

    // 验证必填字段
    if (!recipient || !type || !title || !content) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['recipient', 'type', 'title', 'content']
      });
    }

    const notificationData = {
      recipient: {
        userId: recipient.userId || recipient.userId,
        villageId: recipient.villageId || req.user.villageId,
        roles: recipient.roles
      },
      type,
      title,
      content,
      richContent,
      priority,
      data,
      related,
      sender: {
        userId: req.user._id,
        name: req.user.name || req.user.username,
        avatar: req.user.avatar
      },
      channels: channels || {},
      scheduledAt,
      tags
    };

    const notification = await multiChannelPushService.createAndSend(notificationData);

    res.status(201).json({
      success: true,
      message: '通知创建成功',
      data: {
        notificationId: notification._id,
        type: notification.type,
        title: notification.title,
        status: notification.status,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    Logger.error('创建通知失败:', error);
    res.status(500).json({
      success: false,
      message: '创建通知失败',
      error: error.message
    });
  }
}

/**
 * 批量创建通知
 */
async function createBulkNotifications(req, res) {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供通知数组'
      });
    }

    if (notifications.length > 100) {
      return res.status(400).json({
        success: false,
        message: '单次批量创建最多100条通知'
      });
    }

    // 补充发送者信息
    const notificationsWithSender = notifications.map(n => ({
      ...n,
      sender: {
        userId: req.user._id,
        name: req.user.name || req.user.username,
        avatar: req.user.avatar
      }
    }));

    const results = await multiChannelPushService.batchSend(notificationsWithSender);

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `批量发送完成，成功 ${successCount} 条`,
      data: {
        total: notifications.length,
        success: successCount,
        failed: notifications.length - successCount,
        results
      }
    });
  } catch (error) {
    Logger.error('批量创建通知失败:', error);
    res.status(500).json({
      success: false,
      message: '批量创建失败',
      error: error.message
    });
  }
}

/**
 * 获取用户通知列表
 */
async function getUserNotifications(req, res) {
  try {
    const {
      unreadOnly = false,
      limit = 20,
      skip = 0,
      type = null
    } = req.query;

    const userId = req.user._id;

    const notifications = await RealtimeNotification.getUserNotifications(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: parseInt(limit),
      skip: parseInt(skip),
      type
    });

    // 获取未读数量
    const unreadCount = await RealtimeNotification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: notifications.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    Logger.error('获取通知列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知列表失败',
      error: error.message
    });
  }
}

/**
 * 获取通知详情
 */
async function getNotification(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await RealtimeNotification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    // 验证权限
    if (notification.recipient.userId.toString() !== userId.toString() &&
        !req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: '无权访问此通知'
      });
    }

    // 记录查看
    await notification.recordView();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    Logger.error('获取通知详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知详情失败',
      error: error.message
    });
  }
}

/**
 * 标记通知已读
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await RealtimeNotification.findOne({
      _id: id,
      'recipient.userId': userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    await notification.markAsRead();

    // 通过WebSocket通知前端更新
    webSocketService.broadcastToUser(userId, {
      type: 'notification_read',
      data: {
        notificationId: id,
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: '已标记为已读',
      data: {
        notificationId: id,
        readAt: notification.readStatus.readAt
      }
    });
  } catch (error) {
    Logger.error('标记已读失败:', error);
    res.status(500).json({
      success: false,
      message: '标记已读失败',
      error: error.message
    });
  }
}

/**
 * 标记所有通知已读
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.user._id;

    const result = await RealtimeNotification.markAllAsRead(userId);

    // 通过WebSocket通知前端更新
    webSocketService.broadcastToUser(userId, {
      type: 'all_notifications_read',
      data: {
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: '所有通知已标记为已读',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    Logger.error('标记全部已读失败:', error);
    res.status(500).json({
      success: false,
      message: '标记全部已读失败',
      error: error.message
    });
  }
}

/**
 * 删除通知
 */
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await RealtimeNotification.findOne({
      _id: id,
      'recipient.userId': userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    await notification.delete();

    res.json({
      success: true,
      message: '通知已删除'
    });
  } catch (error) {
    Logger.error('删除通知失败:', error);
    res.status(500).json({
      success: false,
      message: '删除通知失败',
      error: error.message
    });
  }
}

/**
 * 批量删除通知
 */
async function deleteBulkNotifications(req, res) {
  try {
    const { ids } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供通知ID数组'
      });
    }

    const result = await RealtimeNotification.deleteMany({
      _id: { $in: ids },
      'recipient.userId': userId
    });

    res.json({
      success: true,
      message: `已删除 ${result.deletedCount} 条通知`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    Logger.error('批量删除通知失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除失败',
      error: error.message
    });
  }
}

/**
 * 获取未读数量
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.user._id;

    const unreadCount = await RealtimeNotification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    Logger.error('获取未读数量失败:', error);
    res.status(500).json({
      success: false,
      message: '获取未读数量失败',
      error: error.message
    });
  }
}

/**
 * 获取WebSocket连接状态
 */
async function getWebSocketStatus(req, res) {
  try {
    const userId = req.user._id;
    const stats = webSocketService.getStats();

    const userStatus = webSocketService.connectedUsers.has(userId);

    res.json({
      success: true,
      data: {
        isConnected: userStatus,
        serverStats: stats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    Logger.error('获取WebSocket状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取状态失败',
      error: error.message
    });
  }
}

/**
 * 获取推送配置
 */
async function getPushConfig(req, res) {
  try {
    const config = multiChannelPushService.getConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    Logger.error('获取推送配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败',
      error: error.message
    });
  }
}

/**
 * 发送测试通知
 */
async function sendTestNotification(req, res) {
  try {
    const { channels = ['websocket'] } = req.body;

    const testNotification = {
      recipient: {
        userId: req.user._id,
        villageId: req.user.villageId
      },
      type: 'system',
      title: '测试通知',
      content: '这是一条测试通知，如果您收到此消息，说明通知系统工作正常。',
      priority: 'normal',
      data: {
        test: true,
        timestamp: new Date()
      },
      channels: {
        websocket: channels.includes('websocket'),
        push: channels.includes('push')
      },
      sender: {
        userId: req.user._id,
        name: req.user.name || req.user.username
      }
    };

    const notification = await multiChannelPushService.createAndSend(testNotification);

    res.json({
      success: true,
      message: '测试通知已发送',
      data: {
        notificationId: notification._id,
        channels
      }
    });
  } catch (error) {
    Logger.error('发送测试通知失败:', error);
    res.status(500).json({
      success: false,
      message: '发送测试通知失败',
      error: error.message
    });
  }
}

/**
 * 处理通知点击
 */
async function handleNotificationClick(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const notification = await RealtimeNotification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    // 记录点击
    await notification.recordClick();

    // 执行关联操作
    let redirectUrl = null;
    if (notification.related && notification.related.action) {
      switch (notification.related.action) {
      case 'view_announcement':
        redirectUrl = `/announcements/${notification.related.id}`;
        break;
      case 'view_financial':
        redirectUrl = `/finance/${notification.related.id}`;
        break;
      case 'view_task':
        redirectUrl = `/tasks/${notification.related.id}`;
        break;
      case 'view_emergency':
        redirectUrl = `/emergency/${notification.related.id}`;
        break;
      default:
        if (notification.related.route) {
          redirectUrl = notification.related.route;
        }
      }
    }

    res.json({
      success: true,
      data: {
        notificationId: id,
        action: notification.related?.action,
        redirectUrl
      }
    });
  } catch (error) {
    Logger.error('处理通知点击失败:', error);
    res.status(500).json({
      success: false,
      message: '处理失败',
      error: error.message
    });
  }
}

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteBulkNotifications,
  getUnreadCount,
  getWebSocketStatus,
  getPushConfig,
  sendTestNotification,
  handleNotificationClick
};
