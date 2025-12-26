/**
 * Smart Village Platform - Cache Monitoring and Alerting System
 * Real-time monitoring, metrics collection, and intelligent alerting
 *
 * Features:
 * - Real-time metrics collection (Prometheus compatible)
 * - Intelligent alerting with multiple channels
 * - Performance anomaly detection
 * - Health checks and automatic recovery
 * - Dashboard integration support
 */

const EventEmitter = require('events');
const promClient = require('prom-client');

/**
 * Alert severity levels
 */
const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EMERGENCY: 'emergency'
};

/**
 * Alert channels
 */
const AlertChannel = {
  CONSOLE: 'console',
  WEBHOOK: 'webhook',
  EMAIL: 'email',
  SMS: 'sms',
  SLACK: 'slack'
};

class CacheMonitoringSystem extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      // Metrics collection
      enablePrometheus: options.enablePrometheus !== false,
      prometheusPort: options.prometheusPort || 9091,
      metricsInterval: options.metricsInterval || 10000, // 10 seconds

      // Alert thresholds
      thresholds: {
        hitRate: options.hitRateThreshold || 0.7,        // 70%
        responseTime: options.responseTimeThreshold || 100, // 100ms
        errorRate: options.errorRateThreshold || 0.05,   // 5%
        memoryUsage: options.memoryUsageThreshold || 0.9,  // 90%
        connectionUsage: options.connectionUsageThreshold || 0.8, // 80%
        ...options.thresholds
      },

      // Alert channels
      alertChannels: options.alertChannels || [AlertChannel.CONSOLE],

      // Webhook configuration
      webhookUrl: options.webhookUrl,

      // Anomaly detection
      enableAnomalyDetection: options.enableAnomalyDetection !== false,
      anomalyWindowSize: options.anomalyWindowSize || 5,
      anomalyThreshold: options.anomalyThreshold || 2, // Standard deviations

      // Health check
      enableHealthCheck: options.enableHealthCheck !== false,
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds

      ...options
    };

    // Initialize Prometheus metrics
    if (this.options.enablePrometheus) {
      this._initPrometheusMetrics();
    }

    // Metrics storage
    this.metricsHistory = [];
    this.alertHistory = [];

    // Current state
    this.currentState = {
      healthy: true,
      lastCheck: null,
      issues: []
    };

    // Anomaly detection data
    this.anomalyData = {
      baseline: null,
      samples: []
    };

    // Start monitoring
    this._startMonitoring();
    if (this.options.enableHealthCheck) {
      this._startHealthCheck();
    }
  }

  /**
   * Initialize Prometheus metrics
   * @private
   */
  _initPrometheusMetrics() {
    const register = new promClient.Registry();

    // Counter for total operations
    this.cacheOperations = new promClient.Counter({
      name: 'sv_cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'level', 'status'],
      registers: [register]
    });

    // Gauge for current metrics
    this.cacheHitRate = new promClient.Gauge({
      name: 'sv_cache_hit_rate',
      help: 'Current cache hit rate',
      labelNames: ['level'],
      registers: [register]
    });

    this.cacheResponseTime = new promClient.Histogram({
      name: 'sv_cache_response_time_ms',
      help: 'Cache operation response time in milliseconds',
      labelNames: ['operation', 'level'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000],
      registers: [register]
    });

    this.cacheSize = new promClient.Gauge({
      name: 'sv_cache_size',
      help: 'Current cache size',
      labelNames: ['level'],
      registers: [register]
    });

    this.cacheMemoryUsage = new promClient.Gauge({
      name: 'sv_cache_memory_usage_bytes',
      help: 'Cache memory usage in bytes',
      labelNames: ['level'],
      registers: [register]
    });

    this.redisConnections = new promClient.Gauge({
      name: 'sv_redis_connections',
      help: 'Number of active Redis connections',
      registers: [register]
    });

    this.redisCommands = new promClient.Counter({
      name: 'sv_redis_commands_total',
      help: 'Total number of Redis commands executed',
      labelNames: ['command', 'status'],
      registers: [register]
    });

    this.prometheusRegister = register;

    // Start metrics server if port is specified
    if (this.options.prometheusPort) {
      this._startMetricsServer();
    }
  }

  /**
   * Start Prometheus metrics server
   * @private
   */
  _startMetricsServer() {
    const express = require('express');
    const app = express();

    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', this.prometheusRegister.contentType);
      res.end(await this.prometheusRegister.metrics());
    });

    app.get('/health', (req, res) => {
      res.json({
        status: this.currentState.healthy ? 'healthy' : 'unhealthy',
        lastCheck: this.currentState.lastCheck,
        issues: this.currentState.issues
      });
    });

    const server = app.listen(this.options.prometheusPort, () => {
      console.log(`[CacheMonitoring] Prometheus metrics server started on port ${this.options.prometheusPort}`);
      console.log(`[CacheMonitoring] Metrics: http://localhost:${this.options.prometheusPort}/metrics`);
      console.log(`[CacheMonitoring] Health: http://localhost:${this.options.prometheusPort}/health`);
    });

    this.metricsServer = server;
  }

  /**
   * Start metrics collection
   * @private
   */
  _startMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      await this._collectMetrics();
    }, this.options.metricsInterval);
  }

  /**
   * Start health check
   * @private
   */
  _startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      await this._performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * Collect metrics from cache manager
   * @private
   */
  async _collectMetrics() {
    try {
      const cacheManager = require('./clusterCacheManager').getClusterCacheManager();

      if (!cacheManager) {
        return;
      }

      const stats = cacheManager.getStats();

      // Record Prometheus metrics
      if (this.options.enablePrometheus) {
        // Hit rate
        const hitRate = parseFloat(stats.hitRate) / 100;
        this.cacheHitRate.set({ level: 'l1' }, stats.hits.l1 / (stats.hits.l1 + stats.misses.l1) || 0);
        this.cacheHitRate.set({ level: 'l2' }, stats.hits.l2 / (stats.hits.l2 + stats.misses.l2) || 0);
        this.cacheHitRate.set({ level: 'overall' }, hitRate);

        // Cache size
        this.cacheSize.set({ level: 'l1' }, stats.l1Keys);

        // Operations
        this.cacheOperations.inc({ operation: 'get', level: 'l1', status: 'hit' }, stats.hits.l1);
        this.cacheOperations.inc({ operation: 'get', level: 'l1', status: 'miss' }, stats.misses.l1);
        this.cacheOperations.inc({ operation: 'set', level: 'l1', status: 'success' }, stats.sets.l1);
        this.cacheOperations.inc({ operation: 'delete', level: 'l1', status: 'success' }, stats.deletes.l1);
      }

      // Store history for anomaly detection
      this.metricsHistory.push({
        timestamp: Date.now(),
        ...stats
      });

      // Keep limited history
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }

      // Check thresholds
      await this._checkThresholds(stats);

      // Detect anomalies
      if (this.options.enableAnomalyDetection) {
        await this._detectAnomalies(stats);
      }

      this.emit('metrics:collected', stats);

    } catch (error) {
      console.error('[CacheMonitoring] Metrics collection error:', error.message);
    }
  }

  /**
   * Check if metrics exceed thresholds
   * @private
   */
  async _checkThresholds(stats) {
    const issues = [];

    // Hit rate check
    const totalRequests = stats.hits.total + stats.misses.total;
    const hitRate = totalRequests > 0 ? stats.hits.total / totalRequests : 0;

    if (hitRate < this.options.thresholds.hitRate) {
      issues.push({
        metric: 'hit_rate',
        severity: AlertSeverity.WARNING,
        message: `Cache hit rate ${(hitRate * 100).toFixed(1)}% is below threshold ${(this.options.thresholds.hitRate * 100)}%`,
        value: hitRate,
        threshold: this.options.thresholds.hitRate
      });
    }

    // Error rate check
    const totalOps = stats.hits.total + stats.misses.total + stats.errors.total;
    const errorRate = totalOps > 0 ? stats.errors.total / totalOps : 0;

    if (errorRate > this.options.thresholds.errorRate) {
      issues.push({
        metric: 'error_rate',
        severity: AlertSeverity.CRITICAL,
        message: `Cache error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${(this.options.thresholds.errorRate * 100)}%`,
        value: errorRate,
        threshold: this.options.thresholds.errorRate
      });
    }

    // Circuit breaker check
    if (stats.circuitBreakerOpen) {
      issues.push({
        metric: 'circuit_breaker',
        severity: AlertSeverity.EMERGENCY,
        message: 'Circuit breaker is open - Redis cluster may be unavailable',
        value: true,
        threshold: false
      });
    }

    // L2 readiness check
    if (!stats.l2Ready) {
      issues.push({
        metric: 'l2_ready',
        severity: AlertSeverity.CRITICAL,
        message: 'L2 cache (Redis) is not ready',
        value: false,
        threshold: true
      });
    }

    // Send alerts for issues
    for (const issue of issues) {
      await this._sendAlert(issue);
    }

    this.currentState.issues = issues;
  }

  /**
   * Detect performance anomalies using statistical analysis
   * @private
   */
  async _detectAnomalies(stats) {
    if (this.metricsHistory.length < this.options.anomalyWindowSize) {
      return;
    }

    const recentMetrics = this.metricsHistory.slice(-this.options.anomalyWindowSize);

    // Calculate baseline and standard deviation
    const hitRates = recentMetrics.map(m => {
      const total = m.hits.total + m.misses.total;
      return total > 0 ? m.hits.total / total : 0;
    });

    const mean = hitRates.reduce((a, b) => a + b, 0) / hitRates.length;
    const variance = hitRates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / hitRates.length;
    const stdDev = Math.sqrt(variance);

    // Current hit rate
    const currentHitRate = hitRates[hitRates.length - 1];

    // Check if current value deviates significantly
    const zScore = stdDev > 0 ? Math.abs((currentHitRate - mean) / stdDev) : 0;

    if (zScore > this.options.anomalyThreshold) {
      await this._sendAlert({
        metric: 'hit_rate_anomaly',
        severity: AlertSeverity.WARNING,
        message: `Cache hit rate anomaly detected: ${currentHitRate.toFixed(3)} (z-score: ${zScore.toFixed(2)})`,
        value: currentHitRate,
        baseline: mean,
        zScore: zScore
      });
    }
  }

  /**
   * Perform health check
   * @private
   */
  async _performHealthCheck() {
    try {
      const cacheManager = require('./clusterCacheManager').getClusterCacheManager();

      if (!cacheManager) {
        this.currentState.healthy = false;
        return;
      }

      // Ping Redis cluster
      await cacheManager.ping();

      // Check cluster info
      const clusterInfo = await cacheManager.getClusterInfo();

      // Parse cluster state
      const clusterState = this._parseClusterInfo(clusterInfo.info);

      this.currentState.healthy = clusterState.ok;
      this.currentState.lastCheck = new Date().toISOString();

      if (!clusterState.ok) {
        await this._sendAlert({
          metric: 'cluster_health',
          severity: AlertSeverity.CRITICAL,
          message: 'Redis cluster health check failed',
          details: clusterState
        });
      }

    } catch (error) {
      this.currentState.healthy = false;
      this.currentState.lastCheck = new Date().toISOString();

      await this._sendAlert({
        metric: 'health_check',
        severity: AlertSeverity.EMERGENCY,
        message: `Health check failed: ${error.message}`,
        error: error.message
      });
    }
  }

  /**
   * Parse cluster info
   * @private
   */
  _parseClusterInfo(info) {
    const lines = info.split('\n');
    const state = {};

    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        state[key.trim()] = value.trim();
      }
    }

    return {
      ok: state.cluster_state === 'ok',
      state: state.cluster_state,
      knownNodes: parseInt(state.cluster_known_nodes) || 0,
      slotsAssigned: parseInt(state.cluster_slots_assigned) || 0,
      slotsOk: parseInt(state.cluster_slots_ok) || 0,
      slotsPfail: parseInt(state.cluster_slots_pfail) || 0,
      slotsFail: parseInt(state.cluster_slots_fail) || 0
    };
  }

  /**
   * Send alert through configured channels
   * @private
   */
  async _sendAlert(alert) {
    const alertWithTimestamp = {
      ...alert,
      timestamp: new Date().toISOString(),
      service: 'smart-village-cache'
    };

    // Store in history
    this.alertHistory.push(alertWithTimestamp);
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift();
    }

    // Emit event
    this.emit('alert', alertWithTimestamp);

    // Send through channels
    for (const channel of this.options.alertChannels) {
      try {
        switch (channel) {
          case AlertChannel.CONSOLE:
            this._consoleAlert(alertWithTimestamp);
            break;
          case AlertChannel.WEBHOOK:
            await this._webhookAlert(alertWithTimestamp);
            break;
          case AlertChannel.SLACK:
            await this._slackAlert(alertWithTimestamp);
            break;
          default:
            console.log(`[CacheMonitoring] Unknown alert channel: ${channel}`);
        }
      } catch (error) {
        console.error(`[CacheMonitoring] Alert send error (${channel}):`, error.message);
      }
    }
  }

  /**
   * Console alert
   * @private
   */
  _consoleAlert(alert) {
    const colors = {
      [AlertSeverity.INFO]: '\x1b[36m',    // Cyan
      [AlertSeverity.WARNING]: '\x1b[33m', // Yellow
      [AlertSeverity.CRITICAL]: '\x1b[31m', // Red
      [AlertSeverity.EMERGENCY]: '\x1b[35m' // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[alert.severity] || reset;

    console.log(`${color}[${alert.severity.toUpperCase()}]${reset} ${alert.message}`);
  }

  /**
   * Webhook alert
   * @private
   */
  async _webhookAlert(alert) {
    if (!this.options.webhookUrl) {
      return;
    }

    const fetch = require('node-fetch');
    await fetch(this.options.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
  }

  /**
   * Slack alert
   * @private
   */
  async _slackAlert(alert) {
    if (!process.env.SLACK_WEBHOOK_URL) {
      return;
    }

    const colors = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.WARNING]: '#ff9900',
      [AlertSeverity.CRITICAL]: '#ff0000',
      [AlertSeverity.EMERGENCY]: '#990000'
    };

    const fetch = require('node-fetch');
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color: colors[alert.severity],
          title: `Cache Alert: ${alert.metric}`,
          text: alert.message,
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Timestamp', value: alert.timestamp, short: true }
          ]
        }]
      })
    });
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      history: this.metricsHistory,
      alerts: this.alertHistory,
      state: this.currentState,
      prometheusUrl: `http://localhost:${this.options.prometheusPort}/metrics`
    };
  }

  /**
   * Get Prometheus metrics
   * @returns {Promise<string>} Prometheus metrics text
   */
  async getPrometheusMetrics() {
    if (this.prometheusRegister) {
      return await this.prometheusRegister.metrics();
    }
    return '';
  }

  /**
   * Shutdown monitoring system
   */
  shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsServer) {
      this.metricsServer.close();
    }
  }
}

// Export singleton instance
let monitoringInstance = null;

function getCacheMonitoring(options) {
  if (!monitoringInstance) {
    monitoringInstance = new CacheMonitoringSystem(options);
  }
  return monitoringInstance;
}

module.exports = {
  CacheMonitoringSystem,
  getCacheMonitoring,
  AlertSeverity,
  AlertChannel
};
