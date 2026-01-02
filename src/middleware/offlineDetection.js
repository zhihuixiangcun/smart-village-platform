/**
 * 离线检测中间件
 * 检测客户端网络状态和离线模式
 */

const Logger = require('../utils/logger');

/**
 * 网络状态检测中间件
 * 检查请求头中的网络状态信息
 */
const networkDetection = (req, res, next) => {
  // 从请求头获取网络状态
  const networkInfo = {
    isOnline: req.headers['x-online'] !== 'false',
    isOfflineMode: req.headers['x-offline-mode'] === 'true',
    networkType: req.headers['x-network-type'] || 'unknown',
    effectiveType: req.headers['x-effective-type'] || null,
    signalStrength: parseInt(req.headers['x-signal-strength']) || null,
    estimatedBandwidth: parseFloat(req.headers['x-bandwidth']) || null,
    rtt: parseInt(req.headers['x-rtt']) || null
  };

  // 附加到请求对象
  req.networkInfo = networkInfo;

  // 记录网络状态
  if (networkInfo.isOfflineMode) {
    Logger.debug('离线模式请求', {
      userId: req.user?._id,
      path: req.path,
      networkInfo
    });
  }

  next();
};

/**
 * 离线模式响应头中间件
 * 在响应中添加离线模式相关的头信息
 */
const offlineResponseHeaders = (req, res, next) => {
  // 原始的 json 方法
  const originalJson = res.json;

  // 重写 json 方法
  res.json = function(data) {
    // 如果是离线模式请求，添加特殊响应头
    if (req.networkInfo?.isOfflineMode) {
      res.setHeader('X-Offline-Mode', 'true');
      res.setHeader('X-Queue-Supported', 'true');
      res.setHeader('X-Sync-Required', 'true');
    }

    // 如果响应包含需要同步的数据，添加相应头信息
    if (data?.requiresSync) {
      res.setHeader('X-Requires-Sync', 'true');
    }

    // 调用原始方法
    return originalJson.call(this, data);
  };

  next();
};

/**
 * 离线请求拦截中间件
 * 拦截在离线模式下的写操作请求
 */
const offlineRequestInterceptor = (options = {}) => {
  const {
    allowReadOperations = true,
    allowWriteOperations = false,
    allowEmergencyOperations = true,
    queueWriteOperations = true
  } = options;

  return (req, res, next) => {
    // 检查是否是离线模式
    if (!req.networkInfo?.isOfflineMode) {
      return next();
    }

    // 获取请求方法
    const method = req.method.toUpperCase();
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // 如果是写操作且不允许
    if (isWriteOperation && !allowWriteOperations) {
      // 紧急操作可能被允许
      const isEmergency = req.path.includes('/emergency') ||
                          req.path.includes('/urgent') ||
                          req.body?.operationType === 'emergency';

      if (isEmergency && allowEmergencyOperations) {
        return next();
      }

      // 如果允许将写操作加入队列
      if (queueWriteOperations) {
        // 添加特殊标记，让后续处理将请求加入队列
        req.shouldQueue = true;
        return next();
      }

      return res.status(503).json({
        success: false,
        message: '当前处于离线模式，无法执行此操作',
        code: 'OFFLINE_MODE',
        suggestion: '该操作已被加入队列，将在网络恢复后自动同步'
      });
    }

    // 只读操作正常处理
    if (!isWriteOperation && allowReadOperations) {
      return next();
    }

    next();
  };
};

/**
 * 离线数据验证中间件
 * 验证离线模式下的请求数据
 */
const offlineDataValidation = (req, res, next) => {
  // 只在离线模式下执行
  if (!req.networkInfo?.isOfflineMode) {
    return next();
  }

  // 检查请求体大小
  const contentLength = parseInt(req.get('content-length'));
  const maxOfflineRequestSize = 10 * 1024 * 1024; // 10MB

  if (contentLength && contentLength > maxOfflineRequestSize) {
    return res.status(413).json({
      success: false,
      message: '离线模式下请求数据过大',
      maxSize: maxOfflineRequestSize,
      code: 'REQUEST_TOO_LARGE'
    });
  }

  // 验证必要字段
  if (req.shouldQueue && (!req.body?.operationType || !req.body?.resourceType)) {
    return res.status(400).json({
      success: false,
      message: '离线队列请求需要指定操作类型和资源类型',
      required: ['operationType', 'resourceType']
    });
  }

  next();
};

/**
 * 离线操作审计日志
 */
const offlineAuditLog = (req, res, next) => {
  // 只在离线模式下记录
  if (!req.networkInfo?.isOfflineMode) {
    return next();
  }

  const startTime = Date.now();

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    Logger.info('离线操作审计', {
      userId: req.user?._id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      networkInfo: req.networkInfo,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

/**
 * 自动同步触发检测
 * 检测网络从离线恢复的情况，触发自动同步
 */
const autoSyncDetection = async (req, res, next) => {
  // 检查是否有网络恢复的标记
  const networkRestored = req.headers['x-network-restored'] === 'true';

  if (networkRestored && req.user?._id) {
    Logger.info('检测到网络恢复，准备自动同步', {
      userId: req.user._id
    });

    // 设置自动同步标记
    req.triggerAutoSync = true;
  }

  next();
};

/**
 * 离线模式配置端点
 */
const getOfflineConfig = (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: true,
      features: {
        queue: true,
        autoSync: true,
        conflictResolution: true,
        prioritySupport: true,
        dependencyManagement: true
      },
      limits: {
        maxQueueSize: 1000,
        maxItemSize: 10 * 1024 * 1024, // 10MB
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxRetries: 5,
        syncBatchSize: 50
      },
      supportedOperations: [
        'create', 'update', 'delete',
        'upload', 'submit', 'approve',
        'comment', 'feedback', 'report',
        'emergency', 'announcement', 'payment'
      ],
      supportedResourceTypes: [
        'resident', 'family', 'document', 'announcement',
        'emergency', 'finance', 'reimbursement', 'subsidy',
        'village', 'event', 'post', 'comment', 'product',
        'payment', 'application', 'report'
      ],
      priorities: ['low', 'normal', 'high', 'urgent']
    }
  });
};

/**
 * 网络状态测试端点
 */
const testNetworkConnection = async (req, res) => {
  try {
    const startTime = Date.now();

    // 测试数据库连接
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // 测试外部服务连接（可选）
    const axios = require('axios');
    let externalServiceStatus = 'unknown';

    try {
      const testResponse = await axios.get(
        process.env.EXTERNAL_SERVICE_TEST_URL || 'https://www.baidu.com',
        { timeout: 5000 }
      );
      externalServiceStatus = 'connected';
    } catch (error) {
      externalServiceStatus = 'unreachable';
    }

    const latency = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        database: {
          status: dbStates[dbState],
          connected: dbState === 1
        },
        externalService: {
          status: externalServiceStatus,
          reachable: externalServiceStatus === 'connected'
        },
        latency: {
          total: latency,
          database: latency / 2,
          external: latency / 2
        },
        timestamp: new Date().toISOString(),
        recommendation: dbState === 1 ? 'online' : 'offline_mode_recommended'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '网络测试失败',
      error: error.message
    });
  }
};

module.exports = {
  networkDetection,
  offlineResponseHeaders,
  offlineRequestInterceptor,
  offlineDataValidation,
  offlineAuditLog,
  autoSyncDetection,
  getOfflineConfig,
  testNetworkConnection
};
