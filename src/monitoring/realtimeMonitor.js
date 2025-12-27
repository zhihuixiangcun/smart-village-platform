/**
 * 实时性能监控系统
 * 提供请求追踪、指标收集和WebSocket推送
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class RealtimeMonitor extends EventEmitter {
  constructor() {
    super();

    // 监控配置
    this.config = {
      // WebSocket端口
      wsPort: parseInt(process.env.MONITOR_WS_PORT) || 3002,
      // 指标收集间隔（毫秒）
      collectInterval: parseInt(process.env.MONITOR_COLLECT_INTERVAL) || 1000,
      // 历史数据保留时间（分钟）
      historyRetention: parseInt(process.env.MONITOR_HISTORY_RETENTION) || 60,
      // 性能基线
      baseline: {
        responseTime: parseInt(process.env.MONITOR_BASELINE_RESPONSE) || 200,
        errorRate: parseFloat(process.env.MONITOR_BASELINE_ERROR) || 0.01,
        throughput: parseInt(process.env.MONITOR_BASELINE_THROUGHPUT) || 100
      }
    };

    // WebSocket服务器
    this.wss = null;
    this.clients = new Set();

    // 实时指标
    this.metrics = {
      requests: new Map(),      // 请求指标
      routes: new Map(),        // 路由指标
      errors: new Map(),        // 错误指标
      system: {               // 系统指标
        cpu: 0,
        memory: 0,
        heapUsed: 0,
        heapTotal: 0,
        uptime: 0
      },
      timestamp: Date.now()
    };

    // 历史数据
    this.history = {
      requests: [],
      routes: [],
      system: [],
      errors: []
    };

    // 请求追踪
    this.activeRequests = new Map();

    // 性能统计
    this.statistics = {
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0
    };

    // 启动监控（延迟启动，不立即调用startMonitoring）
    // this.startMonitoring();
  }

  /**
   * 启动监控系统
   */
  startMonitoring() {
    // 启动WebSocket服务器
    this.startWebSocketServer();

    // 启动指标收集
    this.startMetricsCollection();

    // 启动历史数据清理
    this.startHistoryCleanup();

    logger.info('实时监控系统已启动', {
      wsPort: this.config.wsPort,
      collectInterval: this.config.collectInterval
    });
  }

  /**
   * 启动WebSocket服务器
   */
  startWebSocketServer() {
    this.wss = new WebSocket.Server({ port: this.config.wsPort });

    this.wss.on('connection', (ws) => {
      const clientId = uuidv4();
      this.clients.add(ws);

      // 发送初始数据
      this.sendInitialData(ws);

      // 处理消息
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, clientId, data);
        } catch (error) {
          logger.error('WebSocket消息解析失败', error);
        }
      });

      // 处理断开
      ws.on('close', () => {
        this.clients.delete(ws);
        logger.debug('客户端断开连接', { clientId });
      });

      logger.info('监控客户端已连接', { clientId });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket服务器错误', error);
    });

    logger.info('WebSocket监控服务器已启动', { port: this.config.wsPort });
  }

  /**
   * 发送初始数据
   * @param {WebSocket} ws - WebSocket连接
   */
  async sendInitialData(ws) {
    const initialData = {
      type: 'initial',
      timestamp: Date.now(),
      data: {
        currentMetrics: this.getMetrics(),
        statistics: this.getStatistics(),
        history: this.getRecentHistory()
      }
    };

    this.sendToClient(ws, initialData);
  }

  /**
   * 处理客户端消息
   * @param {WebSocket} ws - WebSocket连接
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 消息数据
   */
  handleClientMessage(ws, clientId, data) {
    switch (data.type) {
    case 'subscribe':
      this.handleSubscription(ws, clientId, data.channels);
      break;
    case 'unsubscribe':
      this.handleUnsubscription(ws, clientId, data.channels);
      break;
    case 'getMetrics':
      this.sendMetrics(ws);
      break;
    case 'getHistory':
      this.sendHistory(ws, data.options);
      break;
    default:
      logger.warn('未知的客户端消息类型', { type: data.type });
    }
  }

  /**
   * 处理订阅
   * @param {WebSocket} ws - WebSocket连接
   * @param {string} clientId - 客户端ID
   * @param {Array} channels - 订阅频道
   */
  handleSubscription(ws, clientId, channels) {
    if (!channels || !Array.isArray(channels)) {
      return;
    }

    // 这里可以添加频道验证逻辑
    const validChannels = ['metrics', 'routes', 'system', 'alerts'];
    const filteredChannels = channels.filter(ch => validChannels.includes(ch));

    // 订阅确认
    this.sendToClient(ws, {
      type: 'subscribed',
      channels: filteredChannels,
      clientId
    });
  }

  /**
   * 处理取消订阅
   * @param {WebSocket} ws - WebSocket连接
   * @param {string} clientId - 客户端ID
   * @param {Array} channels - 取消订阅的频道
   */
  handleUnsubscription(ws, clientId, channels) {
    // 取消订阅确认
    this.sendToClient(ws, {
      type: 'unsubscribed',
      channels,
      clientId
    });
  }

  /**
   * 启动指标收集
   */
  startMetricsCollection() {
    setInterval(() => {
      this.collectSystemMetrics();
      this.calculateStatistics();
      this.broadcastMetrics();
    }, this.config.collectInterval);
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    const now = Date.now();
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // 获取CPU使用率（简化实现）
    const cpuUsage = this.getCpuUsage();

    this.metrics.system = {
      cpu: cpuUsage,
      memory: memUsage.rss / 1024 / 1024, // MB
      heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
      heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
      uptime,
      timestamp: now
    };

    // 添加到历史记录
    this.history.system.push({ ...this.metrics.system, timestamp: now });
  }

  /**
   * 获取CPU使用率（简化版）
   * @returns {number} CPU使用率百分比
   */
  getCpuUsage() {
    // 这里应该使用更精确的CPU监控库
    // 简化实现，返回模拟值
    const usage = process.cpuUsage();
    const totalUsage = usage.user + usage.system;
    const percentage = (totalUsage / (process.uptime() * 1000000)) * 100;
    return Math.min(percentage, 100);
  }

  /**
   * 计算统计数据
   */
  calculateStatistics() {
    const now = Date.now();
    const recentRequests = Array.from(this.metrics.requests.values())
      .filter(r => now - r.timestamp < 60000); // 最近1分钟

    // 响应时间统计
    if (recentRequests.length > 0) {
      const responseTimes = recentRequests.map(r => r.duration);
      responseTimes.sort((a, b) => a - b);

      this.statistics.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      this.statistics.p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      this.statistics.p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
      this.statistics.requestsPerSecond = recentRequests.length;
    }

    // 错误率
    const recentErrors = Array.from(this.metrics.errors.values())
      .filter(e => now - e.timestamp < 60000);

    const totalRecent = recentRequests.length + recentErrors.length;
    if (totalRecent > 0) {
      this.statistics.errorRate = recentErrors.length / totalRecent;
    }
  }

  /**
   * 广播指标到所有客户端
   */
  broadcastMetrics() {
    const data = {
      type: 'metrics',
      timestamp: Date.now(),
      data: {
        current: this.getMetrics(),
        statistics: this.getStatistics(),
        alerts: this.checkAlerts()
      }
    };

    this.broadcast(data);
  }

  /**
   * 检查告警条件
   * @returns {Array} 告警列表
   */
  checkAlerts() {
    const alerts = [];

    // 响应时间告警
    if (this.statistics.avgResponseTime > this.config.baseline.responseTime * 2) {
      alerts.push({
        type: 'high_response_time',
        level: 'warning',
        message: `平均响应时间过高: ${this.statistics.avgResponseTime.toFixed(2)}ms`,
        threshold: this.config.baseline.responseTime * 2,
        value: this.statistics.avgResponseTime
      });
    }

    // 错误率告警
    if (this.statistics.errorRate > this.config.baseline.errorRate * 2) {
      alerts.push({
        type: 'high_error_rate',
        level: 'critical',
        message: `错误率过高: ${(this.statistics.errorRate * 100).toFixed(2)}%`,
        threshold: this.config.baseline.errorRate * 2,
        value: this.statistics.errorRate
      });
    }

    // QPS告警
    if (this.statistics.requestsPerSecond < this.config.baseline.throughput * 0.5) {
      alerts.push({
        type: 'low_throughput',
        level: 'warning',
        message: `QPS过低: ${this.statistics.requestsPerSecond}`,
        threshold: this.config.baseline.throughput * 0.5,
        value: this.statistics.requestsPerSecond
      });
    }

    // 内存使用告警
    if (this.metrics.system.memory > 1024) { // 1GB
      alerts.push({
        type: 'high_memory',
        level: 'warning',
        message: `内存使用过高: ${this.metrics.system.memory.toFixed(2)}MB`,
        threshold: 1024,
        value: this.metrics.system.memory
      });
    }

    // CPU使用告警
    if (this.metrics.system.cpu > 80) {
      alerts.push({
        type: 'high_cpu',
        level: 'critical',
        message: `CPU使用过高: ${this.metrics.system.cpu.toFixed(1)}%`,
        threshold: 80,
        value: this.metrics.system.cpu
      });
    }

    return alerts;
  }

  /**
   * 记录请求开始
   * @param {Object} req - 请求对象
   * @returns {string} 请求ID
   */
  startRequest(req) {
    const requestId = uuidv4();
    const route = this.getRouteName(req);

    const requestInfo = {
      id: requestId,
      route,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      startTime: performance.now(),
      timestamp: Date.now()
    };

    this.activeRequests.set(requestId, requestInfo);

    // 添加到请求指标
    if (!this.metrics.requests.has(route)) {
      this.metrics.requests.set(route, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0
      });
    }

    return requestId;
  }

  /**
   * 记录请求结束
   * @param {string} requestId - 请求ID
   * @param {number} statusCode - 状态码
   * @param {Object} metadata - 元数据
   */
  endRequest(requestId, statusCode, metadata = {}) {
    const requestInfo = this.activeRequests.get(requestId);
    if (!requestInfo) {
      return;
    }

    const duration = performance.now() - requestInfo.startTime;
    const isError = statusCode >= 400;

    // 更新请求指标
    const routeMetrics = this.metrics.requests.get(requestInfo.route);
    if (routeMetrics) {
      routeMetrics.count++;
      routeMetrics.totalDuration += duration;
      routeMetrics.minDuration = Math.min(routeMetrics.minDuration, duration);
      routeMetrics.maxDuration = Math.max(routeMetrics.maxDuration, duration);

      if (isError) {
        routeMetrics.errors++;
      }
    }

    // 更新统计
    this.statistics.totalRequests++;
    if (isError) {
      this.statistics.totalErrors++;
    }

    // 添加到历史记录
    const requestRecord = {
      id: requestId,
      route: requestInfo.route,
      method: requestInfo.method,
      url: requestInfo.url,
      statusCode,
      duration,
      timestamp: requestInfo.startTime,
      isError,
      metadata
    };

    this.history.requests.push(requestRecord);

    // 清理活动请求
    this.activeRequests.delete(requestId);

    // 如果是错误，记录到错误指标
    if (isError) {
      const errorKey = `${statusCode}_${requestInfo.route}`;
      if (!this.metrics.errors.has(errorKey)) {
        this.metrics.errors.set(errorKey, {
          count: 0,
          timestamp: Date.now()
        });
      }

      const errorMetrics = this.metrics.errors.get(errorKey);
      errorMetrics.count++;
      errorMetrics.timestamp = Date.now();

      this.history.errors.push({
        id: requestId,
        type: errorKey,
        statusCode,
        route: requestInfo.route,
        timestamp: Date.now()
      });
    }

    // 发送事件
    this.emit('requestComplete', {
      requestId,
      route: requestInfo.route,
      duration,
      statusCode,
      isError
    });
  }

  /**
   * 获取路由名称
   * @param {Object} req - 请求对象
   * @returns {string} 路由名称
   */
  getRouteName(req) {
    // 从Express路由获取名称
    if (req.route && req.route.path) {
      return `${req.method} ${req.route.path}`;
    }
    // 从URL推断
    const path = req.path.split('/')[1];
    return path ? `GET /${path}` : 'UNKNOWN';
  }

  /**
   * 获取当前指标
   * @returns {Object} 当前指标
   */
  getMetrics() {
    return {
      requests: Object.fromEntries(this.metrics.requests),
      routes: this.getRouteMetrics(),
      system: this.metrics.system,
      activeRequests: this.activeRequests.size,
      timestamp: Date.now()
    };
  }

  /**
   * 获取路由指标
   * @returns {Object} 路由指标
   */
  getRouteMetrics() {
    const routes = {};

    for (const [route, metrics] of this.metrics.requests.entries()) {
      const avgDuration = metrics.count > 0 ? metrics.totalDuration / metrics.count : 0;

      routes[route] = {
        ...metrics,
        avgDuration: Math.round(avgDuration * 100) / 100,
        errorRate: metrics.count > 0 ? metrics.errors / metrics.count : 0
      };
    }

    return routes;
  }

  /**
   * 获取统计数据
   * @returns {Object} 统计数据
   */
  getStatistics() {
    return {
      ...this.statistics,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeRequests: this.activeRequests.size,
      timestamp: Date.now()
    };
  }

  /**
   * 获取最近历史数据
   * @param {Object} options - 选项
   * @returns {Object} 历史数据
   */
  getRecentHistory(options = {}) {
    const { limit = 100, type = 'all' } = options;
    const now = Date.now();
    const windowStart = now - (this.config.historyRetention * 60 * 1000);

    const result = {};

    if (type === 'all' || type === 'requests') {
      result.requests = this.history.requests
        .filter(r => r.timestamp > windowStart)
        .slice(-limit);
    }

    if (type === 'all' || type === 'system') {
      result.system = this.history.system
        .filter(r => r.timestamp > windowStart)
        .slice(-limit);
    }

    if (type === 'all' || type === 'errors') {
      result.errors = this.history.errors
        .filter(e => e.timestamp > windowStart)
        .slice(-limit);
    }

    return result;
  }

  /**
   * 发送指标到客户端
   * @param {WebSocket} ws - WebSocket连接
   */
  sendMetrics(ws) {
    const data = {
      type: 'metrics',
      timestamp: Date.now(),
      data: this.getMetrics()
    };

    this.sendToClient(ws, data);
  }

  /**
   * 发送历史数据到客户端
   * @param {WebSocket} ws - WebSocket连接
   * @param {Object} options - 选项
   */
  sendHistory(ws, options = {}) {
    const data = {
      type: 'history',
      timestamp: Date.now(),
      data: this.getRecentHistory(options)
    };

    this.sendToClient(ws, data);
  }

  /**
   * 发送数据到客户端
   * @param {WebSocket} ws - WebSocket连接
   * @param {Object} data - 数据
   */
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * 广播数据到所有客户端
   * @param {Object} data - 数据
   */
  broadcast(data) {
    const message = JSON.stringify(data);

    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });

    logger.debug('广播数据到客户端', {
      clients: this.clients.size,
      type: data.type
    });
  }

  /**
   * 启动历史数据清理
   */
  startHistoryCleanup() {
    const cleanupInterval = 5 * 60 * 1000; // 5分钟

    setInterval(() => {
      const cutoff = Date.now() - (this.config.historyRetention * 60 * 1000);

      this.history.requests = this.history.requests.filter(r => r.timestamp > cutoff);
      this.history.system = this.history.system.filter(r => r.timestamp > cutoff);
      this.history.errors = this.history.errors.filter(e => e.timestamp > cutoff);

      logger.debug('历史数据清理完成', {
        cutoff,
        requests: this.history.requests.length,
        system: this.history.system.length,
        errors: this.history.errors.length
      });

    }, cleanupInterval);
  }

  /**
   * 获取监控报告
   * @returns {Object} 监控报告
   */
  getMonitoringReport() {
    return {
      timestamp: new Date(),
      summary: {
        totalRequests: this.statistics.totalRequests,
        totalErrors: this.statistics.totalErrors,
        avgResponseTime: this.statistics.avgResponseTime,
        p95ResponseTime: this.statistics.p95ResponseTime,
        errorRate: this.statistics.errorRate,
        requestsPerSecond: this.statistics.requestsPerSecond
      },
      metrics: this.getMetrics(),
      statistics: this.getStatistics(),
      history: this.getRecentHistory({ limit: 1000 }),
      alerts: this.checkAlerts(),
      clients: this.clients.size
    };
  }

  /**
   * 关闭监控系统
   */
  close() {
    // 关闭WebSocket服务器
    if (this.wss) {
      this.wss.close();
    }

    // 清理客户端连接
    this.clients.clear();

    logger.info('实时监控系统已关闭');
  }
}

// 单例模式
const realtimeMonitor = new RealtimeMonitor();

module.exports = realtimeMonitor;