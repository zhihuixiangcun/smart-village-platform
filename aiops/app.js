/**
 * 智能运维(AIOps)主应用
 * 整合异常检测、预测性扩容、自动故障恢复和容量规划建议功能
 */

require('dotenv').config();
const AnomalyDetection = require('./algorithms/AnomalyDetection');
const PredictiveScaling = require('./engines/PredictiveScaling');
const AutoHealing = require('./engines/AutoHealing');
const logger = require('./../monitoring/services/../../src/services/performanceMonitor').logger;

class AIOpsService {
  constructor() {
    this.anomalyDetection = new AnomalyDetection();
    this.predictiveScaling = new PredictiveScaling();
    this.autoHealing = new AutoHealing();
    this.isRunning = false;
    this.startTime = Date.now();

    // 服务配置
    this.config = {
      serviceName: 'aiops-service',
      version: process.env.AIOPS_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',

      // 集成配置
      integration: {
        monitoring: {
          enabled: true,
          updateInterval: 30000 // 30秒
        },
        kubernetes: {
          enabled: false,
          apiServer: process.env.K8S_API_SERVER || 'http://localhost:8080',
          namespace: 'smart-village'
        },
        docker: {
          enabled: true,
          socketPath: '/var/run/docker.sock'
        },
        cloudProvider: {
          enabled: false,
          provider: process.env.CLOUD_PROVIDER || 'aws',
          region: process.env.CLOUD_REGION || 'us-east-1'
        }
      }
    };

    // 容量规划配置
    this.capacityPlanning = {
      enabled: true,
      updateInterval: 3600000, // 1小时
      predictionHorizon: 604800000, // 7天
      growthFactor: 1.2,
      safetyFactor: 1.5,
      minResources: {
        cpu: 100,    // mCPU
        memory: 128, // MB
        storage: 1    // GB
      },
      maxResources: {
        cpu: 8000,   // mCPU
        memory: 16384, // MB
        storage: 100  // GB
      }
    };
  }

  /**
   * 启动AIOps服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('AIOps服务已在运行');
      return;
    }

    try {
      logger.info('启动智能运维(AIOps)服务...', {
        service: this.config.serviceName,
        version: this.config.version,
        environment: this.config.environment
      });

      // 启动各个组件
      await this.startAnomalyDetection();
      await this.startPredictiveScaling();
      await this.startAutoHealing();
      await this.startCapacityPlanning();

      // 设置组件间的事件通信
      this.setupEventHandlers();

      // 启动定期集成检查
      this.startPeriodicIntegration();

      this.isRunning = true;
      this.startTime = Date.now();

      logger.info('AIOps服务启动成功', {
        uptime: 0,
        components: ['anomaly-detection', 'predictive-scaling', 'auto-healing', 'capacity-planning'].length
      });

      // 发出启动完成事件
      this.emit('started');

    } catch (error) {
      logger.error('启动AIOps服务失败:', error);
      throw error;
    }
  }

  /**
   * 停止AIOps服务
   */
  async stop() {
    this.isRunning = false;

    try {
      logger.info('正在停止AIOps服务...');

      await this.autoHealing.stop();
      await this.predictiveScaling.stop();
      await this.anomalyDetection.stop();

      logger.info('AIOps服务已停止');

      // 发出停止完成事件
      this.emit('stopped');

    } catch (error) {
      logger.error('停止AIOps服务失败:', error);
    }
  }

  /**
   * 启动异常检测
   */
  async startAnomalyDetection() {
    await this.anomalyDetection.start();
    logger.info('异常检测服务启动成功');
  }

  /**
   * 启动预测性扩容
   */
  async startPredictiveScaling() {
    await this.predictiveScaling.start();
    logger.info('预测性扩容服务启动成功');
  }

  /**
   * 启动自动故障恢复
   */
  async startAutoHealing() {
    await this.autoHealing.start();
    logger.info('自动故障恢复服务启动成功');
  }

  /**
   * 启动容量规划
   */
  async startCapacityPlanning() {
    if (!this.capacityPlanning.enabled) {
      logger.info('容量规划功能未启用');
      return;
    }

    // 启动定期容量分析
    setInterval(async () => {
      if (!this.isRunning) return;
      await this.performCapacityPlanning();
    }, this.capacityPlanning.updateInterval);

    logger.info('容量规划服务启动成功');
  }

