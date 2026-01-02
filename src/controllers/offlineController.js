/**
 * 离线模式控制器
 * 处理离线队列和同步相关的API请求
 */

const offlineModeService = require('../services/offlineModeService');
const Logger = require('../utils/logger');
const axios = require('axios');

/**
 * 添加操作到离线队列
 */
async function addToQueue(req, res) {
  try {
    const {
      operationType,
      resourceType,
      method,
      endpoint,
      requestData = {},
      files = [],
      priority = 'normal',
      requiresConfirmation = false,
      villageId = null
    } = req.body;

    // 验证必填字段
    if (!operationType || !resourceType || !method || !endpoint) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['operationType', 'resourceType', 'method', 'endpoint']
      });
    }

    // 构建客户端元数据
    const clientMeta = {
      deviceId: req.headers['x-device-id'],
      platform: req.headers['x-platform'],
      appVersion: req.headers['x-app-version'],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // 添加到队列
    const queueItem = await offlineModeService.addToQueue({
      userId: req.user._id,
      villageId: villageId || req.user.villageId,
      operationType,
      resourceType,
      method,
      endpoint,
      requestData,
      files,
      priority,
      requiresConfirmation,
      clientMeta
    });

    res.status(201).json({
      success: true,
      message: '已添加到离线队列',
      data: {
        queueItemId: queueItem._id,
        operationType: queueItem.operationType,
        resourceType: queueItem.resourceType,
        priority: queueItem.priority,
        status: queueItem.status,
        createdAt: queueItem.createdAt
      }
    });
  } catch (error) {
    Logger.error('添加到离线队列失败:', error);
    res.status(500).json({
      success: false,
      message: '添加到离线队列失败',
      error: error.message
    });
  }
}

/**
 * 获取用户的离线队列
 */
