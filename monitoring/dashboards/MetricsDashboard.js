/**
 * 监控指标仪表板
 * 提供智慧乡村平台的实时监控数据展示和可视化功能
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const logger = require('./../../src/services/performanceMonitor').logger;

class MetricsDashboard extends EventEmitter {
  constructor() {
    super();
    this.wsServer = null;
    this.clients = new Set();
    this.metricsCache = new Map();
    this.isConnected = false;

    // 仪表板配置
    this.config = {
      port: process.env.DASHBOARD_PORT || 3002,
      updateInterval: 5000, // 5秒更新一次
      maxClients: 100,
      heartbeatInterval: 30000 // 30秒心跳
    };

    // 图表配置
    this.chartConfigs = {
      // 系统概览
      overview: {
        title: '系统概览',
        type: 'overview',
        metrics: ['activeUsers', 'responseTime', 'errorRate', 'throughput'],
        refreshInterval: 5000
      },

      // 用户活跃度
      userActivity: {
        title: '用户活跃度',
        type: 'line',
        metrics: ['activeUsers', 'newUsers', 'userRetention'],
        timeRange: '1h',
        refreshInterval: 10000
      },

      // 系统性能
      performance: {
        title: '系统性能',
        type: 'line',
        metrics: ['responseTime', 'errorRate', 'throughput'],
        timeRange: '30m',
        refreshInterval: 5000
      },

      // 业务指标
      business: {
        title: '业务指标',
        type: 'mixed',
        metrics: ['transactionRate', 'announcementViews', 'taskCompletion'],
        timeRange: '1h',
        refreshInterval: 15000
      },

      // 实时告警
      alerts: {
        title: '实时告警',
        type: 'alert',
        refreshInterval: 1000
      },

      // 系统健康度
      health: {
        title: '系统健康度',
        type: 'health',
        metrics: ['serviceStatus', 'databaseStatus', 'cacheStatus'],
        refreshInterval: 10000
      }
    };
  }

  /**
   * 启动仪表板服务
   */
  async start() {
    if (this.isConnected) {
      logger.warn('仪表板服务已在运行');
      return;
    }

    try {
      // 启动WebSocket服务器
      this.startWebSocketServer();

      // 启动HTTP服务器（用于静态文件）
      this.startHttpServer();

      // 启动定期数据更新
      this.startPeriodicUpdate();

      this.isConnected = true;
      logger.info(`监控仪表板启动成功`, {
        port: this.config.port,
        wsPort: this.config.port + 1,
        charts: Object.keys(this.chartConfigs).length
      });
    } catch (error) {
      logger.error('启动监控仪表板失败:', error);
      throw error;
    }
  }

  /**
   * 停止仪表板服务
   */
  async stop() {
    this.isConnected = false;

    // 关闭所有WebSocket连接
    if (this.wsServer) {
      this.wsServer.close();
    }

    // 清理客户端连接
    this.clients.clear();

    logger.info('监控仪表板服务已停止');
  }

  /**
   * 启动WebSocket服务器
   */
  startWebSocketServer() {
    const wsPort = this.config.port + 1;
    this.wsServer = new WebSocket.Server({
      port: wsPort,
      perMessageDeflate: false
    });

    this.wsServer.on('connection', (ws, req) => {
      this.handleClientConnection(ws, req);
    });

    this.wsServer.on('error', (error) => {
      logger.error('WebSocket服务器错误:', error);
    });

    logger.info(`WebSocket服务器启动成功，端口: ${wsPort}`);
  }

  /**
   * 处理客户端连接
   */
  handleClientConnection(ws, req) {
    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws: ws,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      connectedAt: new Date(),
      lastPing: new Date(),
      subscriptions: new Set()
    };

    this.clients.add(clientInfo);
    logger.info(`监控仪表板客户端连接: ${clientId} (${clientInfo.ip})`);

    // 发送初始数据
    this.sendInitialData(clientInfo);

    // 处理客户端消息
    ws.on('message', (message) => {
      this.handleClientMessage(clientInfo, message);
    });

    // 处理客户端断开
    ws.on('close', () => {
      this.handleClientDisconnection(clientInfo);
    });

    // 处理错误
    ws.on('error', (error) => {
      logger.error(`客户端 ${clientId} WebSocket错误:`, error);
    });

    // 发送连接确认
    this.sendToClient(clientInfo, {
      type: 'connected',
      clientId: clientId,
      timestamp: Date.now()
    });

    // 限制客户端数量
    if (this.clients.size > this.config.maxClients) {
      ws.close(1013, '服务器达到最大连接数限制');
    }
  }

  /**
   * 处理客户端消息
   */
  handleClientMessage(clientInfo, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          this.handleSubscription(clientInfo, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientInfo, data);
          break;
        case 'ping':
          this.handlePing(clientInfo);
          break;
        case 'request_data':
          this.handleDataRequest(clientInfo, data);
          break;
        default:
          logger.warn(`未知消息类型: ${data.type}`);
      }
    } catch (error) {
      logger.error(`处理客户端消息失败:`, error);
    }
  }

  /**
   * 处理订阅
   */
  handleSubscription(clientInfo, data) {
    const { charts } = data;

    if (Array.isArray(charts)) {
      charts.forEach(chart => {
        clientInfo.subscriptions.add(chart);
      });
    }

    // 立即发送订阅的数据
    this.sendSubscribedData(clientInfo);

    logger.debug(`客户端 ${clientInfo.id} 订阅图表: ${charts.join(', ')}`);
  }

  /**
   * 处理取消订阅
   */
  handleUnsubscription(clientInfo, data) {
    const { charts } = data;

    if (Array.isArray(charts)) {
      charts.forEach(chart => {
        clientInfo.subscriptions.delete(chart);
      });
    }

    logger.debug(`客户端 ${clientInfo.id} 取消订阅图表: ${charts.join(', ')}`);
  }

  /**
   * 处理心跳
   */
  handlePing(clientInfo) {
    clientInfo.lastPing = new Date();

    this.sendToClient(clientInfo, {
      type: 'pong',
      timestamp: Date.now()
    });
  }

  /**
   * 处理数据请求
   */
  async handleDataRequest(clientInfo, data) {
    const { chart, timeRange } = data;

    try {
      const chartData = await this.getChartData(chart, timeRange);

      this.sendToClient(clientInfo, {
        type: 'chart_data',
        chart,
        data: chartData,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`获取图表数据失败 (${chart}):`, error);

      this.sendToClient(clientInfo, {
        type: 'error',
        message: `获取图表数据失败: ${error.message}`,
        chart
      });
    }
  }

  /**
   * 处理客户端断开
   */
  handleClientDisconnection(clientInfo) {
    this.clients.delete(clientInfo);
    logger.info(`监控仪表板客户端断开: ${clientInfo.id}`);
  }

  /**
   * 发送初始数据
   */
  async sendInitialData(clientInfo) {
    try {
      // 发送仪表板配置
      this.sendToClient(clientInfo, {
        type: 'config',
        charts: this.chartConfigs,
        timestamp: Date.now()
      });

      // 发送所有图表的当前数据
      for (const chartId of Object.keys(this.chartConfigs)) {
        const chartData = await this.getChartData(chartId);
        this.sendToClient(clientInfo, {
          type: 'chart_data',
          chart: chartId,
          data: chartData,
          timestamp: Date.now()
        });
      }

      // 发送告警信息
      const alerts = await this.getActiveAlerts();
      this.sendToClient(clientInfo, {
        type: 'alerts',
        alerts: alerts,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('发送初始数据失败:', error);
    }
  }

  /**
   * 发送订阅数据
   */
  async sendSubscribedData(clientInfo) {
    for (const chartId of clientInfo.subscriptions) {
      try {
        const chartData = await this.getChartData(chartId);
        this.sendToClient(clientInfo, {
          type: 'chart_data',
          chart: chartId,
          data: chartData,
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error(`获取图表数据失败 (${chartId}):`, error);
      }
    }
  }

  /**
   * 获取图表数据
   */
  async getChartData(chartId, customTimeRange = null) {
    const config = this.chartConfigs[chartId];
    if (!config) {
      throw new Error(`未知的图表: ${chartId}`);
    }

    switch (chartId) {
      case 'overview':
        return await this.getOverviewData();
      case 'userActivity':
        return await this.getUserActivityData(customTimeRange || config.timeRange);
      case 'performance':
        return await this.getPerformanceData(customTimeRange || config.timeRange);
      case 'business':
        return await this.getBusinessData(customTimeRange || config.timeRange);
      case 'health':
        return await this.getHealthData();
      default:
        throw new Error(`不支持的图表类型: ${chartId}`);
    }
  }

  /**
   * 获取系统概览数据
   */
  async getOverviewData() {
    // 这里应该从实际的指标收集器获取数据
    return {
      activeUsers: this.getRandomValue(100, 500),
      responseTime: this.getRandomValue(50, 200),
      errorRate: this.getRandomValue(0, 5),
      throughput: this.getRandomValue(100, 1000),
      timestamp: Date.now()
    };
  }

  /**
   * 获取用户活跃度数据
   */
  async getUserActivityData(timeRange = '1h') {
    const points = this.getTimeSeriesPoints(timeRange);

    return {
      type: 'line',
      series: [
        {
          name: '活跃用户',
          data: points.map(() => this.getRandomValue(100, 500)),
          color: '#007bff'
        },
        {
          name: '新增用户',
          data: points.map(() => this.getRandomValue(5, 50)),
          color: '#28a745'
        },
        {
          name: '留存率',
          data: points.map(() => this.getRandomValue(70, 95)),
          color: '#ffc107'
        }
      ],
      timestamps: points,
      unit: 'count'
    };
  }

  /**
   * 获取系统性能数据
   */
  async getPerformanceData(timeRange = '30m') {
    const points = this.getTimeSeriesPoints(timeRange);

    return {
      type: 'line',
      series: [
        {
          name: '响应时间',
          data: points.map(() => this.getRandomValue(50, 300)),
          color: '#dc3545',
          unit: 'ms'
        },
        {
          name: '错误率',
          data: points.map(() => this.getRandomValue(0, 10)),
          color: '#fd7e14',
          unit: '%'
        },
        {
          name: '吞吐量',
          data: points.map(() => this.getRandomValue(500, 2000)),
          color: '#20c997',
          unit: 'rps'
        }
      ],
      timestamps: points
    };
  }

  /**
   * 获取业务指标数据
   */
  async getBusinessData(timeRange = '1h') {
    const points = this.getTimeSeriesPoints(timeRange);

    return {
      type: 'mixed',
      series: [
        {
          name: '交易速率',
          type: 'line',
          data: points.map(() => this.getRandomValue(10, 100)),
          color: '#6f42c1',
          unit: 'tps'
        },
        {
          name: '公告浏览量',
          type: 'bar',
          data: points.map(() => this.getRandomValue(100, 1000)),
          color: '#17a2b8',
          unit: 'count'
        },
        {
          name: '任务完成率',
          type: 'area',
          data: points.map(() => this.getRandomValue(80, 100)),
          color: '#28a745',
          unit: '%'
        }
      ],
      timestamps: points
    };
  }

  /**
   * 获取系统健康度数据
   */
  async getHealthData() {
    return {
      services: [
        {
          name: '用户服务',
          status: 'healthy',
          uptime: '99.9%',
          lastCheck: new Date(),
          metrics: {
            cpu: this.getRandomValue(20, 60),
            memory: this.getRandomValue(30, 70),
            disk: this.getRandomValue(10, 40)
          }
        },
        {
          name: '村民服务',
          status: 'healthy',
          uptime: '99.8%',
          lastCheck: new Date(),
          metrics: {
            cpu: this.getRandomValue(20, 60),
            memory: this.getRandomValue(30, 70),
            disk: this.getRandomValue(10, 40)
          }
        },
        {
          name: '村务服务',
          status: 'warning',
          uptime: '99.5%',
          lastCheck: new Date(),
          metrics: {
            cpu: this.getRandomValue(60, 85),
            memory: this.getRandomValue(70, 90),
            disk: this.getRandomValue(40, 70)
          }
        },
        {
          name: '财务服务',
          status: 'healthy',
          uptime: '99.9%',
          lastCheck: new Date(),
          metrics: {
            cpu: this.getRandomValue(20, 60),
            memory: this.getRandomValue(30, 70),
            disk: this.getRandomValue(10, 40)
          }
        }
      ],
      database: {
        status: 'healthy',
        connections: this.getRandomValue(10, 50),
        queries: this.getRandomValue(100, 1000),
        slowQueries: this.getRandomValue(0, 5)
      },
      cache: {
        status: 'healthy',
        hitRate: this.getRandomValue(85, 99),
        memory: this.getRandomValue(30, 80),
        keys: this.getRandomValue(1000, 10000)
      }
    };
  }

  /**
   * 获取活跃告警
   */
  async getActiveAlerts() {
    // 这里应该从实际的告警管理器获取数据
    return [
      {
        id: 'alert_1',
        name: '响应时间过高',
        severity: 'warning',
        description: '村务服务响应时间超过阈值',
        triggeredAt: new Date(Date.now() - 300000),
        status: 'firing'
      },
      {
        id: 'alert_2',
        name: '数据库连接数过高',
        severity: 'critical',
        description: '数据库连接使用率超过85%',
        triggeredAt: new Date(Date.now() - 600000),
        status: 'firing'
      }
    ];
  }

  /**
   * 启动HTTP服务器
   */
  startHttpServer() {
    const express = require('express');
    const path = require('path');
    const app = express();

    // 静态文件服务
    app.use(express.static(path.join(__dirname, 'public')));

    // API路由
    app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.getAllMetrics();
        res.json({
          success: true,
          data: metrics
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        clients: this.clients.size,
        uptime: process.uptime()
      });
    });

    app.listen(this.config.port, () => {
      logger.info(`监控仪表板HTTP服务器启动成功，端口: ${this.config.port}`);
    });
  }

  /**
   * 启动定期更新
   */
  startPeriodicUpdate() {
    setInterval(async () => {
      if (!this.isConnected) return;

      try {
        // 更新所有图表数据
        for (const [chartId, config] of Object.entries(this.chartConfigs)) {
          const chartData = await this.getChartData(chartId);

          // 广播给订阅了该图表的客户端
          this.broadcastToSubscribers(chartId, {
            type: 'chart_update',
            chart: chartId,
            data: chartData,
            timestamp: Date.now()
          });
        }

        // 发送告警更新
        const alerts = await this.getActiveAlerts();
        this.broadcast({
          type: 'alerts_update',
          alerts: alerts,
          timestamp: Date.now()
        });

      } catch (error) {
        logger.error('定期更新失败:', error);
      }
    }, this.config.updateInterval);

    // 心跳检查
    setInterval(() => {
      this.checkClientHeartbeats();
    }, this.config.heartbeatInterval);
  }

  /**
   * 检查客户端心跳
   */
  checkClientHeartbeats() {
    const now = new Date();
    const timeout = this.config.heartbeatInterval * 2;

    for (const clientInfo of this.clients) {
      if (now - clientInfo.lastPing > timeout) {
        logger.warn(`客户端 ${clientInfo.id} 心跳超时，断开连接`);
        clientInfo.ws.close(1000, '心跳超时');
      }
    }
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(message) {
    const messageStr = JSON.stringify(message);

    for (const clientInfo of this.clients) {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        try {
          clientInfo.ws.send(messageStr);
        } catch (error) {
          logger.error(`发送消息给客户端 ${clientInfo.id} 失败:`, error);
        }
      }
    }
  }

  /**
   * 广播给特定图表的订阅者
   */
  broadcastToSubscribers(chartId, message) {
    const messageStr = JSON.stringify(message);

    for (const clientInfo of this.clients) {
      if (clientInfo.subscriptions.has(chartId) &&
          clientInfo.ws.readyState === WebSocket.OPEN) {
        try {
          clientInfo.ws.send(messageStr);
        } catch (error) {
          logger.error(`发送消息给客户端 ${clientInfo.id} 失败:`, error);
        }
      }
    }
  }

  /**
   * 发送消息给特定客户端
   */
  sendToClient(clientInfo, message) {
    if (clientInfo.ws.readyState === WebSocket.OPEN) {
      try {
        clientInfo.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`发送消息给客户端 ${clientInfo.id} 失败:`, error);
      }
    }
  }

  /**
   * 生成客户端ID
   */
  generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取时间序列点
   */
  getTimeSeriesPoints(timeRange) {
    const now = Date.now();
    let duration;

    switch (timeRange) {
      case '5m':
        duration = 5 * 60 * 1000;
        break;
      case '15m':
        duration = 15 * 60 * 1000;
        break;
      case '30m':
        duration = 30 * 60 * 1000;
        break;
      case '1h':
        duration = 60 * 60 * 1000;
        break;
      case '6h':
        duration = 6 * 60 * 60 * 1000;
        break;
      case '24h':
        duration = 24 * 60 * 60 * 1000;
        break;
      default:
        duration = 60 * 60 * 1000; // 默认1小时
    }

    const points = [];
    const interval = Math.max(duration / 50, 60000); // 最多50个点，最小间隔1分钟

    for (let time = now - duration; time <= now; time += interval) {
      points.push(new Date(time));
    }

    return points;
  }

  /**
   * 获取随机值（用于演示）
   */
  getRandomValue(min, max) {
    return Math.round(Math.random() * (max - min) + min);
  }

  /**
   * 获取所有指标
   */
  async getAllMetrics() {
    const metrics = {};

    for (const chartId of Object.keys(this.chartConfigs)) {
      try {
        metrics[chartId] = await this.getChartData(chartId);
      } catch (error) {
        logger.error(`获取图表 ${chartId} 数据失败:`, error);
      }
    }

    return metrics;
  }

  /**
   * 获取仪表板统计
   */
  getDashboardStats() {
    return {
      connectedClients: this.clients.size,
      activeSubscriptions: Array.from(this.clients).reduce((total, client) =>
        total + client.subscriptions.size, 0),
      uptime: process.uptime(),
      charts: Object.keys(this.chartConfigs).length,
      updateInterval: this.config.updateInterval
    };
  }
}

module.exports = MetricsDashboard;