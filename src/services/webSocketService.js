/**
 * WebSocket增强服务
 * 提供连接管理、消息分类、优先级处理、历史记录等功能
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const NotificationModel = require('../models/Notification');
const logger = require('../config/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket info
    this.userRooms = new Map(); // userId -> Set of rooms
    this.messageQueue = [];
    this.isProcessingQueue = false;

    // 消息优先级队列
    this.priorityQueues = {
      high: [],
      medium: [],
      low: []
    };

    // 统计信息
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      totalRooms: 0
    };

    // 配置
    this.config = {
      maxConnections: 10000,
      messageQueueSize: 1000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
      reconnectAttempts: 5,
      reconnectDelay: 5000
    };
  }

  /**
   * 初始化WebSocket服务
   * @param {http.Server} httpServer - HTTP服务器实例
   * @param {Object} options - Socket.IO选项
   */
  initialize(httpServer, options = {}) {
    try {
      const defaultOptions = {
        cors: {
          origin: process.env.CLIENT_URL || 'http://localhost:3000',
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        maxHttpBufferSize: 1e8,
        pingTimeout: 60000,
        pingInterval: 25000
      };

      this.io = new Server(httpServer, { ...defaultOptions, ...options });

      this.setupMiddleware();
      this.setupEventHandlers();
      this.startHeartbeat();
      this.startMessageProcessor();

      logger.info('WebSocket服务初始化成功');
    } catch (error) {
      logger.error('WebSocket服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // 身份认证中间件
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('未提供认证令牌'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userInfo = decoded;

        logger.info(`WebSocket用户认证成功: ${decoded.userId}`);
        next();
      } catch (error) {
        logger.error('WebSocket认证失败:', error);
        next(new Error('认证失败'));
      }
    });

    // 连接限制中间件
    this.io.use((socket, next) => {
      if (this.stats.activeConnections >= this.config.maxConnections) {
        return next(new Error('连接数已达到上限'));
      }
      next();
    });
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    this.io.on('error', (error) => {
      logger.error('WebSocket服务器错误:', error);
    });
  }

  /**
   * 处理连接
   * @param {Object} socket - Socket实例
   */
  handleConnection(socket) {
    const userId = socket.userId;

    // 更新连接统计
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    // 记录用户连接信息
    this.connectedUsers.set(userId, {
      socketId: socket.id,
      socket,
      userId,
      userInfo: socket.userInfo,
      connectedAt: new Date(),
      lastActivity: new Date(),
      status: 'active'
    });

    // 初始化用户房间
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }

    // 发送连接成功消息
    socket.emit('connected', {
      status: 'success',
      userId,
      timestamp: new Date(),
      serverTime: Date.now()
    });

    // 自动加入用户房间
    this.joinUserRoom(userId, `user_${userId}`);

    // 根据用户角色加入相应房间
    if (socket.userInfo.role) {
      this.joinUserRoom(userId, `role_${socket.userInfo.role}`);
    }

    // 如果有村庄信息，加入村庄房间
    if (socket.userInfo.villageId) {
      this.joinUserRoom(userId, `village_${socket.userInfo.villageId}`);
    }

    // 设置用户特定的事件监听器
    this.setupUserEventListeners(socket);

    logger.info(`用户连接WebSocket: ${userId}, 当前活跃连接: ${this.stats.activeConnections}`);

    // 发送未读通知给用户
    this.sendPendingNotifications(userId);
  }

  /**
   * 设置用户事件监听器
   * @param {Object} socket - Socket实例
   */
  setupUserEventListeners(socket) {
    const userId = socket.userId;

    // 处理加入房间
    socket.on('join-room', (roomName) => {
      this.joinUserRoom(userId, roomName);
      socket.emit('joined-room', { room: roomName, success: true });
    });

    // 处理离开房间
    socket.on('leave-room', (roomName) => {
      this.leaveUserRoom(userId, roomName);
      socket.emit('left-room', { room: roomName, success: true });
    });

    // 处理消息发送
    socket.on('send-message', (data) => {
      this.handleUserMessage(userId, data);
    });

    // ========== 聊天相关事件 ==========

    // 处理加入会话房间
    socket.on('join-conversation', (conversationId) => {
      this.joinConversationRoom(userId, conversationId);
      socket.emit('joined-conversation', { conversationId, success: true });
    });

    // 处理离开会话房间
    socket.on('leave-conversation', (conversationId) => {
      this.leaveConversationRoom(userId, conversationId);
      socket.emit('left-conversation', { conversationId, success: true });
    });

    // 处理正在输入状态
    socket.on('typing-status', (data) => {
      const { conversationId, isTyping } = data;
      if (conversationId) {
        this.sendTypingStatus(conversationId, userId, isTyping);
      }
    });

    // 处理消息已读
    socket.on('messages-read', (data) => {
      const { conversationId, messageIds } = data;
      if (conversationId && messageIds && messageIds.length > 0) {
        this.sendReadReceipt(conversationId, messageIds, userId);
      }
    });

    // ========== 通知相关事件 ==========

    // 处理通知状态更新
    socket.on('mark-notification-read', (notificationId) => {
      this.markNotificationRead(userId, notificationId);
    });

    // 处理心跳
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
      this.updateUserActivity(userId);
    });

    // 处理断开连接
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(userId, reason);
    });

    // 处理连接错误
    socket.on('error', (error) => {
      logger.error(`WebSocket连接错误 (用户: ${userId}):`, error);
    });
  }

  /**
   * 处理用户消息
   * @param {string} userId - 用户ID
   * @param {Object} message - 消息对象
   */
  async handleUserMessage(userId, message) {
    try {
      this.updateUserActivity(userId);
      this.stats.messagesReceived++;

      // 验证消息格式
      if (!message.type || !message.content) {
        throw new Error('消息格式无效');
      }

      // 创建消息记录
      const messageRecord = {
        id: this.generateMessageId(),
        userId,
        type: message.type,
        content: message.content,
        data: message.data || {},
        timestamp: new Date(),
        priority: message.priority || 'medium'
      };

      // 根据消息类型处理
      switch (message.type) {
      case 'notification':
        await this.handleNotificationMessage(userId, messageRecord);
        break;
      case 'chat':
        await this.handleChatMessage(userId, messageRecord);
        break;
      case 'system':
        await this.handleSystemMessage(userId, messageRecord);
        break;
      default:
        logger.warn(`未知消息类型: ${message.type}`);
      }

    } catch (error) {
      logger.error(`处理用户消息失败 (用户: ${userId}):`, error);
    }
  }

  /**
   * 处理通知消息
   * @param {string} userId - 用户ID
   * @param {Object} message - 消息记录
   */
  async handleNotificationMessage(userId, message) {
    // 保存通知到数据库
    const notification = new NotificationModel({
      recipientId: userId,
      type: message.data.type || 'notification',
      title: message.data.title || '通知',
      content: message.content,
      data: message.data,
      channels: ['websocket'],
      priority: message.priority
    });

    await notification.save();

    // 广播通知
    this.broadcastToUser(userId, {
      type: 'notification',
      data: {
        id: notification._id,
        title: message.data.title || '通知',
        content: message.content,
        timestamp: notification.createdAt,
        priority: message.priority
      }
    }, message.priority);
  }

  /**
   * 处理聊天消息
   * @param {string} userId - 用户ID
   * @param {Object} message - 消息记录
   */
  async handleChatMessage(userId, message) {
    logger.info(`聊天消息 (用户: ${userId}):`, message.content);

    const { conversationId, type, content, replyTo, mentions, mentionAll } = message.data || {};

    if (!conversationId) {
      logger.warn('聊天消息缺少会话ID');
      return;
    }

    // 发送消息到会话房间
    this.sendChatMessage(conversationId, {
      senderId: userId,
      type: type || 'text',
      content,
      replyTo,
      mentions: mentions || [],
      mentionAll: mentionAll || false,
      timestamp: new Date()
    });
  }

  /**
   * 加入会话房间
   * @param {string} userId - 用户ID
   * @param {string} conversationId - 会话ID
   */
  joinConversationRoom(userId, conversationId) {
    const roomName = `conversation_${conversationId}`;
    this.joinUserRoom(userId, roomName);
    logger.debug(`用户 ${userId} 加入会话房间: ${roomName}`);

    // 通知会话中的其他用户
    this.broadcastToRoom(roomName, {
      type: 'user_joined_conversation',
      data: {
        userId,
        conversationId,
        timestamp: new Date()
      }
    });
  }

  /**
   * 离开会话房间
   * @param {string} userId - 用户ID
   * @param {string} conversationId - 会话ID
   */
  leaveConversationRoom(userId, conversationId) {
    const roomName = `conversation_${conversationId}`;
    this.leaveUserRoom(userId, roomName);
    logger.debug(`用户 ${userId} 离开会话房间: ${roomName}`);

    // 通知会话中的其他用户
    this.broadcastToRoom(roomName, {
      type: 'user_left_conversation',
      data: {
        userId,
        conversationId,
        timestamp: new Date()
      }
    });
  }

  /**
   * 发送聊天消息到会话房间
   * @param {string} conversationId - 会话ID
   * @param {Object} message - 消息对象
   */
  sendChatMessage(conversationId, message) {
    const roomName = `conversation_${conversationId}`;
    this.broadcastToRoom(roomName, {
      type: 'new_message',
      data: {
        ...message,
        conversationId
      }
    }, 'high');
  }

  /**
   * 发送正在输入状态
   * @param {string} conversationId - 会话ID
   * @param {string} userId - 用户ID
   * @param {boolean} isTyping - 是否正在输入
   */
  sendTypingStatus(conversationId, userId, isTyping) {
    const roomName = `conversation_${conversationId}`;
    this.broadcastToRoom(roomName, {
      type: 'typing_status',
      data: {
        userId,
        conversationId,
        isTyping,
        timestamp: new Date()
      }
    });
  }

  /**
   * 发送已读回执
   * @param {string} conversationId - 会话ID
   * @param {Array<string>} messageIds - 消息ID列表
   * @param {string} userId - 阅读用户ID
   */
  sendReadReceipt(conversationId, messageIds, userId) {
    const roomName = `conversation_${conversationId}`;
    this.broadcastToRoom(roomName, {
      type: 'messages_read',
      data: {
        conversationId,
        messageIds,
        userId,
        timestamp: new Date()
      }
    }, 'medium');
  }

  /**
   * 发送好友请求通知
   * @param {string} toUserId - 目标用户ID
   * @param {Object} request - 好友请求对象
   */
  sendFriendRequestNotification(toUserId, request) {
    this.broadcastToUser(toUserId, {
      type: 'new_friend_request',
      data: {
        requestId: request._id,
        fromUser: request.from,
        message: request.message,
        source: request.source,
        createdAt: request.createdAt
      }
    }, 'high');
  }

  /**
   * 发送好友请求被接受通知
   * @param {string} toUserId - 目标用户ID（请求发起者）
   * @param {Object} friend - 新好友信息
   */
  sendFriendRequestAcceptedNotification(toUserId, friend) {
    this.broadcastToUser(toUserId, {
      type: 'friend_request_accepted',
      data: {
        friend,
        timestamp: new Date()
      }
    }, 'high');
  }

  /**
   * 发送好友请求被拒绝通知
   * @param {string} toUserId - 目标用户ID（请求发起者）
   * @param {string} reason - 拒绝原因
   */
  sendFriendRequestDeclinedNotification(toUserId, reason) {
    this.broadcastToUser(toUserId, {
      type: 'friend_request_declined',
      data: {
        reason,
        timestamp: new Date()
      }
    }, 'medium');
  }

  /**
   * 发送新好友添加通知
   * @param {string} toUserId - 目标用户ID
   * @param {Object} friend - 新好友信息
   */
  sendNewFriendAddedNotification(toUserId, friend) {
    this.broadcastToUser(toUserId, {
      type: 'new_friend_added',
      data: {
        friend,
        timestamp: new Date()
      }
    }, 'high');
  }

  /**
   * 发送好友删除通知
   * @param {string} toUserId - 目标用户ID
   * @param {string} userId - 删除者的用户ID
   */
  sendFriendDeletedNotification(toUserId, userId) {
    this.broadcastToUser(toUserId, {
      type: 'friend_deleted',
      data: {
        userId,
        timestamp: new Date()
      }
    }, 'medium');
  }

  /**
   * 发送消息撤回通知
   * @param {string} conversationId - 会话ID
   * @param {string} messageId - 消息ID
   * @param {string} userId - 撤回者用户ID
   */
  sendMessageRecalledNotification(conversationId, messageId, userId) {
    const roomName = `conversation_${conversationId}`;
    this.broadcastToRoom(roomName, {
      type: 'message_recalled',
      data: {
        conversationId,
        messageId,
        userId,
        timestamp: new Date()
      }
    }, 'high');
  }

  /**
   * 发送会话更新通知
   * @param {string} userId - 目标用户ID
   * @param {Object} conversationData - 会话数据
   */
  sendConversationUpdatedNotification(userId, conversationData) {
    this.broadcastToUser(userId, {
      type: 'conversation_updated',
      data: {
        ...conversationData,
        timestamp: new Date()
      }
    }, 'high');
  }

  /**
   * 发送新会话通知
   * @param {string} userId - 目标用户ID
   * @param {Object} conversation - 会话对象
   */
  sendNewConversationNotification(userId, conversation) {
    this.broadcastToUser(userId, {
      type: 'new_conversation',
      data: {
        conversation,
        timestamp: new Date()
      }
    }, 'high');
  }

  /**
   * 处理系统消息
   * @param {string} userId - 用户ID
   * @param {Object} message - 消息记录
   */
  async handleSystemMessage(userId, message) {
    logger.info(`系统消息 (用户: ${userId}):`, message);

    // 处理系统级消息
    switch (message.data.action) {
    case 'get-status':
      this.sendUserStatus(userId);
      break;
    case 'get-online-users':
      this.sendOnlineUsers(userId);
      break;
    default:
      logger.warn(`未知系统消息操作: ${message.data.action}`);
    }
  }

  /**
   * 加入用户房间
   * @param {string} userId - 用户ID
   * @param {string} roomName - 房间名称
   */
  joinUserRoom(userId, roomName) {
    const userSocket = this.connectedUsers.get(userId);
    if (!userSocket) return;

    const socket = userSocket.socket;
    socket.join(roomName);

    // 记录用户房间
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(roomName);

    // 更新房间统计
    this.stats.totalRooms = Math.max(this.stats.totalRooms, this.io.sockets.adapter.rooms.size);

    logger.debug(`用户 ${userId} 加入房间: ${roomName}`);
  }

  /**
   * 离开用户房间
   * @param {string} userId - 用户ID
   * @param {string} roomName - 房间名称
   */
  leaveUserRoom(userId, roomName) {
    const userSocket = this.connectedUsers.get(userId);
    if (!userSocket) return;

    const socket = userSocket.socket;
    socket.leave(roomName);

    // 从记录中移除
    if (this.userRooms.has(userId)) {
      this.userRooms.get(userId).delete(roomName);
    }

    logger.debug(`用户 ${userId} 离开房间: ${roomName}`);
  }

  /**
   * 处理断开连接
   * @param {string} userId - 用户ID
   * @param {string} reason - 断开原因
   */
  handleDisconnection(userId, reason) {
    // 更新统计
    this.stats.activeConnections--;

    // 清理用户数据
    this.connectedUsers.delete(userId);
    this.userRooms.delete(userId);

    logger.info(`用户断开WebSocket连接: ${userId}, 原因: ${reason}, 剩余连接: ${this.stats.activeConnections}`);
  }

  /**
   * 发送消息到特定用户
   * @param {string} userId - 用户ID
   * @param {Object} message - 消息对象
   * @param {string} priority - 消息优先级
   */
  broadcastToUser(userId, message, priority = 'medium') {
    const userSocket = this.connectedUsers.get(userId);
    if (!userSocket) {
      // 用户不在线，将消息加入队列
      this.queueMessage({ userId, message, priority });
      return;
    }

    const socket = userSocket.socket;
    socket.emit('message', {
      ...message,
      timestamp: new Date(),
      serverTime: Date.now()
    });

    this.stats.messagesSent++;
  }

  /**
   * 发送消息到特定房间
   * @param {string} roomName - 房间名称
   * @param {Object} message - 消息对象
   * @param {string} priority - 消息优先级
   */
  broadcastToRoom(roomName, message, priority = 'medium') {
    this.io.to(roomName).emit('message', {
      ...message,
      timestamp: new Date(),
      serverTime: Date.now()
    });

    this.stats.messagesSent++;
  }

  /**
   * 发送消息到特定角色
   * @param {string} role - 用户角色
   * @param {Object} message - 消息对象
   * @param {string} priority - 消息优先级
   */
  broadcastToRole(role, message, priority = 'medium') {
    this.io.to(`role_${role}`).emit('message', {
      ...message,
      timestamp: new Date(),
      serverTime: Date.now()
    });

    this.stats.messagesSent++;
  }

  /**
   * 发送消息到所有用户
   * @param {Object} message - 消息对象
   * @param {string} priority - 消息优先级
   */
  broadcastToAll(message, priority = 'medium') {
    this.io.emit('message', {
      ...message,
      timestamp: new Date(),
      serverTime: Date.now()
    });

    this.stats.messagesSent++;
  }

  /**
   * 队列消息
   * @param {Object} messageData - 消息数据
   */
  queueMessage(messageData) {
    const { priority = 'medium' } = messageData;

    // 检查队列大小
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      // 移除最旧的低优先级消息
      this.removeOldestLowPriorityMessage();
    }

    // 按优先级加入队列
    this.priorityQueues[priority].push(messageData);
    this.messageQueue.push(messageData);
  }

  /**
   * 移除最旧的低优先级消息
   */
  removeOldestLowPriorityMessage() {
    if (this.priorityQueues.low.length > 0) {
      const message = this.priorityQueues.low.shift();
      const index = this.messageQueue.indexOf(message);
      if (index > -1) {
        this.messageQueue.splice(index, 1);
      }
    }
  }

  /**
   * 启动消息处理器
   */
  startMessageProcessor() {
    setInterval(() => {
      if (!this.isProcessingQueue) {
        this.processMessageQueue();
      }
    }, 1000); // 每秒处理一次
  }

  /**
   * 处理消息队列
   */
  async processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      // 按优先级处理消息
      const priorities = ['high', 'medium', 'low'];

      for (const priority of priorities) {
        const queue = this.priorityQueues[priority];

        while (queue.length > 0) {
          const messageData = queue.shift();

          // 移除主队列中的消息
          const index = this.messageQueue.indexOf(messageData);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }

          // 处理消息
          await this.processQueuedMessage(messageData);
        }
      }
    } catch (error) {
      logger.error('处理消息队列失败:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 处理队列中的消息
   * @param {Object} messageData - 消息数据
   */
  async processQueuedMessage(messageData) {
    const { userId, message, priority } = messageData;

    // 检查用户是否在线
    if (this.connectedUsers.has(userId)) {
      this.broadcastToUser(userId, message, priority);
    } else {
      // 用户仍不在线，可以考虑其他通知方式
      logger.debug(`用户 ${userId} 仍不在线，消息保留在队列中`);
    }
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat() {
    setInterval(() => {
      this.checkHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * 检查心跳
   */
  checkHeartbeat() {
    const now = Date.now();
    const timeout = this.config.heartbeatTimeout;

    for (const [userId, userInfo] of this.connectedUsers) {
      if (now - userInfo.lastActivity.getTime() > timeout) {
        logger.warn(`用户 ${userId} 心跳超时，断开连接`);
        userInfo.socket.disconnect(true);
      }
    }
  }

  /**
   * 更新用户活动时间
   * @param {string} userId - 用户ID
   */
  updateUserActivity(userId) {
    const userInfo = this.connectedUsers.get(userId);
    if (userInfo) {
      userInfo.lastActivity = new Date();
    }
  }

  /**
   * 发送未读通知
   * @param {string} userId - 用户ID
   */
  async sendPendingNotifications(userId) {
    try {
      const unreadNotifications = await NotificationModel.find({
        recipientId: userId,
        isRead: false,
        status: { $ne: 'failed' }
      }).sort({ createdAt: -1 }).limit(10);

      if (unreadNotifications.length > 0) {
        this.broadcastToUser(userId, {
          type: 'pending-notifications',
          data: {
            count: unreadNotifications.length,
            notifications: unreadNotifications.map(n => ({
              id: n._id,
              type: n.type,
              title: n.title,
              content: n.content,
              timestamp: n.createdAt
            }))
          }
        }, 'high');
      }
    } catch (error) {
      logger.error(`发送未读通知失败 (用户: ${userId}):`, error);
    }
  }

  /**
   * 标记通知已读
   * @param {string} userId - 用户ID
   * @param {string} notificationId - 通知ID
   */
  async markNotificationRead(userId, notificationId) {
    try {
      const notification = await NotificationModel.findOneAndUpdate(
        { _id: notificationId, recipientId: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (notification) {
        this.broadcastToUser(userId, {
          type: 'notification-read',
          data: { notificationId: notification._id }
        });
      }
    } catch (error) {
      logger.error('标记通知已读失败:', error);
    }
  }

  /**
   * 发送用户状态
   * @param {string} userId - 用户ID
   */
  sendUserStatus(userId) {
    const userInfo = this.connectedUsers.get(userId);
    if (!userInfo) return;

    this.broadcastToUser(userId, {
      type: 'user-status',
      data: {
        userId,
        connectedAt: userInfo.connectedAt,
        lastActivity: userInfo.lastActivity,
        rooms: Array.from(this.userRooms.get(userId) || []),
        stats: this.stats
      }
    });
  }

  /**
   * 发送在线用户列表
   * @param {string} userId - 请求用户ID
   */
  sendOnlineUsers(userId) {
    const onlineUsers = Array.from(this.connectedUsers.entries()).map(([uid, info]) => ({
      userId: uid,
      userName: info.userInfo.displayName || info.userInfo.userName,
      role: info.userInfo.role,
      connectedAt: info.connectedAt,
      lastActivity: info.lastActivity
    }));

    this.broadcastToUser(userId, {
      type: 'online-users',
      data: {
        count: onlineUsers.length,
        users: onlineUsers
      }
    });
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      connectedUsers: this.connectedUsers.size,
      queueSize: this.messageQueue.length,
      highPriorityQueue: this.priorityQueues.high.length,
      mediumPriorityQueue: this.priorityQueues.medium.length,
      lowPriorityQueue: this.priorityQueues.low.length
    };
  }

  /**
   * 生成消息ID
   * @returns {string} 消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取IO实例
   * @returns {Object} Socket.IO实例
   */
  getIO() {
    return this.io;
  }
}

// 创建单例实例
const webSocketService = new WebSocketService();

module.exports = webSocketService;