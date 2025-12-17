/**
 * 实时计算中间件
 * 自动跟踪和处理实时数据
 */

const realtimeEngine = require('../services/realtimeEngine');
const streamProcessor = require('../services/streamProcessor');

class RealtimeTracker {
  constructor() {
    this.trackingEnabled = true;
    this.excludePaths = [
      '/health',
      '/ping',
      '/favicon.ico',
      '/static',
      '/assets'
    ];

    this.includePaths = [
      '/api/v1/residents',
      '/api/v1/announcements',
      '/api/v1/finance',
      '/api/v1/votes',
      '/api/v1/help',
      '/api/v1/village-affairs',
      '/api/v1/emergency'
    ];

    this.requestCounter = 0;
    this.responseTimeCounter = 0;
    this.errorCounter = 0;

    this.init();
  }

  init() {
    // 注册默认指标
    this.setupDefaultMetrics();

    // 设置默认阈值
    this.setupDefaultThresholds();

    // 监听系统事件
    this.setupEventListeners();
  }

  /**
   * 创建Express中间件
   */
  middleware() {
    return (req, res, next) => {
      if (!this.trackingEnabled) {
        return next();
      }

      const startTime = Date.now();
      this.requestCounter++;

      // 记录原始响应方法
      const originalEnd = res.end;
      const originalWrite = res.write;

      let statusCode = 200;
      let responseData = null;

      // 监听状态码变化
      res.on('pipe', () => {
        statusCode = res.statusCode;
      });

      // 拦截响应数据
      res.write = function(chunk, encoding) {
        if (!responseData) {
          responseData = chunk;
        } else if (typeof chunk === 'string') {
          responseData += chunk;
        }
        return originalWrite.call(this, chunk, encoding);
      };

      // 拦截响应结束
      res.end = async function(chunk, encoding) {
        if (chunk) {
          res.write(chunk, encoding);
        }

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // 发送实时数据
        await this.trackRequest(req, res, {
          startTime,
          endTime,
          responseTime,
          statusCode,
          responseData
        });

        // 调用原始的end方法
        return originalEnd.call(this, chunk, encoding);
      };

      // 记录请求开始
      this.trackRequestStart(req);

      next();
    };
  }

