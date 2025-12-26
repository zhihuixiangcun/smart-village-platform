const realtimeEngine = require('../services/realtimeEngine');
const realtimeIntegrator = require('../integrator/realtimeIntegrator');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * 实时计算引擎控制器
 */
class RealtimeComputationController {
  /**
   * 获取实时计算引擎状态
   */
  async getEngineStatus(req, res) {
    try {
      const integratorStatus = realtimeIntegrator.getStatus();
      const engineMetrics = realtimeEngine.getPerformanceMetrics();
      const systemHealth = realtimeIntegrator.getSystemStatus();

      res.json({
        success: true,
        data: {
          integrator: integratorStatus,
          engine: engineMetrics,
          health: systemHealth,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('获取实时计算引擎状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取引擎状态失败',
        error: error.message
      });
    }
  }

  /**
   * 获取实时指标数据
   */
  async getRealtimeMetrics(req, res) {
    try {
      const { metricNames, windows, timeRange } = req.query;

      let metrics = {};

      if (metricNames) {
        const names = Array.isArray(metricNames) ? metricNames : metricNames.split(',');
        for (const name of names) {
          metrics[name] = realtimeEngine.getMetric(name);
        }
      } else {
        // 获取所有指标
        metrics = realtimeEngine.getAllMetrics();
      }

      // 过滤时间窗口
      if (windows) {
        const windowList = Array.isArray(windows) ? windows : windows.split(',');
        const filteredMetrics = {};

        for (const [metricName, metricData] of Object.entries(metrics)) {
          filteredMetrics[metricName] = {};
          for (const window of windowList) {
            if (metricData.data && metricData.data[window]) {
              filteredMetrics[metricName][window] = metricData.data[window];
            }
          }
        }
        metrics = filteredMetrics;
      }

      res.json({
        success: true,
        data: {
          metrics,
          query: { metricNames, windows, timeRange },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('获取实时指标失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取实时指标失败',
        error: error.message
      });
    }
  }

  /**
   * 添加实时数据流
   */
  async addStreamData(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { dataType, data } = req.body;

      // 添加数据到实时引擎
      await realtimeEngine.addStreamData(dataType, data);

      // 同时发送到集成器
      realtimeIntegrator.processData(dataType, data);

      res.json({
        success: true,
        message: '数据流添加成功',
        data: {
          dataType,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('添加数据流失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '添加数据流失败',
        error: error.message
      });
    }
  }

  /**
   * 批量添加数据流
   */
  async addBatchStreamData(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { dataStreams } = req.body; // [{dataType, data}, ...]

      const results = [];

      for (const stream of dataStreams) {
        try {
          await realtimeEngine.addStreamData(stream.dataType, stream.data);
          realtimeIntegrator.processData(stream.dataType, stream.data);
          results.push({
            dataType: stream.dataType,
            success: true
          });
        } catch (error) {
          results.push({
            dataType: stream.dataType,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        message: `批量数据流处理完成，成功 ${successCount}/${dataStreams.length} 条`,
        data: {
          results,
          summary: {
            total: dataStreams.length,
            success: successCount,
            failed: dataStreams.length - successCount
          }
        }
      });

    } catch (error) {
      logger.error('批量添加数据流失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量添加数据流失败',
        error: error.message
      });
    }
  }

  /**
   * 注册新的指标
   */
  async registerMetric(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { name, config } = req.body;

      realtimeEngine.registerMetric(name, config);

      res.json({
        success: true,
        message: '指标注册成功',
        data: {
          name,
          config
        }
      });

    } catch (error) {
      logger.error('注册指标失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '注册指标失败',
        error: error.message
      });
    }
  }

  /**
   * 设置阈值规则
   */
  async setThreshold(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { metricName, thresholdConfig } = req.body;

      realtimeEngine.setThreshold(metricName, thresholdConfig);

      res.json({
        success: true,
        message: '阈值规则设置成功',
        data: {
          metricName,
          thresholdConfig
        }
      });

    } catch (error) {
      logger.error('设置阈值失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '设置阈值失败',
        error: error.message
      });
    }
  }

  /**
   * 获取告警信息
   */
  async getAlerts(req, res) {
    try {
      const { level, status, limit = 50 } = req.query;

      // 从集成器获取告警信息
      const systemAlerts = realtimeIntegrator.getAlerts();

      // 从引擎获取告警信息
      const engineAlerts = realtimeEngine.getActiveAlerts();

      // 合并和过滤告警
      let allAlerts = [...systemAlerts, ...engineAlerts];

      // 按级别过滤
      if (level) {
        allAlerts = allAlerts.filter(alert => alert.severity === level);
      }

      // 按状态过滤
      if (status) {
        allAlerts = allAlerts.filter(alert => alert.status === status);
      }

      // 限制数量
      if (limit) {
        allAlerts = allAlerts.slice(0, parseInt(limit));
      }

      res.json({
        success: true,
        data: {
          alerts: allAlerts,
          total: allAlerts.length,
          filters: { level, status, limit },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('获取告警信息失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取告警信息失败',
        error: error.message
      });
    }
  }

  /**
   * 手动触发性能优化
   */
  async triggerOptimization(req, res) {
    try {
      const result = await realtimeEngine.triggerOptimization();

      res.json({
        success: true,
        message: '性能优化触发成功',
        data: result
      });

    } catch (error) {
      logger.error('触发性能优化失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '触发性能优化失败',
        error: error.message
      });
    }
  }

  /**
   * 更新引擎配置
   */
  async updateEngineConfig(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { config } = req.body;

      // 验证配置
      const validConfig = this.validateEngineConfig(config);

      // 应用新配置
      realtimeEngine.updateConfig(validConfig);

      res.json({
        success: true,
        message: '引擎配置更新成功',
        data: {
          config: validConfig,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('更新引擎配置失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新引擎配置失败',
        error: error.message
      });
    }
  }

  /**
   * 重启实时计算引擎
   */
  async restartEngine(req, res) {
    try {
      const { graceful = true } = req.body;

      res.json({
        success: true,
        message: '实时计算引擎重启中...',
        data: {
          graceful,
          timestamp: new Date().toISOString()
        }
      });

      // 异步重启引擎
      setImmediate(async () => {
        try {
          if (graceful) {
            await realtimeIntegrator.gracefulShutdown();
            await realtimeIntegrator.initialize();
            await realtimeIntegrator.start();
          } else {
            await realtimeIntegrator.forceRestart();
          }
          logger.debug('✅ 实时计算引擎重启完成');
        } catch (error) {
          logger.error('❌ 实时计算引擎重启失败:', error);
        }
      });

    } catch (error) {
      logger.error('重启引擎失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '重启引擎失败',
        error: error.message
      });
    }
  }

  /**
   * 验证引擎配置
   */
  validateEngineConfig(config) {
    const validConfig = {
      batchSize: Math.max(50, Math.min(2000, parseInt(config.batchSize) || 500)),
      flushInterval: Math.max(100, Math.min(10000, parseInt(config.flushInterval) || 500)),
      maxHistoryPoints: Math.max(100, Math.min(10000, parseInt(config.maxHistoryPoints) || 2000)),
      maxQueueSize: Math.max(1000, Math.min(50000, parseInt(config.maxQueueSize) || 10000)),
      adaptiveBatchSize: Boolean(config.adaptiveBatchSize),
      compressionEnabled: Boolean(config.compressionEnabled),
      parallelProcessing: Math.max(1, Math.min(8, parseInt(config.parallelProcessing) || 4))
    };

    return validConfig;
  }
}

module.exports = new RealtimeComputationController();