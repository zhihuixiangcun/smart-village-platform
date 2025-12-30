/**
 * Socket 服务包装器
 * 为其他控制器提供简化的事件通知接口
 */

const webSocketService = require('./webSocketService');

/**
 * 向村庄广播消息
 * @param {string} villageId - 村庄ID
 * @param {string} event - 事件名称
 * @param {Object} data - 数据
 */
function emitToVillage(villageId, event, data) {
  if (webSocketService.getIO()) {
    webSocketService.broadcastToRoom(`village_${villageId}`, {
      type: event,
      data
    });
  }
}

/**
 * 向所有用户广播消息
 * @param {string} event - 事件名称
 * @param {Object} data - 数据
 */
function broadcastToAll(event, data) {
  if (webSocketService.getIO()) {
    webSocketService.broadcastToAll({
      type: event,
      data
    });
  }
}

/**
 * 向特定用户发送消息
 * @param {string} userId - 用户ID
 * @param {string} event - 事件名称
 * @param {Object} data - 数据
 */
function emitToUser(userId, event, data) {
  if (webSocketService.getIO()) {
    webSocketService.broadcastToUser(userId, {
      type: event,
      data
    });
  }
}

/**
 * 向特定角色发送消息
 * @param {string} role - 角色名称
 * @param {string} event - 事件名称
 * @param {Object} data - 数据
 */
function emitToRole(role, event, data) {
  if (webSocketService.getIO()) {
    webSocketService.broadcastToRole(role, {
      type: event,
      data
    });
  }
}

module.exports = {
  emitToVillage,
  emitToUser,
  emitToRole,
  broadcastToAll,
  webSocketService
};
