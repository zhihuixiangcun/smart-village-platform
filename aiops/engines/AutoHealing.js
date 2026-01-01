/**
 * 自动故障恢复引擎
 * 实现智能故障检测、自动诊断和恢复机制
 */

const EventEmitter = require('events');
const { exec } = require('child_process');
const fs = require('fs').promises;
const logger = require('./../../monitoring/services/../../src/services/performanceMonitor').logger;

class AutoHealing extends EventEmitter {
  constructor() {
    super();
    this.healthChecks = new Map();
    this.incidents = new Map();
    this.healingActions = new Map();
    this.isRunning = false;

    // 恢复配置
    this.config = {
      // 检查配置
      checkInterval: 30000,        // 30秒检查一次
      maxRetries: 3,               // 最大重试次数
      timeoutMs: 10000,           // 超时时间

      // 故障阈值
      thresholds: {
        consecutiveFailures: 3,   // 连续失败次数
        errorRate: 0.1,           // 错误率阈值
        responseTime: 5000,       // 响应时间阈值(ms)
        resourceUsage: 90,        // 资源使用率阈值(%)
        connectionPool: 0.8        // 连接池使用率阈值
      },

      // 恢复策略
      recoveryStrategies: {
        serviceRestart: {
          enabled: true,
          maxAttempts: 2,
          cooldown: 300000        // 5分钟冷却期
        },
        containerRestart: {
          enabled: true,
          maxAttempts: 3,
          cooldown: 180000        // 3分钟冷却期
        },
        configReload: {
          enabled: true,
          maxAttempts: 5,
          cooldown: 60000        // 1分钟冷却期
        },
        cacheClear: {
          enabled: true,
          maxAttempts: 10,
          cooldown: 30000        // 30秒冷却期
        },
        databaseReconnect: {
          enabled: true,
          maxAttempts: 2,
          cooldown: 60000        // 1分钟冷却期
        },
        scaleUpDown: {
          enabled: true,
          maxAttempts: 2,
          cooldown: 120000        // 2分钟冷却期
        }
      },

      // 服务配置
      services: {
        'user-service': {
          healthEndpoint: 'http://localhost:3001/health',
          port: 3001,
          processName: 'user-service',
          strategies: ['serviceRestart', 'configReload', 'scaleUpDown']
        },
        'resident-service': {
          healthEndpoint: 'http://localhost:4001/health',
          port: 4001,
          processName: 'resident-service',
          strategies: ['serviceRestart', 'configReload', 'cacheClear']
        },
        'governance-service': {
          healthEndpoint: 'http://localhost:5002/health',
          port: 5002,
          processName: 'governance-service',
          strategies: ['serviceRestart', 'containerRestart', 'configReload']
        },
        'finance-service': {
          healthEndpoint: 'http://localhost:6001/health',
          port: 6001,
          processName: 'finance-service',
          strategies: ['serviceRestart', 'databaseReconnect', 'configReload']
        },
        'monitoring-service': {
          healthEndpoint: 'http://localhost:3002/health',
          port: 3002,
          processName: 'monitoring-service',
          strategies: ['serviceRestart', 'cacheClear']
        },
        'rabbitmq': {
          healthEndpoint: 'http://localhost:15672/api/healthchecks/node',
          port: 5672,
          processName: 'rabbitmq',
          strategies: ['serviceRestart', 'configReload']
        },
        'mongodb': {
          healthEndpoint: 'mongodb://localhost:27017/test',
          port: 27017,
          processName: 'mongod',
          strategies: ['serviceRestart', 'configReload']
        },
        'redis': {
          healthEndpoint: 'redis://localhost:6379',
          port: 6379,
          processName: 'redis-server',
          strategies: ['serviceRestart', 'cacheClear']
        }
      }
    };

    // 故障类型定义
    this.faultTypes = {
      SERVICE_UNAVAILABLE: 'service_unavailable',
      HIGH_ERROR_RATE: 'high_error_rate',
      SLOW_RESPONSE: 'slow_response',
      RESOURCE_EXHAUSTION: 'resource_exhaustion',
      CONNECTION_FAILURE: 'connection_failure',
      DATABASE_ERROR: 'database_error',
      CACHE_ERROR: 'cache_error',
      MEMORY_LEAK: 'memory_leak',
      DEADLOCK: 'deadlock',
      CONFIGURATION_ERROR: 'configuration_error'
    };
  }