async function getUserQueue(req, res) {
  try {
    const { status, limit, includeFiles } = req.query;
    const userId = req.user._id;

    const result = await offlineModeService.getUserQueue(userId, {
      status,
      limit: parseInt(limit) || 50,
      includeFiles: includeFiles === 'true'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('获取离线队列失败:', error);
    res.status(500).json({
      success: false,
      message: '获取离线队列失败',
      error: error.message
    });
  }
}

/**
 * 获取队列项详情
 */
async function getQueueItem(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const item = await offlineModeService.getQueueItem(id, userId);

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    Logger.error('获取队列项详情失败:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 取消队列项
 */
async function cancelQueueItem(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const item = await offlineModeService.cancelQueueItem(id, userId);

    res.json({
      success: true,
      message: '队列项已取消',
      data: item
    });
  } catch (error) {
    Logger.error('取消队列项失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 批量取消队列项
 */
async function cancelQueueItems(req, res) {
  try {
    const { ids } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要取消的队列项ID列表'
      });
    }

    const result = await offlineModeService.cancelQueueItems(ids, userId);

    res.json({
      success: true,
      message: `已取消 ${result.cancelledCount} 个队列项`,
      data: result
    });
  } catch (error) {
    Logger.error('批量取消队列项失败:', error);
    res.status(500).json({
      success: false,
      message: '批量取消失败',
      error: error.message
    });
  }
}

/**
 * 重试失败的队列项
 */
async function retryQueueItem(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const item = await offlineModeService.retryQueueItem(id, userId);

    res.json({
      success: true,
      message: '队列项已重置为待处理',
      data: item
    });
  } catch (error) {
    Logger.error('重试队列项失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 批量重试失败的队列项
 */
async function retryFailedItems(req, res) {
  try {
    const userId = req.user._id;
    const result = await offlineModeService.retryFailedItems(userId);

    res.json({
      success: true,
      message: `已重置 ${result.retriedCount} 个失败项`,
      data: result
    });
  } catch (error) {
    Logger.error('批量重试失败:', error);
    res.status(500).json({
      success: false,
      message: '批量重试失败',
      error: error.message
    });
  }
}

/**
 * 执行同步
 */
async function executeSync(req, res) {
  try {
    const userId = req.user._id;
    const {
      limit,
      priority,
      resourceTypes,
      villageId,
      syncType,
      triggerReason,
      networkInfo,
      syncScope
    } = req.body;

    // 创建API执行器
    const apiExecutor = async ({ method, endpoint, data, files, headers }) => {
      // 构建完整URL
      const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.MAIN_PORT || 3001}`;
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

      // 构建请求配置
      const config = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers['authorization'] || `Bearer ${req.token}`,
          ...headers
        },
        timeout: 30000 // 30秒超时
      };

      // 添加数据
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        config.data = data;
      }

      // 如果有文件，使用FormData
      if (files && files.length > 0) {
        const FormData = require('form-data');
        const form = new FormData();

        // 添加数据字段
        Object.keys(data).forEach(key => {
          form.append(key, JSON.stringify(data[key]));
        });

        // 添加文件
        for (const file of files) {
          const fs = require('fs');
          if (file.localPath && fs.existsSync(file.localPath)) {
            form.append('files', fs.createReadStream(file.localPath), {
              filename: file.originalName,
              contentType: file.mimeType
            });
          }
        }

        config.data = form;
        config.headers['Content-Type'] = `multipart/form-data; boundary=${form.getBoundary()}`;
      }

      // 执行请求
      const response = await axios(config);
      return response;
    };

    // 执行同步
    const syncOptions = {
      limit: limit || 50,
      priority,
      resourceTypes,
      villageId: villageId || req.user.villageId,
      syncType: syncType || 'manual',
      triggerReason: triggerReason || 'user_request',
      networkInfo: networkInfo || {
        isConnected: true,
        networkType: 'unknown'
      },
      clientInfo: {
        deviceId: req.headers['x-device-id'],
        platform: req.headers['x-platform'],
        appVersion: req.headers['x-app-version']
      },
      syncScope: syncScope || {},
      onProgress: (progress) => {
        // 可选：通过WebSocket发送进度更新
        Logger.info('同步进度', progress);
      }
    };

    const result = await offlineModeService.executeSync(userId, apiExecutor, syncOptions);

    res.json({
      success: true,
      message: '同步已完成',
      data: result
    });
  } catch (error) {
    Logger.error('执行同步失败:', error);

    // 检查是否是已有同步进行中的错误
    if (error.message.includes('已有正在进行的同步')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'SYNC_IN_PROGRESS'
      });
    }

    res.status(500).json({
      success: false,
      message: '同步失败',
      error: error.message
    });
  }
}

/**
 * 获取同步历史
 */
async function getSyncHistory(req, res) {
  try {
    const { limit, status } = req.query;
    const userId = req.user._id;

    const history = await offlineModeService.getSyncHistory(userId, {
      limit: parseInt(limit) || 20,
      status
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    Logger.error('获取同步历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取同步历史失败',
      error: error.message
    });
  }
}

/**
 * 获取同步会话详情
 */
async function getSyncSession(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await offlineModeService.getSyncSession(sessionId, userId);

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    Logger.error('获取同步会话失败:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 获取同步统计
 */
async function getSyncStats(req, res) {
  try {
    const { days = 30 } = req.query;
    const userId = req.user._id;

    const stats = await offlineModeService.getSyncStats(userId, parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    Logger.error('获取同步统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取同步统计失败',
      error: error.message
    });
  }
}

/**
 * 获取失败的队列项
 */
async function getFailedItems(req, res) {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user._id;

    const items = await offlineModeService.getFailedQueueItems(userId, parseInt(limit));

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    Logger.error('获取失败队列项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取失败队列项失败',
      error: error.message
    });
  }
}

/**
 * 获取队列统计
 */
async function getQueueStats(req, res) {
  try {
    const userId = req.user._id;
    const { villageId } = req.query;

    const stats = await offlineModeService.getQueueStats({
      userId,
      villageId
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    Logger.error('获取队列统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取队列统计失败',
      error: error.message
    });
  }
}

/**
 * 获取同步状态
 */
async function getSyncStatus(req, res) {
  try {
    const userId = req.user._id;
    const status = offlineModeService.getSyncStatus(userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    Logger.error('获取同步状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取同步状态失败',
      error: error.message
    });
  }
}

/**
 * 清理已同步项
 */
async function cleanupSynced(req, res) {
  try {
    const { daysOld = 7 } = req.body;
    const userId = req.user._id;

    // 只有管理员可以执行清理操作
    if (!req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以执行清理操作'
      });
    }

    const result = await offlineModeService.cleanupSyncedItems(parseInt(daysOld));

    res.json({
      success: true,
      message: `已清理 ${result.deletedCount} 个已同步记录`,
      data: result
    });
  } catch (error) {
    Logger.error('清理已同步项失败:', error);
    res.status(500).json({
      success: false,
      message: '清理失败',
      error: error.message
    });
  }
}

/**
 * 获取离线模式配置
 */
async function getConfig(req, res) {
  try {
    const config = offlineModeService.getConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    Logger.error('获取离线模式配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败',
      error: error.message
    });
  }
}

/**
 * 批量删除队列项
 */
async function deleteQueueItems(req, res) {
  try {
    const { ids } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的队列项ID列表'
      });
    }

    // 只能删除已取消或已同步的项目
    const OfflineQueue = require('../models/OfflineQueue');
    const result = await OfflineQueue.deleteMany({
      _id: { $in: ids },
      userId,
      status: { $in: ['cancelled', 'synced'] }
    });

    res.json({
      success: true,
      message: `已删除 ${result.deletedCount} 个队列项`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    Logger.error('删除队列项失败:', error);
    res.status(500).json({
      success: false,
      message: '删除失败',
      error: error.message
    });
  }
}

module.exports = {
  addToQueue,
  getUserQueue,
  getQueueItem,
  cancelQueueItem,
  cancelQueueItems,
  retryQueueItem,
  retryFailedItems,
  executeSync,
  getSyncHistory,
  getSyncSession,
  getSyncStats,
  getFailedItems,
  getQueueStats,
  getSyncStatus,
  cleanupSynced,
  getConfig,
  deleteQueueItems
};
