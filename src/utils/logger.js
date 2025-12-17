/**
 * 智慧村庄平台 - 统一日志工具
 * 支持结构化日志、多级别输出、文件轮转
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // 添加元数据
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

// 控制台格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;

    // 添加关键元数据
    if (meta.requestId) {
      log += ` [${meta.requestId}]`;
    }

    if (meta.error || meta.stack) {
      log += `\n${meta.error || meta.stack}`;
    }

    return log;
  })
);

// 创建 Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'smart-village-platform'
  },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true
    }),

    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true
    }),

    // 实时计算专用日志
    new winston.transports.File({
      filename: path.join(logDir, 'realtime.log'),
      level: 'debug',
      maxsize: 30 * 1024 * 1024, // 30MB
      maxFiles: 5,
      tailable: true
    }),

    // 数据处理日志
    new winston.transports.File({
      filename: path.join(logDir, 'data-processing.log'),
      level: 'info',
      maxsize: 40 * 1024 * 1024, // 40MB
      maxFiles: 5,
      tailable: true
    })
  ],

  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],

  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// 扩展 logger 功能
class ExtendedLogger {
  constructor(winstonLogger) {
    this.winston = winstonLogger;
  }

  // 基础日志方法
  error(message, meta = {}) {
    this.winston.error(message, meta);
  }

  warn(message, meta = {}) {
    this.winston.warn(message, meta);
  }

  info(message, meta = {}) {
    this.winston.info(message, meta);
  }

  debug(message, meta = {}) {
    this.winston.debug(message, meta);
  }

  // 结构化日志方法
  logRequest(req, res, duration) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.id,
      userId: req.user?.id,
      villageId: req.user?.villageId
    });
  }

  logRealtimeEvent(event, data) {
    this.winston.info(`Realtime Event: ${event}`, {
      event,
      data,
      timestamp: new Date().toISOString(),
      service: 'realtime-engine'
    });
  }

  logDataProcessing(operation, data) {
    this.info(`Data Processing: ${operation}`, {
      operation,
      dataType: data.type,
      count: data.count || 1,
      duration: data.duration,
      success: data.success !== false,
      service: 'data-processor'
    });
  }

  logMetric(metric, value, meta = {}) {
    this.info(`Metric Update: ${metric}`, {
      metric,
      value,
      ...meta,
      service: 'metrics-collector'
    });
  }

  logAlert(alert) {
    this.warn(`Alert Triggered: ${alert.ruleName}`, {
      alertId: alert.id,
      ruleName: alert.ruleName,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      service: 'alert-system'
    });
  }

  logSystemHealth(health) {
    const level = health.status === 'healthy' ? 'info' : 'warn';
    this.winston[level]('System Health Check', {
      status: health.status,
      services: health.services,
      uptime: health.uptime,
      memory: health.memory,
      service: 'health-monitor'
    });
  }

  logPerformance(operation, duration, meta = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...meta,
      service: 'performance-monitor'
    });
  }

  logSecurity(event, details) {
    this.warn(`Security Event: ${event}`, {
      event,
      details,
      timestamp: new Date().toISOString(),
      service: 'security-monitor'
    });
  }

  // 创建子logger
  child(defaultMeta = {}) {
    return {
      error: (message, meta = {}) => this.error(message, { ...defaultMeta, ...meta }),
      warn: (message, meta = {}) => this.warn(message, { ...defaultMeta, ...meta }),
      info: (message, meta = {}) => this.info(message, { ...defaultMeta, ...meta }),
      debug: (message, meta = {}) => this.debug(message, { ...defaultMeta, ...meta })
    };
  }

  // 获取日志统计
  getStats() {
    return {
      level: this.winston.level,
      transports: this.winston.transports.length,
      logDir
    };
  }

  // 重新配置日志级别
  setLevel(level) {
    this.winston.level = level;
    this.winston.transports.forEach(transport => {
      if (transport.level !== 'error') {
        transport.level = level;
      }
    });
  }
}

// 创建并导出扩展的logger实例
const extendedLogger = new ExtendedLogger(logger);

// 监听日志文件轮转事件
logger.on('rotate', (oldFilename, newFilename) => {
  extendedLogger.info('Log file rotated', {
    oldFilename,
    newFilename,
    service: 'log-rotation'
  });
});

// 导出logger实例和类
module.exports = extendedLogger;

// 也导出winston实例以备兼容性
module.exports.winston = logger;