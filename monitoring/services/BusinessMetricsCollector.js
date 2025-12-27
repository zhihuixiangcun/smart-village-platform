/**
 * 业务指标收集器
 * 负责收集和处理智慧乡村平台的各类业务监控指标
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const redis = require('redis');
const logger = require('./../../src/services/performanceMonitor').logger;

class BusinessMetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.timers = new Map();
    this.redis = null;
    this.isRunning = false;

    // 业务指标定义
    this.metricDefinitions = {
      // 用户相关指标
      activeUsers: {
        type: 'gauge',
        description: '实时活跃用户数',
        unit: 'count',
        interval: 60000 // 1分钟更新一次
      },
      newUsers: {
        type: 'counter',
        description: '新增用户数',
        unit: 'count',
        interval: 300000 // 5分钟更新一次
      },
      userRetention: {
        type: 'percentage',
        description: '用户留存率',
        unit: '%',
        interval: 3600000 // 1小时更新一次
      },

      // 交易相关指标
      transactionRate: {
        type: 'rate',
        description: '交易处理速率',
        unit: 'tps',
        interval: 30000 // 30秒更新一次
      },
      transactionVolume: {
        type: 'counter',
        description: '交易总量',
        unit: 'count',
        interval: 60000 // 1分钟更新一次
      },
      transactionAmount: {
        type: 'counter',
        description: '交易金额',
        unit: 'yuan',
        interval: 60000 // 1分钟更新一次
      },

      // 业务功能指标
      announcementViews: {
        type: 'counter',
        description: '公告浏览量',
        unit: 'count',
        interval: 30000
      },
      meetingAttendance: {
        type: 'percentage',
        description: '会议出席率',
        unit: '%',
        interval: 3600000
      },
      taskCompletion: {
        type: 'percentage',
        description: '任务完成率',
        unit: '%',
        interval: 1800000 // 30分钟更新一次
      },

      // 系统性能指标
      responseTime: {
        type: 'histogram',
        description: '平均响应时间',
        unit: 'ms',
        interval: 30000
      },
      errorRate: {
        type: 'percentage',
        description: '业务错误率',
        unit: '%',
        interval: 60000
      },
      throughput: {
        type: 'rate',
        description: '系统吞吐量',
        unit: 'rps',
        interval: 30000
      },

      // 村务特定指标
      residentRegistration: {
        type: 'counter',
        description: '村民注册数',
        unit: 'count',
        interval: 300000
      },
      serviceRequest: {
        type: 'counter',
        description: '服务请求数',
        unit: 'count',
        interval: 60000
      },
      emergencyResponse: {
        type: 'counter',
        description: '应急事件响应数',
        unit: 'count',
        interval: 30000
      }
    };

    this.initRedis();
  }

  /**
   * 初始化Redis连接
   */
  async initRedis() {
    try {
      this.redis = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      });

      this.redis.on('connect', () => {
        logger.info('Redis连接成功，用于指标存储');
      });

      this.redis.on('error', (error) => {
        logger.error('Redis连接失败:', error);
      });

      await this.redis.connect();
    } catch (error) {
      logger.error('初始化Redis失败:', error);
    }
  }

  /**
   * 启动指标收集器
   */
  async start() {
    if (this.isRunning) {
      logger.warn('指标收集器已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('启动业务指标收集器');

    // 启动所有指标的定时收集
    for (const [metricName, definition] of Object.entries(this.metricDefinitions)) {
      this.startMetricCollection(metricName, definition);
    }

    // 定期清理过期数据
    this.startDataCleanup();
  }

  /**
   * 停止指标收集器
   */
  async stop() {
    this.isRunning = false;

    // 清理所有定时器
    for (const [metricName, timer] of this.timers) {
      clearInterval(timer);
      this.timers.delete(metricName);
    }

    logger.info('业务指标收集器已停止');
  }

  /**
   * 启动单个指标的收集
   */
  startMetricCollection(metricName, definition) {
    const timer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const value = await this.collectMetric(metricName);
        if (value !== null) {
          await this.storeMetric(metricName, value, definition);
          this.emit('metric', { metric: metricName, value, timestamp: new Date() });
        }
      } catch (error) {
        logger.error(`收集指标 ${metricName} 失败:`, error);
      }
    }, definition.interval);

    this.timers.set(metricName, timer);
    logger.info(`启动指标收集: ${metricName}, 间隔: ${definition.interval}ms`);
  }

  /**
   * 收集单个指标
   */
  async collectMetric(metricName) {
    switch (metricName) {
      case 'activeUsers':
        return await this.getActiveUsers();

      case 'newUsers':
        return await this.getNewUsers();

      case 'userRetention':
        return await this.getUserRetention();

      case 'transactionRate':
        return await this.getTransactionRate();

      case 'transactionVolume':
        return await this.getTransactionVolume();

      case 'transactionAmount':
        return await this.getTransactionAmount();

      case 'announcementViews':
        return await this.getAnnouncementViews();

      case 'meetingAttendance':
        return await this.getMeetingAttendance();

      case 'taskCompletion':
        return await this.getTaskCompletion();

      case 'responseTime':
        return await this.getResponseTime();

      case 'errorRate':
        return await this.getErrorRate();

      case 'throughput':
        return await this.getThroughput();

      case 'residentRegistration':
        return await this.getResidentRegistration();

      case 'serviceRequest':
        return await this.getServiceRequest();

      case 'emergencyResponse':
        return await this.getEmergencyResponse();

      default:
        logger.warn(`未知的指标类型: ${metricName}`);
        return null;
    }
  }

  /**
   * 获取实时活跃用户数
   */
  async getActiveUsers() {
    try {
      // 从Redis获取在线用户数
      const activeUsers = await this.redis.sCard('active_users');
      return activeUsers;
    } catch (error) {
      logger.error('获取活跃用户数失败:', error);
      return 0;
    }
  }

  /**
   * 获取新增用户数
   */
  async getNewUsers() {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // 查询最近5分钟的新增用户
      const result = await mongoose.connection.db.collection('users').countDocuments({
        createdAt: { $gte: fiveMinutesAgo }
      });

      return result;
    } catch (error) {
      logger.error('获取新增用户数失败:', error);
      return 0;
    }
  }

  /**
   * 获取用户留存率
   */
  async getUserRetention() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 计算日留存率
      const yesterdayUsers = await mongoose.connection.db.collection('users').countDocuments({
        createdAt: { $gte: sevenDaysAgo, $lt: oneDayAgo }
      });

      const activeYesterdayUsers = await mongoose.connection.db.collection('user_sessions').countDocuments({
        lastLoginAt: { $gte: oneDayAgo },
        createdAt: { $gte: sevenDaysAgo, $lt: oneDayAgo }
      });

      if (yesterdayUsers === 0) return 0;
      return Math.round((activeYesterdayUsers / yesterdayUsers) * 100);
    } catch (error) {
      logger.error('获取用户留存率失败:', error);
      return 0;
    }
  }

  /**
   * 获取交易处理速率
   */
  async getTransactionRate() {
    try {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      const transactionCount = await mongoose.connection.db.collection('transactions').countDocuments({
        createdAt: { $gte: thirtySecondsAgo }
      });

      // 转换为TPS (每秒交易数)
      return Math.round(transactionCount / 30 * 100) / 100;
    } catch (error) {
      logger.error('获取交易处理速率失败:', error);
      return 0;
    }
  }

  /**
   * 获取交易总量
   */
  async getTransactionVolume() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const result = await mongoose.connection.db.collection('transactions').countDocuments({
        createdAt: { $gte: startOfDay }
      });

      return result;
    } catch (error) {
      logger.error('获取交易总量失败:', error);
      return 0;
    }
  }

  /**
   * 获取交易金额
   */
  async getTransactionAmount() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const result = await mongoose.connection.db.collection('transactions').aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]).toArray();

      return result.length > 0 ? result[0].totalAmount : 0;
    } catch (error) {
      logger.error('获取交易金额失败:', error);
      return 0;
    }
  }

  /**
   * 获取公告浏览量
   */
  async getAnnouncementViews() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const result = await mongoose.connection.db.collection('announcements').aggregate([
        {
          $match: {
            'metrics.lastView': { $gte: startOfDay }
          }
        },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$metrics.views' }
          }
        }
      ]).toArray();

      return result.length > 0 ? result[0].totalViews : 0;
    } catch (error) {
      logger.error('获取公告浏览量失败:', error);
      return 0;
    }
  }

  /**
   * 获取会议出席率
   */
  async getMeetingAttendance() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const meetings = await mongoose.connection.db.collection('meetings').find({
        scheduledTime: { $gte: startOfDay, $lte: today },
        status: '已结束'
      }).toArray();

      if (meetings.length === 0) return 0;

      let totalAttendance = 0;
      let totalParticipants = 0;

      for (const meeting of meetings) {
        const expected = meeting.participants?.required?.length || 0;
        const attended = meeting.attendance?.filter(a => a.status === '已签到').length || 0;

        totalParticipants += expected;
        totalAttendance += attended;
      }

      if (totalParticipants === 0) return 0;
      return Math.round((totalAttendance / totalParticipants) * 100);
    } catch (error) {
      logger.error('获取会议出席率失败:', error);
      return 0;
    }
  }

  /**
   * 获取任务完成率
   */
  async getTaskCompletion() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const completed = await mongoose.connection.db.collection('tasks').countDocuments({
        status: '已完成',
        actualEndTime: { $gte: startOfDay }
      });

      const total = await mongoose.connection.db.collection('tasks').countDocuments({
        status: { $in: ['已完成', '进行中', '已取消'] },
        createdAt: { $gte: startOfDay }
      });

      if (total === 0) return 0;
      return Math.round((completed / total) * 100);
    } catch (error) {
      logger.error('获取任务完成率失败:', error);
      return 0;
    }
  }

  /**
   * 获取平均响应时间
   */
  async getResponseTime() {
    try {
      // 从Redis获取最近的响应时间数据
      const responseTimes = await this.redis.lRange('response_times', 0, -1);

      if (responseTimes.length === 0) return 0;

      const total = responseTimes.reduce((sum, time) => sum + parseFloat(time), 0);
      return Math.round(total / responseTimes.length);
    } catch (error) {
      logger.error('获取响应时间失败:', error);
      return 0;
    }
  }

  /**
   * 获取错误率
   */
  async getErrorRate() {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      const errors = await mongoose.connection.db.collection('error_logs').countDocuments({
        timestamp: { $gte: oneMinuteAgo }
      });

      const requests = await this.redis.get('total_requests_minute') || 0;

      if (requests === 0) return 0;
      return Math.round((errors / requests) * 100);
    } catch (error) {
      logger.error('获取错误率失败:', error);
      return 0;
    }
  }

  /**
   * 获取系统吞吐量
   */
  async getThroughput() {
    try {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      const requestCount = await mongoose.connection.db.collection('access_logs').countDocuments({
        timestamp: { $gte: thirtySecondsAgo }
      });

      // 转换为RPS (每秒请求数)
      return Math.round(requestCount / 30 * 100) / 100;
    } catch (error) {
      logger.error('获取系统吞吐量失败:', error);
      return 0;
    }
  }

  /**
   * 获取村民注册数
   */
  async getResidentRegistration() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const result = await mongoose.connection.db.collection('residents').countDocuments({
        createdAt: { $gte: fiveMinutesAgo }
      });

      return result;
    } catch (error) {
      logger.error('获取村民注册数失败:', error);
      return 0;
    }
  }

  /**
   * 获取服务请求数
   */
  async getServiceRequest() {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

      const result = await mongoose.connection.db.collection('service_requests').countDocuments({
        createdAt: { $gte: oneMinuteAgo }
      });

      return result;
    } catch (error) {
      logger.error('获取服务请求数失败:', error);
      return 0;
    }
  }

  /**
   * 获取应急事件响应数
   */
  async getEmergencyResponse() {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

      const result = await mongoose.connection.db.collection('emergency_events').countDocuments({
        createdAt: { $gte: thirtySecondsAgo }
      });

      return result;
    } catch (error) {
      logger.error('获取应急事件响应数失败:', error);
      return 0;
    }
  }

  /**
   * 存储指标数据
   */
  async storeMetric(metricName, value, definition) {
    try {
      const timestamp = Date.now();
      const metricData = {
        name: metricName,
        value: value,
        unit: definition.unit,
        type: definition.type,
        timestamp: timestamp,
        description: definition.description
      };

      // 存储到Redis (用于实时查询)
      await this.redis.hSet('metrics', metricName, JSON.stringify(metricData));

      // 存储到时间序列 (用于历史数据)
      const timeSeriesKey = `metrics:${metricName}`;
      await this.redis.zAdd(timeSeriesKey, {
        score: timestamp,
        value: JSON.stringify(metricData)
      });

      // 设置过期时间 (保留7天)
      await this.redis.expire(timeSeriesKey, 7 * 24 * 3600);

      // 更新内存缓存
      this.metrics.set(metricName, metricData);

    } catch (error) {
      logger.error(`存储指标 ${metricName} 失败:`, error);
    }
  }

  /**
   * 获取所有当前指标
   */
  async getAllMetrics() {
    try {
      const result = {};

      for (const [metricName, definition] of Object.entries(this.metricDefinitions)) {
        const data = await this.redis.hGet('metrics', metricName);
        if (data) {
          result[metricName] = JSON.parse(data);
        } else {
          // 如果Redis中没有数据，尝试从内存获取
          const memoryData = this.metrics.get(metricName);
          if (memoryData) {
            result[metricName] = memoryData;
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('获取所有指标失败:', error);
      return {};
    }
  }

  /**
   * 获取指标历史数据
   */
  async getMetricHistory(metricName, startTime, endTime) {
    try {
      const timeSeriesKey = `metrics:${metricName}`;
      const minScore = new Date(startTime).getTime();
      const maxScore = new Date(endTime).getTime();

      const results = await this.redis.zRangeByScore(timeSeriesKey, minScore, maxScore);

      return results.map(result => JSON.parse(result));
    } catch (error) {
      logger.error(`获取指标历史数据 ${metricName} 失败:`, error);
      return [];
    }
  }

  /**
   * 记录用户活动
   */
  async recordUserActivity(userId, activity) {
    try {
      // 添加到活跃用户集合
      await this.redis.sAdd('active_users', userId);
      await this.redis.expire('active_users', 300); // 5分钟过期

      // 记录用户活动日志
      await this.redis.lPush('user_activities', JSON.stringify({
        userId,
        activity,
        timestamp: Date.now()
      }));

      // 保持最近1000条记录
      await this.redis.lTrim('user_activities', 0, 999);

    } catch (error) {
      logger.error('记录用户活动失败:', error);
    }
  }

  /**
   * 记录API响应时间
   */
  async recordResponseTime(responseTime) {
    try {
      await this.redis.lPush('response_times', responseTime.toString());
      await this.redis.lTrim('response_times', 0, 999); // 保持最近1000条记录
    } catch (error) {
      logger.error('记录响应时间失败:', error);
    }
  }

  /**
   * 记录请求总数
   */
  async recordRequest() {
    try {
      const current = await this.redis.incr('total_requests_minute');
      if (current === 1) {
        await this.redis.expire('total_requests_minute', 60);
      }
    } catch (error) {
      logger.error('记录请求数失败:', error);
    }
  }

  /**
   * 定期清理过期数据
   */
  startDataCleanup() {
    // 每小时清理一次过期数据
    setInterval(async () => {
      try {
        // 清理超过7天的时间序列数据
        const sevenDaysAgo = Date.now() - (7 * 24 * 3600 * 1000);

        for (const metricName of Object.keys(this.metricDefinitions)) {
          const timeSeriesKey = `metrics:${metricName}`;
          await this.redis.zRemRangeByScore(timeSeriesKey, 0, sevenDaysAgo);
        }

        logger.debug('清理过期指标数据完成');
      } catch (error) {
        logger.error('清理过期数据失败:', error);
      }
    }, 3600000); // 1小时
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth() {
    try {
      const metrics = await this.getAllMetrics();

      // 定义健康阈值
      const thresholds = {
        responseTime: 1000, // 1秒
        errorRate: 5, // 5%
        activeUsers: 10 // 最少10个活跃用户
      };

      const health = {
        status: 'healthy',
        issues: [],
        metrics: metrics
      };

      // 检查各项指标
      if (metrics.responseTime && metrics.responseTime.value > thresholds.responseTime) {
        health.status = 'warning';
        health.issues.push(`响应时间过高: ${metrics.responseTime.value}ms`);
      }

      if (metrics.errorRate && metrics.errorRate.value > thresholds.errorRate) {
        health.status = 'critical';
        health.issues.push(`错误率过高: ${metrics.errorRate.value}%`);
      }

      if (metrics.activeUsers && metrics.activeUsers.value < thresholds.activeUsers) {
        health.status = 'warning';
        health.issues.push(`活跃用户数过低: ${metrics.activeUsers.value}`);
      }

      return health;
    } catch (error) {
      logger.error('获取系统健康状态失败:', error);
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }
}

module.exports = BusinessMetricsCollector;