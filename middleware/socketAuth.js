/**
 * Socket.IO JWT认证中间件
 * 确保只有经过身份验证的用户可以建立WebSocket连接
 */

const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

/**
 * Socket.IO JWT认证中间件
 * @param {Socket} socket - Socket.IO socket实例
 * @param {Function} next - 下一个中间件函数
 */
async function socketAuthMiddleware(socket, next) {
  try {
    // 从socket握手信息中获取token
    const token = socket.handshake.auth.token || 
                 socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                 socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // 验证JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.userId) {
      return next(new Error('Invalid authentication token'));
    }

    // 从数据库验证用户
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('villageId', 'name code');

    if (!user) {
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      return next(new Error('User account is inactive'));
    }

    // 将用户信息附加到socket
    socket.user = user;
    socket.userId = user._id.toString();
    socket.villageId = user.villageId?._id?.toString() || user.villageId?.toString();

    console.log(`[SOCKET-AUTH] User ${user.username} (${user.role}) authenticated successfully`);
    
    next();
  } catch (error) {
    console.error('[SOCKET-AUTH] Authentication failed:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid authentication token'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication token expired'));
    } else {
      return next(new Error('Authentication failed'));
    }
  }
}

/**
 * 村级权限检查中间件
 * 确保用户只能访问自己村庄的数据
 * @param {string} villageId - 村庄ID
 * @param {Socket} socket - Socket.IO socket实例
 */
function checkVillageAccess(villageId, socket) {
  if (!socket.villageId) {
    return false;
  }

  // 管理员可以访问所有村庄
  if (socket.user.role === 'admin') {
    return true;
  }

  // 检查是否为同一村庄
  return socket.villageId === villageId.toString();
}

/**
 * 角色权限检查中间件
 * @param {Array} allowedRoles - 允许的角色列表
 * @param {Socket} socket - Socket.IO socket实例
 */
function checkRolePermission(allowedRoles, socket) {
  if (!socket.user || !socket.user.role) {
    return false;
  }

  // 管理员拥有所有权限
  if (socket.user.role === 'admin') {
    return true;
  }

  return allowedRoles.includes(socket.user.role);
}

/**
 * 创建认证的事件处理器包装器
 * @param {Function} handler - 原始事件处理函数
 * @param {Object} options - 权限选项
 * @returns {Function} 包装后的处理函数
 */
function authenticatedHandler(handler, options = {}) {
  const {
    requireVillageId = false,
    allowedRoles = [],
    auditLog = true
  } = options;

  return async (socket, data, callback) => {
    try {
      // 检查权限
      if (requireVillageId && data.villageId) {
        if (!checkVillageAccess(data.villageId, socket)) {
          throw new Error('Access denied: You can only access your own village data');
        }
      }

      if (allowedRoles.length > 0) {
        if (!checkRolePermission(allowedRoles, socket)) {
          throw new Error('Access denied: Insufficient permissions');
        }
      }

      // 记录审计日志
      if (auditLog) {
        console.log(`[SOCKET-AUDIT] User ${socket.user.username} performed ${handler.name} with data:`, {
          userId: socket.userId,
          villageId: socket.villageId,
          role: socket.user.role,
          timestamp: new Date().toISOString()
        });
      }

      // 执行原始处理函数
      await handler(socket, data, callback);
    } catch (error) {
      console.error(`[SOCKET-AUTH] Handler ${handler.name} failed:`, error.message);
      
      if (callback && typeof callback === 'function') {
        callback({
          success: false,
          error: error.message
        });
      } else {
        socket.emit('error', {
          type: 'auth_error',
          message: error.message
        });
      }
    }
  };
}

/**
 * 用户活动监控中间件
 * 跟踪用户连接和活动状态
 */
function trackUserActivity() {
  return function(socket, next) {
    // 用户连接时记录
    socket.on('connect', () => {
      console.log(`[SOCKET-ACTIVITY] User ${socket.user?.username} connected from ${socket.handshake.address}`);
      
      // 更新用户最后活动时间
      if (socket.user) {
        User.findByIdAndUpdate(socket.userId, {
          lastLoginAt: new Date(),
          isOnline: true
        }).catch(err => {
          console.error('[SOCKET-ACTIVITY] Failed to update user activity:', err);
        });
      }
    });

    // 用户断开连接时记录
    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET-ACTIVITY] User ${socket.user?.username} disconnected: ${reason}`);
      
      // 更新用户状态为离线
      if (socket.user) {
        User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastActivityAt: new Date()
        }).catch(err => {
          console.error('[SOCKET-ACTIVITY] Failed to update user offline status:', err);
        });
      }
    });

    next();
  };
}

module.exports = {
  socketAuthMiddleware,
  checkVillageAccess,
  checkRolePermission,
  authenticatedHandler,
  trackUserActivity
};