  /**
   * 启动自动故障恢复服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('自动故障恢复服务已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('启动智能自动故障恢复服务');

    // 初始化健康检查
    await this.initializeHealthChecks();

    // 启动定期健康检查
    this.startPeriodicHealthChecks();

    logger.info('自动故障恢复服务启动成功');
  }

  /**
   * 停止自动故障恢复服务
   */
  async stop() {
    this.isRunning = false;
    logger.info('自动故障恢复服务已停止');
  }

  /**
   * 初始化健康检查
   */
  async initializeHealthChecks() {
    for (const [serviceName, config] of Object.entries(this.config.services)) {
      const healthCheck = {
        serviceName,
        config,
        status: 'unknown',
        lastCheck: null,
        consecutiveFailures: 0,
        totalChecks: 0,
        successfulChecks: 0,
        averageResponseTime: 0,
        lastError: null,
        incidents: [],
        recoveryAttempts: {},
        metrics: {
          responseTimes: [],
          errorRates: [],
          resourceUsage: {}
        }
      };

      this.healthChecks.set(serviceName, healthCheck);
      logger.debug(`初始化健康检查: ${serviceName}`);
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(serviceName) {
    const healthCheck = this.healthChecks.get(serviceName);
    if (!healthCheck) {
      logger.warn(`健康检查不存在: ${serviceName}`);
      return null;
    }

    const startTime = Date.now();
    let checkResult = {
      status: 'healthy',
      responseTime: 0,
      error: null,
      details: {}
    };

    try {
      // 执行健康检查
      checkResult = await this.checkServiceHealth(healthCheck);

      // 更新指标
      this.updateMetrics(healthCheck, checkResult);

    } catch (error) {
      checkResult.status = 'error';
      checkResult.error = error.message;

      logger.error(`健康检查失败 ${serviceName}:`, error);
    }

    const responseTime = Date.now() - startTime;
    checkResult.responseTime = responseTime;

    // 更新健康检查状态
    this.updateHealthCheckStatus(healthCheck, checkResult);

    // 检查是否需要故障恢复
    await this.checkAndHeal(healthCheck);

    return checkResult;
  }

  /**
   * 检查服务健康状态
   */
  async checkServiceHealth(healthCheck) {
    const { serviceName, config } = healthCheck;
    const result = {
      status: 'healthy',
      responseTime: 0,
      error: null,
      details: {}
    };

    try {
      // HTTP健康检查
      if (config.healthEndpoint.startsWith('http')) {
        const response = await this.performHTTPCheck(config.healthEndpoint);
        result.status = response.status;
        result.details = response.details;
      }
      // 数据库健康检查
      else if (config.healthEndpoint.startsWith('mongodb')) {
        const response = await this.performMongoCheck(config.healthEndpoint);
        result.status = response.status;
        result.details = response.details;
      }
      // Redis健康检查
      else if (config.healthEndpoint.startsWith('redis')) {
        const response = await this.performRedisCheck(config.healthEndpoint);
        result.status = response.status;
        result.details = response.details;
      }

      // 进程健康检查
      const processStatus = await this.checkProcessHealth(config.processName);
      result.details.process = processStatus;

      // 端口检查
      const portStatus = await this.checkPortHealth(config.port);
      result.details.port = portStatus;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
    }

    return result;
  }

  /**
   * HTTP健康检查
   */
  async performHTTPCheck(endpoint) {
    const fetch = require('node-fetch');
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: this.config.timeoutMs
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      return {
        status: response.ok && data.success ? 'healthy' : 'unhealthy',
        responseTime,
        details: {
          statusCode: response.status,
          success: data.success,
          service: data.service,
          uptime: data.uptime,
          database: data.database
        }
      };

    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: { error: error.message }
      };
    }
  }