  /**
   * 设置组件间的事件通信
   */
  setupEventHandlers() {
    // 异常检测到的事件转发给自动恢复
    this.anomalyDetection.on('anomaly_detected', async (anomalyData) => {
      logger.warn('检测到异常，触发自动恢复流程', {
        metric: anomalyData.metric,
        severity: anomalyData.severity,
        score: anomalyData.score
      });

      // 通知自动恢复系统
      this.autoHealing.emit('anomaly_detected', anomalyData);
    });

    // 预测扩容决策事件
    this.predictiveScaling.on('scaling_decision', (decision) => {
      logger.info('预测扩容决策', {
        service: decision.serviceName,
        action: decision.action,
        current: decision.currentInstances,
        proposed: decision.proposedInstances,
        confidence: decision.confidence
      });

      // 发出扩容决策事件
      this.emit('scaling_decision', decision);
    });

    // 自动恢复完成事件
    this.autoHealing.on('healing_completed', (healingResult) => {
      if (healingResult.healed) {
        logger.info('自动恢复成功', {
          service: healingResult.serviceName,
          incidentId: healingResult.incidentId,
          strategies: healingResult.strategies
        });
      } else {
        logger.warn('自动恢复失败', {
          service: healingResult.serviceName,
          incidentId: healingResult.incidentId,
          strategies: healingResult.strategies
        });
      }

      // 发出恢复事件
      this.emit('healing_completed', healingResult);
    });

    // 健康检查事件
    this.autoHealing.on('service_down', (serviceData) => {
      logger.error('服务下线', {
        service: serviceData.serviceName,
        failures: serviceData.consecutiveFailures
      });

      // 发出服务下线事件
      this.emit('service_down', serviceData);
    });

    this.autoHealing.on('service_up', (serviceData) => {
      logger.info('服务恢复上线', {
        service: serviceData.serviceName,
        uptime: serviceData.uptime
      });

      // 发出服务上线事件
      this.emit('service_up', serviceData);
    });
  }

  /**
   * 启动定期集成检查
   */
  startPeriodicIntegration() {
    // 检查组件状态
    setInterval(() => {
      if (!this.isRunning) return;

      this.performComponentHealthCheck();
    }, 60000); // 1分钟检查一次

    // 集成监控数据
    setInterval(() => {
      if (!this.isRunning) return;

      this.integrateMonitoringData();
    }, this.config.integration.monitoring.updateInterval);

    // 生成运维报告
    setInterval(() => {
      if (!this.isRunning) return;

      this.generateAIOpsReport();
    }, 3600000); // 1小时生成一次报告
  }

  /**
   * 执行组件健康检查
   */
  async performComponentHealthCheck() {
    const healthStatus = {
      anomalyDetection: await this.anomalyDetection.getModelStats(),
      predictiveScaling: this.predictiveScaling.getScalingStats(),
      autoHealing: this.autoHealing.getHealingStats(),
      capacityPlanning: this.capacityPlanning.enabled ? {} : null
    };

    // 检查组件健康状态
    const unhealthyComponents = [];
    for (const [component, status] of Object.entries(healthStatus)) {
      if (!status || (component !== 'capacityPlanning' && Object.keys(status).length === 0)) {
        unhealthyComponents.push(component);
      }
    }

    if (unhealthyComponents.length > 0) {
      logger.warn('检测到不健康的AIOps组件:', unhealthyComponents);
      this.emit('component_unhealthy', {
        components: unhealthyComponents,
        healthStatus
      });
    }
  }

  /**
   * 集成监控数据
   */
  async integrateMonitoringData() {
    try {
      // 获取监控数据（这里应该从监控系统获取）
      const monitoringData = await this.getMonitoringData();

      // 将数据发送给异常检测
      for (const [serviceName, metrics] of Object.entries(monitoringData)) {
        for (const [metricName, value] of Object.entries(metrics)) {
          await this.anomalyDetection.detectAnomaly(metricName, value);
        }

        // 将负载数据发送给预测性扩容
        if (typeof metrics === 'object') {
          await this.predictiveScaling.addLoadData(serviceName, metrics);
        }
      }

    } catch (error) {
      logger.error('集成监控数据失败:', error);
    }
  }