  /**
   * 跟踪请求开始
   */
  trackRequestStart(req) {
    try {
      // 添加请求数据到实时引擎
      realtimeEngine.addStreamData('system', {
        type: 'request_start',
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        villageId: req.user?.villageId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('请求开始跟踪失败:', error);
    }
  }

  /**
   * 跟踪请求完成
   */
  async trackRequest(req, res, metrics) {
    try {
      const { startTime, endTime, responseTime, statusCode, responseData } = metrics;

      // 更新系统指标
      this.updateSystemMetrics(responseTime, statusCode);

      // 提取业务数据
      const businessData = this.extractBusinessData(req, res, responseData);

      // 添加响应数据到实时引擎
      await realtimeEngine.addStreamData('system', {
        type: 'request_complete',
        method: req.method,
        path: req.path,
        statusCode,
        responseTime,
        success: statusCode < 400,
        userId: req.user?.id,
        villageId: req.user?.villageId,
        businessData,
        timestamp: endTime
      });

      // 如果是重要的业务操作，添加到流处理器
      if (this.isImportantBusinessOperation(req)) {
        await streamProcessor.processData(this.getOperationType(req), {
          ...businessData,
          httpMethod: req.method,
          statusCode,
          responseTime,
          user: req.user,
          request: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            headers: this.sanitizeHeaders(req.headers)
          }
        });
      }

    } catch (error) {
      console.error('请求跟踪失败:', error);
    }
  }

  /**
   * 提取业务数据
   */
  extractBusinessData(req, res, responseData) {
    const businessData = {};

    try {
      // 尝试解析JSON响应
      if (responseData && typeof responseData === 'string') {
        try {
          const jsonData = JSON.parse(responseData);
          if (jsonData.data) {
            businessData.responseData = jsonData.data;
          }
          if (jsonData.message) {
            businessData.message = jsonData.message;
          }
        } catch (e) {
          // 不是JSON数据，忽略
        }
      }

      // 从请求路径中提取业务信息
      businessData.endpoint = req.path;
      businessData.module = this.getModuleFromPath(req.path);

      // 从请求体中提取业务数据
      if (req.body && Object.keys(req.body).length > 0) {
        businessData.requestData = this.sanitizeBusinessData(req.body);
      }

      // 从查询参数中提取业务数据
      if (req.query && Object.keys(req.query).length > 0) {
        businessData.queryParams = req.query;
      }

      // 从路由参数中提取业务数据
      if (req.params && Object.keys(req.params).length > 0) {
        businessData.pathParams = req.params;
      }

    } catch (error) {
      console.error('提取业务数据失败:', error);
    }

    return businessData;
  }

  /**
   * 更新系统指标
   */
  updateSystemMetrics(responseTime, statusCode) {
    this.responseTimeCounter++;

    // 更新响应时间指标
    realtimeEngine.updateMetricValue('response_time', responseTime, 'system');

    // 更新错误率指标
    if (statusCode >= 400) {
      this.errorCounter++;
      realtimeEngine.updateMetricValue('error_count', 1, 'system');
    }

    // 更新吞吐量指标
    realtimeEngine.updateMetricValue('throughput', 1, 'system');

    // 每分钟计算错误率
    if (this.requestCounter % 60 === 0) {
      const errorRate = this.errorCounter / this.requestCounter;
      realtimeEngine.updateMetricValue('error_rate', errorRate, 'system');
    }
  }

  /**
   * 判断是否为重要业务操作
   */
  isImportantBusinessOperation(req) {
    const importantOperations = [
      'POST', 'PUT', 'DELETE'
    ];

    const importantEndpoints = [
      '/api/v1/announcements',
      '/api/v1/finance',
      '/api/v1/votes',
      '/api/v1/emergency'
    ];

    return importantOperations.includes(req.method) &&
           importantEndpoints.some(endpoint => req.path.startsWith(endpoint));
  }

  /**
   * 获取操作类型
   */
  getOperationType(req) {
    const path = req.path.toLowerCase();

    if (path.includes('/announcements')) {
      return 'announcement';
    } else if (path.includes('/finance')) {
      return 'finance';
    } else if (path.includes('/votes')) {
      return 'voting';
    } else if (path.includes('/help')) {
      return 'help';
    } else if (path.includes('/emergency')) {
      return 'emergency';
    } else if (path.includes('/residents')) {
      return 'resident';
    } else {
      return 'general';
    }
  }

  /**
   * 从路径获取模块
   */
  getModuleFromPath(path) {
    if (path.includes('/announcements')) return 'announcements';
    if (path.includes('/finance')) return 'finance';
    if (path.includes('/voting')) return 'voting';
    if (path.includes('/help')) return 'help_center';
    if (path.includes('/emergency')) return 'emergency';
    if (path.includes('/residents')) return 'resident_management';
    if (path.includes('/village-affairs')) return 'village_affairs';
    if (path.includes('/auth')) return 'authentication';
    if (path.includes('/system')) return 'system';
    return 'unknown';
  }

  /**
   * 清理敏感的请求头
   */
  sanitizeHeaders(headers) {
    const sanitized = {};
    const excludeHeaders = [
      'authorization',
      'cookie',
      'password'
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (!excludeHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
        sanitized[key] = value.substring(0, 100); // 限制长度
      }
    }

    return sanitized;
  }

  /**
   * 清理业务数据中的敏感信息
   */
  sanitizeBusinessData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = {};
    const excludeFields = [
      'password',
      'token',
      'secret',
      'key'
    ];

    for (const [key, value] of Object.entries(data)) {
      if (!excludeFields.includes(key.toLowerCase())) {
        if (typeof value === 'string' && value.length > 1000) {
          sanitized[key] = `${value.substring(0, 1000)  }...`;
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * 设置默认指标
   */
  setupDefaultMetrics() {
    // 系统性能指标
    realtimeEngine.registerMetric('response_time', {
      type: 'histogram',
      unit: 'ms',
      description: 'API响应时间',
      windows: ['1m', '5m', '15m', '1h']
    });

    realtimeEngine.registerMetric('throughput', {
      type: 'rate',
      unit: 'req/s',
      description: '每秒请求数',
      windows: ['1m', '5m', '15m', '1h']
    });

    realtimeEngine.registerMetric('error_count', {
      type: 'counter',
      unit: 'count',
      description: '错误请求数',
      windows: ['1m', '5m', '15m', '1h']
    });

    realtimeEngine.registerMetric('error_rate', {
      type: 'gauge',
      unit: 'percentage',
      description: '错误率',
      windows: ['1m', '5m', '15m', '1h']
    });

    // 业务指标
    realtimeEngine.registerMetric('active_users', {
      type: 'gauge',
      unit: 'count',
      description: '当前活跃用户数',
      windows: ['1m', '5m', '15m', '1h']
    });

    realtimeEngine.registerMetric('page_views', {
      type: 'counter',
      unit: 'count',
      description: '页面浏览数',
      windows: ['1m', '5m', '15m', '1h']
    });

    realtimeEngine.registerMetric('user_interactions', {
      type: 'counter',
      unit: 'count',
      description: '用户交互数',
      windows: ['1m', '5m', '15m', '1h']
    });

    realtimeEngine.registerMetric('business_operations', {
      type: 'counter',
      unit: 'count',
      description: '业务操作数',
      windows: ['1m', '5m', '15m', '1h']
    });
  }

  /**
   * 设置默认阈值
   */
  setupDefaultThresholds() {
    // 响应时间阈值
    realtimeEngine.setThreshold('response_time', {
      type: 'adaptive',
      operator: '>',
      value: 2000,
      alertLevel: 'warning',
      cooldown: 30000,
      adaptiveConfig: {
        strategy: 'percentile',
        percentile: 0.95,
        minDataPoints: 20,
        window: '5m',
        adjustmentFactor: 1.2
      }
    });

    // 错误率阈值
    realtimeEngine.setThreshold('error_rate', {
      type: 'dynamic',
      operator: '>',
      value: 0.05,
      alertLevel: 'critical',
      cooldown: 60000,
      adaptiveConfig: {
        strategy: 'std_deviation',
        multiplier: 2,
        minDataPoints: 30,
        window: '15m'
      }
    });

    // 活跃用户阈值
    realtimeEngine.setThreshold('active_users', {
      type: 'adaptive',
      operator: '<',
      value: 10,
      alertLevel: 'info',
      cooldown: 120000,
      adaptiveConfig: {
        strategy: 'trend_based',
        minDataPoints: 50,
        window: '1h',
        adjustmentFactor: 0.8
      }
    });
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听阈值触发事件
    realtimeEngine.on('thresholdTriggered', (alert) => {
      this.handleThresholdAlert(alert);
    });

    // 监听警报规则触发事件
    realtimeEngine.on('alertTriggered', (alert) => {
      this.handleAlertRule(alert);
    });

    // 监听数据处理事件
    realtimeEngine.on('dataProcessed', (data) => {
      this.handleDataProcessed(data);
    });

    // 监听处理错误事件
    realtimeEngine.on('processingError', (error) => {
      this.handleProcessingError(error);
    });

    // 监听引擎连接事件
    realtimeEngine.on('connected', () => {
      console.log('✅ 实时引擎已连接');
    });

    realtimeEngine.on('error', (error) => {
      console.error('❌ 实时引擎错误:', error);
    });
  }

  /**
   * 处理阈值警报
   */
  handleThresholdAlert(alert) {
    console.warn(`⚠️ 阈值警报: ${alert.metricName} = ${alert.currentValue} (阈值: ${alert.threshold})`);

    // 可以在这里发送通知、记录日志等
    // 例如：发送到监控系统、发送邮件通知等
  }

  /**
   * 处理警报规则
   */
  handleAlertRule(alert) {
    console.warn(`🚨 警报触发: ${alert.ruleName} (${alert.severity})`);

    // 根据严重程度执行不同的处理
    switch (alert.severity) {
    case 'critical':
      this.sendCriticalAlert(alert);
      break;
    case 'high':
      this.sendHighPriorityAlert(alert);
      break;
    case 'medium':
      this.sendMediumAlert(alert);
      break;
    case 'low':
      this.sendLowPriorityAlert(alert);
      break;
    }
  }

  /**
   * 处理数据完成事件
   */
  handleDataProcessed(data) {
    // 可以在这里进行数据后处理
    // 例如：数据持久化、发送到分析系统等
  }

  /**
   * 处理处理错误
   */
  handleProcessingError(error) {
    console.error('❌ 实时处理错误:', error);

    // 记录错误指标
    realtimeEngine.updateMetricValue('processing_errors', 1, 'system');
  }

  /**
   * 发送关键警报
   */
  async sendCriticalAlert(alert) {
    console.error(`🚨 关键警报: ${alert.metricName}`, alert);

    // 这里可以集成各种通知系统
    // 例如：短信、邮件、钉钉、企业微信等
  }

  /**
   * 发送高优先级警报
   */
  async sendHighPriorityAlert(alert) {
    console.warn(`⚠️ 高优先级警报: ${alert.ruleName}`, alert);
  }

  /**
   * 发送中等优先级警报
   */
  async sendMediumAlert(alert) {
    console.info(`ℹ️ 中等优先级警报: ${alert.ruleName}`, alert);
  }

  /**
   * 发送低优先级警报
   */
  async sendLowPriorityAlert(alert) {
    console.log(`ℹ️ 低优先级警报: ${alert.ruleName}`, alert);
  }

  /**
   * 启用跟踪
   */
  enable() {
    this.trackingEnabled = true;
    console.log('📊 实时跟踪已启用');
  }

  /**
   * 禁用跟踪
   */
  disable() {
    this.trackingEnabled = false;
    console.log('📊 实时跟踪已禁用');
  }

  /**
   * 获取跟踪统计
   */
  getTrackingStats() {
    return {
      enabled: this.trackingEnabled,
      totalRequests: this.requestCounter,
      totalResponses: this.responseTimeCounter,
      totalErrors: this.errorCounter,
      errorRate: this.responseTimeCounter > 0 ? this.errorCounter / this.responseTimeCounter : 0,
      uptime: process.uptime()
    };
  }
}

module.exports = new RealtimeTracker();