  /**
   * MongoDB健康检查
   */
  async performMongoCheck(connectionString) {
    const mongoose = require('mongoose');
    const startTime = Date.now();

    try {
      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: this.config.timeoutMs
      });

      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();

      await mongoose.disconnect();

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          memory: serverStatus.mem
        }
      };

    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: { error: error.message }
      };
    }
  }

  /**
   * Redis健康检查
   */
  async performRedisCheck(connectionString) {
    const redis = require('redis');
    const startTime = Date.now();

    try {
      const client = redis.createClient({
        url: connectionString,
        socket: {
          connectTimeout: this.config.timeoutMs
        }
      });

      await client.connect();
      await client.ping();
      const info = await client.info();
      await client.quit();

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          info: this.parseRedisInfo(info)
        }
      };

    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: { error: error.message }
      };
    }
  }

  /**
   * 检查进程健康状态
   */
  async checkProcessHealth(processName) {
    return new Promise((resolve) => {
      exec(`pgrep -f "${processName}" | wc -l`, (error, stdout) => {
        if (error) {
          resolve({ status: 'error', count: 0, error: error.message });
          return;
        }

        const count = parseInt(stdout.trim());
        resolve({
          status: count > 0 ? 'healthy' : 'unhealthy',
          count,
          running: count > 0
        });
      });
    });
  }

  /**
   * 检查端口健康状态
   */
  async checkPortHealth(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();

      socket.setTimeout(this.config.timeoutMs);

      socket.connect(port, 'localhost', () => {
        socket.destroy();
        resolve({ status: 'healthy', port, listening: true });
      });

      socket.on('error', () => {
        resolve({ status: 'unhealthy', port, listening: false });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ status: 'timeout', port, listening: false });
      });
    });
  }

  /**
   * 更新健康检查状态
   */
  updateHealthCheckStatus(healthCheck, result) {
    const now = Date.now();
    const previousStatus = healthCheck.status;

    healthCheck.lastCheck = now;
    healthCheck.totalChecks++;

    if (result.status === 'healthy') {
      healthCheck.status = 'healthy';
      healthCheck.successfulChecks++;
      healthCheck.consecutiveFailures = 0;
      healthCheck.lastError = null;
    } else {
      healthCheck.status = 'unhealthy';
      healthCheck.consecutiveFailures++;
      healthCheck.lastError = result.error;
    }

    // 更新平均响应时间
    healthCheck.metrics.responseTimes.push(result.responseTime);
    if (healthCheck.metrics.responseTimes.length > 100) {
      healthCheck.metrics.responseTimes = healthCheck.metrics.responseTimes.slice(-50);
    }
    healthCheck.averageResponseTime = healthCheck.metrics.responseTimes.reduce(
      (sum, time) => sum + time, 0
    ) / healthCheck.metrics.responseTimes.length;

    // 检查状态变化
    if (previousStatus === 'healthy' && result.status !== 'healthy') {
      this.handleServiceDown(healthCheck);
    } else if (previousStatus !== 'healthy' && result.status === 'healthy') {
      this.handleServiceUp(healthCheck);
    }

    // 发出健康检查事件
    this.emit('health_check_completed', {
      serviceName: healthCheck.serviceName,
      status: result.status,
      responseTime: result.responseTime,
      consecutiveFailures: healthCheck.consecutiveFailures,
      details: result.details
    });
  }

  /**
   * 更新指标
   */
  updateMetrics(healthCheck, result) {
    // 更新响应时间指标
    healthCheck.metrics.responseTimes.push(result.responseTime);

    // 更新错误率指标
    const isError = result.status !== 'healthy';
    healthCheck.metrics.errorRates.push(isError ? 1 : 0);

    // 保持指标数组在合理范围内
    if (healthCheck.metrics.responseTimes.length > 100) {
      healthCheck.metrics.responseTimes = healthCheck.metrics.responseTimes.slice(-50);
    }
    if (healthCheck.metrics.errorRates.length > 100) {
      healthCheck.metrics.errorRates = healthCheck.metrics.errorRates.slice(-50);
    }
  }

  /**
   * 检查并执行故障恢复
   */
  async checkAndHeal(healthCheck) {
    const serviceName = healthCheck.serviceName;
    const consecutiveFailures = healthCheck.consecutiveFailures;

    // 检查是否达到故障阈值
    if (consecutiveFailures >= this.config.thresholds.consecutiveFailures) {
      const faultType = this.diagnoseFaultType(healthCheck);
      const incidentId = this.createIncident(serviceName, faultType);

      logger.warn(`检测到故障: ${serviceName} - ${faultType}`, {
        consecutiveFailures,
        incidentId
      });

      // 尝试自动恢复
      await this.attemptAutoHealing(serviceName, incidentId, faultType);
    }
  }

  /**
   * 诊断故障类型
   */
  diagnoseFaultType(healthCheck) {
    const { consecutiveFailures, lastError, metrics } = healthCheck;

    // 基于错误消息诊断
    if (lastError) {
      if (lastError.includes('ECONNREFUSED') || lastError.includes('timeout')) {
        return this.faultTypes.SERVICE_UNAVAILABLE;
      }
      if (lastError.includes('database') || lastError.includes('MongoDB')) {
        return this.faultTypes.DATABASE_ERROR;
      }
      if (lastError.includes('Redis') || lastError.includes('cache')) {
        return this.faultTypes.CACHE_ERROR;
      }
      if (lastError.includes('memory') || lastError.includes('out of memory')) {
        return this.faultTypes.MEMORY_LEAK;
      }
      if (lastError.includes('deadlock')) {
        return this.faultTypes.DEADLOCK;
      }
    }

    // 基于指标诊断
    const avgResponseTime = metrics.responseTimes.length > 0 ?
      metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length : 0;

    if (avgResponseTime > this.config.thresholds.responseTime) {
      return this.faultTypes.SLOW_RESPONSE;
    }

    const errorRate = metrics.errorRates.length > 0 ?
      metrics.errorRates.reduce((sum, error) => sum + error, 0) / metrics.errorRates.length : 0;

    if (errorRate > this.config.thresholds.errorRate) {
      return this.faultTypes.HIGH_ERROR_RATE;
    }

    return this.faultTypes.SERVICE_UNAVAILABLE;
  }

  /**
   * 创建故障事件
   */
  createIncident(serviceName, faultType) {
    const incidentId = `incident_${serviceName}_${Date.now()}`;
    const incident = {
      id: incidentId,
      serviceName,
      faultType,
      status: 'open',
      createdAt: Date.now(),
      resolvedAt: null,
      resolution: null,
      healingAttempts: [],
      severity: this.calculateSeverity(faultType)
    };

    this.incidents.set(incidentId, incident);

    // 发出故障事件
    this.emit('incident_created', incident);

    return incidentId;
  }

  /**
   * 尝试自动恢复
   */
  async attemptAutoHealing(serviceName, incidentId, faultType) {
    const healthCheck = this.healthChecks.get(serviceName);
    const incident = this.incidents.get(incidentId);
    const serviceConfig = this.config.services[serviceName];

    if (!healthCheck || !incident || !serviceConfig) {
      return false;
    }

    logger.info(`开始自动恢复: ${serviceName}`, {
      incidentId,
      faultType
    });

    // 根据故障类型和服务配置选择恢复策略
    const strategies = this.selectRecoveryStrategies(faultType, serviceConfig);

    let healed = false;
    const healingAttempts = [];

    for (const strategy of strategies) {
      try {
        const attemptResult = await this.executeRecoveryStrategy(
          serviceName, strategy, incidentId
        );

        healingAttempts.push({
          strategy,
          timestamp: Date.now(),
          success: attemptResult.success,
          details: attemptResult.details
        });

        if (attemptResult.success) {
          // 验证恢复效果
          const isRecovered = await this.verifyRecovery(serviceName);
          if (isRecovered) {
            healed = true;
            logger.info(`自动恢复成功: ${serviceName}`, {
              strategy,
              incidentId
            });
            break;
          }
        }

        // 恢复策略间等待
        await this.sleep(5000);

      } catch (error) {
        healingAttempts.push({
          strategy,
          timestamp: Date.now(),
          success: false,
          error: error.message
        });

        logger.error(`恢复策略失败 ${serviceName} - ${strategy}:`, error);
      }
    }

    // 更新事件状态
    if (healed) {
      incident.status = 'resolved';
      incident.resolvedAt = Date.now();
      incident.resolution = 'auto_healed';
    }

    incident.healingAttempts = healingAttempts;

    // 发出恢复完成事件
    this.emit('healing_completed', {
      serviceName,
      incidentId,
      faultType,
      healed,
      strategies: healingAttempts
    });

    return healed;
  }

  /**
   * 选择恢复策略
   */
  selectRecoveryStrategies(faultType, serviceConfig) {
    const strategies = [];
    const enabledStrategies = serviceConfig.strategies || [];

    // 根据故障类型选择策略
    switch (faultType) {
      case this.faultTypes.SERVICE_UNAVAILABLE:
        strategies.push('serviceRestart', 'configReload');
        if (enabledStrategies.includes('containerRestart')) {
          strategies.push('containerRestart');
        }
        break;

      case this.faultTypes.HIGH_ERROR_RATE:
        strategies.push('serviceRestart', 'cacheClear', 'configReload');
        break;

      case this.faultTypes.SLOW_RESPONSE:
        strategies.push('cacheClear', 'configReload');
        if (enabledStrategies.includes('scaleUpDown')) {
          strategies.push('scaleUpDown');
        }
        break;

      case this.faultTypes.DATABASE_ERROR:
        strategies.push('databaseReconnect', 'serviceRestart');
        break;

      case this.faultTypes.CACHE_ERROR:
        strategies.push('cacheClear', 'serviceRestart');
        break;

      case this.faultTypes.MEMORY_LEAK:
        strategies.push('serviceRestart', 'containerRestart');
        break;

      case this.faultTypes.CONNECTION_FAILURE:
        strategies.push('serviceRestart', 'configReload');
        break;

      default:
        strategies.push('serviceRestart', 'configReload');
    }

    // 过滤启用的策略
    return strategies.filter(strategy =>
      enabledStrategies.includes(strategy) &&
      this.config.recoveryStrategies[strategy]?.enabled
    );
  }

  /**
   * 执行恢复策略
   */
  async executeRecoveryStrategy(serviceName, strategy, incidentId) {
    const strategyConfig = this.config.recoveryStrategies[strategy];
    const serviceConfig = this.config.services[serviceName];

    if (!strategyConfig || !serviceConfig) {
      return { success: false, details: 'Strategy or service config not found' };
    }

    // 检查冷却期
    const lastAttempt = this.getLastStrategyAttempt(serviceName, strategy);
    if (lastAttempt && (Date.now() - lastAttempt < strategyConfig.cooldown)) {
      return {
        success: false,
        details: `策略在冷却期内，剩余时间: ${Math.ceil((strategyConfig.cooldown - (Date.now() - lastAttempt)) / 1000)}秒`
      };
    }

    // 记录策略尝试
    this.recordStrategyAttempt(serviceName, strategy);

    try {
      let result;

      switch (strategy) {
        case 'serviceRestart':
          result = await this.restartService(serviceName);
          break;

        case 'containerRestart':
          result = await this.restartContainer(serviceName);
          break;

        case 'configReload':
          result = await this.reloadConfig(serviceName);
          break;

        case 'cacheClear':
          result = await this.clearCache(serviceName);
          break;

        case 'databaseReconnect':
          result = await this.reconnectDatabase(serviceName);
          break;

        case 'scaleUpDown':
          result = await this.scaleService(serviceName);
          break;

        default:
          result = { success: false, details: 'Unknown recovery strategy' };
      }

      return result;

    } catch (error) {
      return {
        success: false,
        details: error.message,
        error
      };
    }
  }

  /**
   * 重启服务
   */
  async restartService(serviceName) {
    logger.info(`重启服务: ${serviceName}`);

    return new Promise((resolve) => {
      exec(`pm2 restart ${serviceName}`, (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            details: `pm2 restart failed: ${error.message}`,
            stdout,
            stderr
          });
        } else {
          resolve({
            success: true,
            details: 'Service restarted successfully',
            stdout
          });
        }
      });
    });
  }

  /**
   * 重启容器
   */
  async restartContainer(serviceName) {
    logger.info(`重启容器: ${serviceName}`);

    return new Promise((resolve) => {
      exec(`docker restart ${serviceName}`, (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            details: `docker restart failed: ${error.message}`,
            stdout,
            stderr
          });
        } else {
          resolve({
            success: true,
            details: 'Container restarted successfully',
            stdout
          });
        }
      });
    });
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(serviceName) {
    logger.info(`重新加载配置: ${serviceName}`);

    return new Promise((resolve) => {
      exec(`pm2 reload ${serviceName}`, (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            details: `pm2 reload failed: ${error.message}`,
            stdout,
            stderr
          });
        } else {
          resolve({
            success: true,
            details: 'Config reloaded successfully',
            stdout
          });
        }
      });
    });
  }

  /**
   * 清理缓存
   */
  async clearCache(serviceName) {
    logger.info(`清理缓存: ${serviceName}`);

    try {
      // 清理Redis缓存
      const redis = require('redis');
      const client = redis.createClient();
      await client.connect();
      await client.flushdb();
      await client.quit();

      return {
        success: true,
        details: 'Cache cleared successfully'
      };

    } catch (error) {
      return {
        success: false,
        details: `Cache clear failed: ${error.message}`,
        error
      };
    }
  }

  /**
   * 重新连接数据库
   */
  async reconnectDatabase(serviceName) {
    logger.info(`重新连接数据库: ${serviceName}`);

    try {
      // 这里应该根据具体服务执行相应的数据库重连逻辑
      // 简化实现
      await this.sleep(2000);

      return {
        success: true,
        details: 'Database reconnected successfully'
      };

    } catch (error) {
      return {
        success: false,
        details: `Database reconnection failed: ${error.message}`,
        error
      };
    }
  }

  /**
   * 扩容/缩容服务
   */
  async scaleService(serviceName) {
    logger.info(`扩容/缩容服务: ${serviceName}`);

    try {
      // 这里应该调用扩容API
      // 简化实现
      await this.sleep(5000);

      return {
        success: true,
        details: 'Service scaled successfully'
      };

    } catch (error) {
      return {
        success: false,
        details: `Service scaling failed: ${error.message}`,
        error
      };
    }
  }

  /**
   * 验证恢复效果
   */
  async verifyRecovery(serviceName) {
    logger.info(`验证恢复效果: ${serviceName}`);

    // 等待一段时间让服务稳定
    await this.sleep(10000);

    // 执行健康检查
    const healthCheck = await this.performHealthCheck(serviceName);

    return healthCheck.status === 'healthy';
  }

  /**
   * 启动定期健康检查
   */
  startPeriodicHealthChecks() {
    setInterval(async () => {
      if (!this.isRunning) return;

      const promises = [];
      for (const serviceName of Object.keys(this.config.services)) {
        promises.push(
          this.performHealthCheck(serviceName).catch(error => {
            logger.error(`定期健康检查失败 ${serviceName}:`, error);
          })
        );
      }

      await Promise.all(promises);

    }, this.config.checkInterval);
  }

  /**
   * 处理服务下线
   */
  handleServiceDown(healthCheck) {
    const serviceName = healthCheck.serviceName;

    logger.warn(`服务下线: ${serviceName}`, {
      consecutiveFailures: healthCheck.consecutiveFailures,
      lastError: healthCheck.lastError
    });

    this.emit('service_down', {
      serviceName,
      consecutiveFailures: healthCheck.consecutiveFailures,
      lastError: healthCheck.lastError,
      timestamp: Date.now()
    });
  }

  /**
   * 处理服务上线
   */
  handleServiceUp(healthCheck) {
    const serviceName = healthCheck.serviceName;

    logger.info(`服务恢复上线: ${serviceName}`, {
      uptime: healthCheck.successfulChecks,
      averageResponseTime: healthCheck.averageResponseTime
    });

    this.emit('service_up', {
      serviceName,
      uptime: healthCheck.successfulChecks,
      averageResponseTime: healthCheck.averageResponseTime,
      timestamp: Date.now()
    });
  }

  /**
   * 计算严重程度
   */
  calculateSeverity(faultType) {
    const severityMap = {
      [this.faultTypes.SERVICE_UNAVAILABLE]: 'critical',
      [this.faultTypes.DATABASE_ERROR]: 'critical',
      [this.faultTypes.MEMORY_LEAK]: 'high',
      [this.faultTypes.HIGH_ERROR_RATE]: 'high',
      [this.faultTypes.SLOW_RESPONSE]: 'medium',
      [this.faultTypes.CONNECTION_FAILURE]: 'medium',
      [this.faultTypes.CACHE_ERROR]: 'low',
      [this.faultTypes.DEADLOCK]: 'high',
      [this.faultTypes.CONFIGURATION_ERROR]: 'low'
    };

    return severityMap[faultType] || 'medium';
  }

  /**
   * 记录策略尝试
   */
  recordStrategyAttempt(serviceName, strategy) {
    const key = `${serviceName}:${strategy}`;
    this.healingActions.set(key, Date.now());
  }

  /**
   * 获取最后策略尝试时间
   */
  getLastStrategyAttempt(serviceName, strategy) {
    const key = `${serviceName}:${strategy}`;
    return this.healingActions.get(key) || 0;
  }

  /**
   * 获取故障恢复统计
   */
  getHealingStats() {
    const stats = {
      totalIncidents: this.incidents.size,
      openIncidents: 0,
      resolvedIncidents: 0,
      totalHealingAttempts: 0,
      successfulHealing: 0,
      services: {}
    };

    // 统计事件
    for (const incident of this.incidents.values()) {
      if (incident.status === 'open') {
        stats.openIncidents++;
      } else {
        stats.resolvedIncidents++;
      }

      stats.totalHealingAttempts += incident.healingAttempts.length;

      const successfulAttempts = incident.healingAttempts.filter(a => a.success).length;
      stats.successfulHealing += successfulAttempts;
    }

    // 统计服务状态
    for (const [serviceName, healthCheck] of this.healthChecks) {
      stats.services[serviceName] = {
        status: healthCheck.status,
        consecutiveFailures: healthCheck.consecutiveFailures,
        totalChecks: healthCheck.totalChecks,
        successfulChecks: healthCheck.successfulChecks,
        averageResponseTime: healthCheck.averageResponseTime
      };
    }

    return stats;
  }

  /**
   * 获取服务健康状态
   */
  getServiceHealth(serviceName) {
    const healthCheck = this.healthChecks.get(serviceName);
    const incident = Array.from(this.incidents.values())
      .find(inc => inc.serviceName === serviceName && inc.status === 'open');

    return healthCheck ? {
      serviceName: healthCheck.serviceName,
      status: healthCheck.status,
      lastCheck: healthCheck.lastCheck,
      consecutiveFailures: healthCheck.consecutiveFailures,
      totalChecks: healthCheck.totalChecks,
      successfulChecks: healthCheck.successfulChecks,
      averageResponseTime: healthCheck.averageResponseTime,
      lastError: healthCheck.lastError,
      openIncident: incident,
      incidents: Array.from(this.incidents.values())
        .filter(inc => inc.serviceName === serviceName)
        .slice(-5)
    } : null;
  }

  /**
   * 工具方法
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const parsed = {};

    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = value;
      }
    });

    return parsed;
  }
}

module.exports = AutoHealing;