  /**
   * 执行容量规划
   */
  async performCapacityPlanning() {
    try {
      logger.info('执行容量规划分析');

      const capacityReport = await this.analyzeCapacityRequirements();

      // 发出容量规划报告事件
      this.emit('capacity_planning_completed', capacityReport);

      logger.info('容量规划分析完成', {
        services: Object.keys(capacityReport.services || {}).length,
        recommendations: capacityReport.recommendations?.length || 0
      });

    } catch (error) {
      logger.error('容量规划分析失败:', error);
    }
  }

  /**
   * 分析容量需求
   */
  async analyzeCapacityRequirements() {
    const report = {
      timestamp: Date.now(),
      horizon: this.capacityPlanning.predictionHorizon,
      growthFactor: this.capacityPlanning.growthFactor,
      services: {},
      recommendations: []
    };

    // 分析每个服务的容量需求
    for (const serviceName of Object.keys(this.predictiveScaling.config.services)) {
      const scalingStats = this.predictiveScaling.getScalingStats();
      const healthStatus = this.autoHealing.getServiceHealth(serviceName);

      const serviceAnalysis = this.analyzeServiceCapacity(
        serviceName,
        scalingStats,
        healthStatus
      );

      report.services[serviceName] = serviceAnalysis;

      // 生成容量建议
      const recommendations = this.generateCapacityRecommendations(
        serviceName,
        serviceAnalysis
      );

      report.recommendations.push(...recommendations);
    }

    return report;
  }

  /**
   * 分析单个服务容量
   */
  analyzeServiceCapacity(serviceName, scalingStats, healthStatus) {
    const analysis = {
      serviceName,
      currentInstances: scalingStats.totalInstances || 0,
      maxInstancesUsed: this.getMaxInstancesUsed(serviceName),
      scalingEvents: scalingStats.scaleUpActions + scalingStats.scaleDownActions,
      avgUptime: this.calculateAverageUptime(healthStatus),
      resourceUtilization: this.calculateResourceUtilization(serviceName),
      growthTrend: this.calculateGrowthTrend(serviceName),
      predictionConfidence: this.calculatePredictionConfidence(serviceName),
      recommendations: []
    };

    // 评估当前容量状态
    analysis.capacityStatus = this.evaluateCapacityStatus(analysis);

    return analysis;
  }

