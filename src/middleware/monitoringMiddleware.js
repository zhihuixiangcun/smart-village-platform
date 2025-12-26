
/**
 * 性能监控中间件
 * 用于Express应用性能监控
 */

const performanceMonitoringService = require('../services/monitoring/performanceMonitoringService');

/**
 * API性能监控中间件
 */
function apiPerformanceMonitor(req, res, next) {
  const startTime = Date.now();
  const startHrTime = process.hrtime();

  // 记录请求开始
  performanceMonitoringService.recordMetric('api_request_start', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // 监听响应结束
  res.on('finish', () => {
    const endTime = Date.now();
    const hrTime = process.hrtime(startHrTime);
    const responseTime = hrTime[0] * 1000 + hrTime[1] / 1000000; // 转换为毫秒

    // 记录响应指标
    performanceMonitoringService.recordMetric('api_response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: responseTime,
      contentLength: res.get('Content-Length') || 0
    });

    // 检查慢请求
    if (responseTime > MONITORING_CONFIG.application.responseTimeThreshold) {
      performanceMonitoringService.triggerAlert('slow_api_request', {
        url: req.url,
        method: req.method,
        responseTime: responseTime,
        threshold: MONITORING_CONFIG.application.responseTimeThreshold
      });
    }

    // 检查错误响应
    if (res.statusCode >= 400) {
      performanceMonitoringService.recordMetric('api_error', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode
      });
    }
  });

  next();
}

/**
 * 错误监控中间件
 */
function errorMonitor(err, req, res, next) {
  // 记录错误指标
  performanceMonitoringService.recordMetric('application_error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date()
  });

  // 触发错误告警
  performanceMonitoringService.triggerAlert('application_error', {
    error: err.message,
    url: req.url
  });

  next(err);
}

module.exports = {
  apiPerformanceMonitor,
  errorMonitor
};