  /**
   * 生成容量建议
   */
  generateCapacityRecommendations(serviceName, analysis) {
    const recommendations = [];

    // 基于实例使用率的建议
    const utilizationRate = analysis.currentInstances / 20; // 假设最大20个实例
    if (utilizationRate > 0.8) {
      recommendations.push({
        service: serviceName,
        type: 'scale_up',
        priority: 'high',
        title: '建议扩容服务实例',
        description: `当前实例利用率较高(${(utilizationRate * 100).toFixed(1)}%)，建议扩容至${Math.ceil(analysis.currentInstances * 1.5)}个实例`,
        reason: 'high_utilization',
        estimatedCost: this.estimateScalingCost(serviceName, analysis.currentInstances, Math.ceil(analysis.currentInstances * 1.5))
      });
    } else if (utilizationRate < 0.3) {
      recommendations.push({
        service: serviceName,
        type: 'scale_down',
        priority: 'medium',
        title: '建议缩容服务实例',
        description: `当前实例利用率较低(${(utilizationRate * 100).toFixed(1)}%)，建议缩容至${Math.max(2, Math.floor(analysis.currentInstances * 0.7))}个实例`,
        reason: 'low_utilization',
        estimatedSavings: this.estimateScalingSavings(serviceName, analysis.currentInstances, Math.max(2, Math.floor(analysis.currentInstances * 0.7)))
      });
    }

    // 基于增长趋势的建议
    if (analysis.growthTrend > 1.1) {
      recommendations.push({
        service: serviceName,
        type: 'capacity_planning',
        priority: 'high',
        title: '建议增加容量预留',
        description: `检测到服务负载呈增长趋势(${(analysis.growthTrend * 100).toFixed(1)}%)，建议提前规划容量`,
        reason: 'growth_trend',
        timeframe: '7天',
        recommendedCapacity: Math.ceil(analysis.currentInstances * analysis.growthTrend * this.capacityPlanning.growthFactor)
      });
    }

    // 基于可用性的建议
    if (analysis.avgUptime < 0.95) {
      recommendations.push({
        service: serviceName,
        type: 'reliability',
        priority: 'critical',
        title: '服务可用性不足',
        description: `服务可用性为${(analysis.avgUptime * 100).toFixed(2)}%，低于目标95%`,
        reason: 'low_uptime',
        suggestions: [
          '增加冗余实例',
          '实施更好的监控',
          '优化故障恢复机制'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 估算扩容成本
   */
  estimateScalingCost(serviceName, currentInstances, targetInstances) {
    const baseCost = 10; // 每个实例的基础成本
    return (targetInstances - currentInstances) * baseCost;
  }

  /**
   * 估算缩容节省
   */
  estimateScalingSavings(serviceName, currentInstances, targetInstances) {
    const baseCost = 10; // 每个实例的基础成本
    return (currentInstances - targetInstances) * baseCost;
  }

  /**
   * 获取最大实例使用数
   */
  getMaxInstancesUsed(serviceName) {
    // 从扩容历史中获取最大实例数
    const history = this.predictiveScaling.scalingHistory.get(serviceName) || [];
    return history.reduce((max, decision) => {
      if (decision.action === 'scale_up') {
        return Math.max(max, decision.proposedInstances);
      }
      return max;
    }, 0);
  }

  /**
   * 计算平均可用性
   */
  calculateAverageUptime(healthStatus) {
    if (!healthStatus) return 1.0;

    return healthStatus.successfulChecks / Math.max(healthStatus.totalChecks, 1);
  }

  /**
   * 计算资源利用率
   */
  calculateResourceUtilization(serviceName) {
    // 简化实现，实际应从监控系统获取
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      network: Math.random() * 100
    };
  }

  /**
   * 计算增长趋势
   */
  calculateGrowthTrend(serviceName) {
    // 简化实现，实际应基于历史数据分析
    return 1.0 + Math.random() * 0.5; // 1.0-1.5之间
  }

  /**
   * 计算预测置信度
   */
  calculatePredictionConfidence(serviceName) {
    const predictions = this.predictiveScaling.predictions.get(serviceName);
    return predictions ? predictions.confidence : 0.5;
  }

  /**
   * 评估容量状态
   */
  evaluateCapacityStatus(analysis) {
    const utilizationRate = analysis.currentInstances / 20;

    if (utilizationRate > 0.8) {
      return 'overloaded';
    } else if (utilizationRate < 0.3) {
      return 'underutilized';
    } else {
      return 'optimal';
    }
  }

  /**
   * 获取监控数据
   */
  async getMonitoringData() {
    // 简化实现，实际应从监控系统获取
    return {
      'user-service': {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        responseTime: 100 + Math.random() * 400,
        requestRate: 50 + Math.random() * 150
      },
      'resident-service': {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        responseTime: 200 + Math.random() * 300,
        requestRate: 30 + Math.random() * 70
      },
      'governance-service': {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        responseTime: 300 + Math.random() * 200,
        requestRate: 20 + Math.random() * 30
      },
      'finance-service': {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        responseTime: 50 + Math.random() * 100,
        requestRate: 10 + Math.random() * 20
      }
    };
  }

  /**
   * 生成AIOps报告
   */
  async generateAIOpsReport() {
    try {
      logger.info('生成AIOps运维报告');

      const report = {
        timestamp: Date.now(),
        duration: Date.now() - this.startTime,
        services: this.config.services,
        components: {
          anomalyDetection: this.anomalyDetection.getModelStats(),
          predictiveScaling: this.predictiveScaling.getScalingStats(),
          autoHealing: this.autoHealing.getHealingStats(),
          capacityPlanning: this.capacityPlanning.enabled ?
            await this.analyzeCapacityRequirements() : null
        },
        summary: {
          totalServices: Object.keys(this.config.services).length,
          activeIncidents: this.getActiveIncidentsCount(),
          recentAnomalies: this.getRecentAnomaliesCount(),
          healingSuccessRate: this.calculateHealingSuccessRate(),
          avgPredictionConfidence: this.calculateAvgPredictionConfidence(),
          totalRecommendations: this.getTotalRecommendationsCount()
        },
        recommendations: this.generateOverallRecommendations()
      };

      // 发出报告事件
      this.emit('aiops_report_generated', report);

      logger.info('AIOps报告生成完成', {
        duration: report.duration,
        services: report.summary.totalServices,
        activeIncidents: report.summary.activeIncidents
      });

      return report;

    } catch (error) {
      logger.error('生成AIOps报告失败:', error);
    }
  }

  /**
   * 生成整体建议
   */
  generateOverallRecommendations() {
    const recommendations = [];

    // 整体系统建议
    const healingStats = this.autoHealing.getHealingStats();
    const healingSuccessRate = healingStats.totalHealingAttempts > 0 ?
      (healingStats.successfulHealing / healingStats.totalHealingAttempts) * 100 : 0;

    if (healingSuccessRate < 80) {
      recommendations.push({
        type: 'system',
        priority: 'high',
        title: '自动恢复成功率较低',
        description: `当前自动恢复成功率为${healingSuccessRate.toFixed(1)}%，建议优化恢复策略`,
        suggestions: [
          '调整故障阈值参数',
          '增加恢复策略种类',
          '优化恢复冷却期',
          '增强故障诊断能力'
        ]
      });
    }

    // 容量规划建议
    if (this.capacityPlanning.enabled) {
      recommendations.push({
        type: 'system',
        priority: 'medium',
        title: '启用容量规划优化',
        description: '基于历史数据和趋势分析，优化资源配置',
        suggestions: [
          '定期执行容量分析',
          '建立资源使用基线',
          '实施自动扩容策略',
          '设置容量预警机制'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 工具方法
   */
  getActiveIncidentsCount() {
    let count = 0;
    for (const incident of this.autoHealing.incidents.values()) {
      if (incident.status === 'open') count++;
    }
    return count;
  }

  getRecentAnomaliesCount() {
    let count = 0;
    const oneHourAgo = Date.now() - 3600000;

    for (const model of this.anomalyDetection.models.values()) {
      count += model.anomalyHistory.filter(a => a.timestamp > oneHourAgo).length;
    }

    return count;
  }

  calculateHealingSuccessRate() {
    const stats = this.autoHealing.getHealingStats();
    return stats.totalHealingAttempts > 0 ?
      (stats.successfulHealing / stats.totalHealingAttempts) * 100 : 0;
  }

  calculateAvgPredictionConfidence() {
    const predictions = Array.from(this.predictiveScaling.predictions.values());
    if (predictions.length === 0) return 0;

    const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0);
    return totalConfidence / predictions.length;
  }

  getTotalRecommendationsCount() {
    let count = 0;
    for (const predictions of this.predictiveScaling.predictions.values()) {
      if (predictions && predictions.components) {
        count += predictions.components.length;
      }
    }
    return count;
  }

  /**
   * 获取AIOps状态概览
   */
  async getAIOpsOverview() {
    try {
      const [
        anomalyStats,
        scalingStats,
        healingStats,
        healthStatus
      ] = await Promise.all([
        Promise.resolve(this.anomalyDetection.getModelStats()),
        Promise.resolve(this.predictiveScaling.getScalingStats()),
        Promise.resolve(this.autoHealing.getHealingStats()),
        Promise.resolve(this.getOverallHealthStatus())
      ]);

      return {
        health: healthStatus,
        anomalyDetection: anomalyStats,
        predictiveScaling: scalingStats,
        autoHealing: healingStats,
        integration: {
          monitoring: this.config.integration.monitoring.enabled,
          kubernetes: this.config.integration.kubernetes.enabled,
          docker: this.config.integration.docker.enabled,
          cloudProvider: this.config.integration.cloudProvider.enabled
        },
        capacityPlanning: {
          enabled: this.capacityPlanning.enabled,
          lastAnalysis: this.getLastCapacityAnalysis(),
          recommendations: this.getTotalRecommendationsCount()
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('获取AIOps状态失败:', error);
      return {
        health: { status: 'error', error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取整体健康状态
   */
  getOverallHealthStatus() {
    const components = {
      anomalyDetection: this.anomalyDetection.isRunning,
      predictiveScaling: this.predictiveScaling.isRunning,
      autoHealing: this.autoHealing.isRunning
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    return {
      status: healthyCount === totalCount ? 'healthy' : 'warning',
      components,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  getLastCapacityAnalysis() {
    // 简化实现
    return Date.now() - 3600000; // 1小时前
  }

  /**
   * 创建中间件
   */
  createMiddleware() {
    const aiops = this;

    return {
      // 综合AIOps中间件
      all: (req, res, next) => {
        // 记录请求指标
        aiops.recordRequestMetrics(req);

        // 监控响应时间
        const startTime = Date.now();

        res.on('finish', () => {
          const duration = Date.now() - startTime;
          aiops.recordResponseMetrics(req, duration);
        });

        // 异常检测
        this.anomalyDetection.detectAnomaly('response_time', duration);
        this.anomalyDetection.detectAnomaly('request_rate', 1);

        next();
      },

      // 异常检测中间件
      anomaly: (req, res, next) => {
        // 检测请求异常
        this.anomalyDetection.detectAnomaly('request_count', 1);
        next();
      },

      // 性能监控中间件
      performance: (req, res, next) => {
        const startTime = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          this.anomalyDetection.detectAnomaly('response_time', duration);
        });
        next();
      },

      // 自动恢复中间件
      healing: (req, res, next) => {
        // 监控服务状态，必要时触发自动恢复
        this.checkServiceHealth(req.path.split('/')[1]).then(healthy => {
          if (!healthy) {
            this.autoHealing.performHealthCheck(req.path.split('/')[1]);
          }
        }).catch(() => {
          // 忽略错误
        });

        next();
      }
    };
  }

  /**
   * 检查服务健康
   */
  async checkServiceHealth(serviceName) {
    if (!serviceName) return false;
    return this.autoHealing.getServiceHealth(serviceName)?.status === 'healthy';
  }

  /**
   * 记录请求指标
   */
  recordRequestMetrics(req) {
    // 简化实现
    this.anomalyDetection.detectAnomaly('request_count', 1);
  }

  /**
   * 记录响应指标
   */
  recordResponseMetrics(req, duration) {
    // 记录响应时间
    this.anomalyDetection.detectAnomaly('response_time', duration);

    // 记录请求速率（如果需要）
    const requestRate = 1; // 单个请求
    this.anomalyDetection.detectAnomaly('request_rate', requestRate);

    // 如果有用户信息，记录用户活动
    if (req.user) {
      this.anomalyDetection.recordUserActivity(req.user.id, 'api_request');
    }
  }

  /**
   * 记录业务事件
   */
  recordBusinessEvent(eventName, data, userId = null) {
    // 记录用户活动
    if (userId) {
      this.anomalyDetection.recordUserActivity(userId, eventName);
    }

    // 发出业务事件
    this.emit('business_event', {
      eventName,
      data,
      userId,
      timestamp: Date.now(),
      source: 'aiops-service'
    });
  }

  /**
   * 手动触发故障恢复
   */
  async triggerAutoHealing(serviceName) {
    logger.info(`手动触发自动恢复: ${serviceName}`);
    return this.autoHealing.performHealthCheck(serviceName);
  }

  /**
   * 手动触发容量规划
   */
  async triggerCapacityPlanning() {
    logger.info('手动触发容量规划分析');
    return this.performCapacityPlanning();
  }

  /**
   * 手动触发异常检测
   */
  async triggerAnomalyDetection(metricName, value) {
    logger.info(`手动触发异常检测: ${metricName} = ${value}`);
    return this.anomalyDetection.detectAnomaly(metricName, value);
  }

  /**
   * 手动触发预测扩容
   */
  async triggerPredictiveScaling(serviceName) {
    logger.info(`手动触发预测扩容: ${serviceName}`);
    return this.predictiveScaling.autoScale(serviceName);
  }
}

// 创建单例实例
const aiopsService = new AIOpsService();

// 导出服务实例和类
module.exports = {
  AIOpsService,
  aiopsService
};

// 如果直接运行此文件，启动AIOps服务
if (require.main === module) {
  aiopsService.start().catch(error => {
    logger.error('启动AIOps服务失败:', error);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', async () => {
    logger.info('收到SIGINT信号，正在关闭AIOps服务...');
    await aiopsService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('收到SIGTERM信号，正在关闭AIOps服务...');
    await aiopsService.stop();
    process.exit(0);
  });
}