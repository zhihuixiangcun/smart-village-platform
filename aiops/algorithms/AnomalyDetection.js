/**
 * 异常检测算法
 * 实现多种异常检测算法，包括统计方法、机器学习和深度学习方法
 */

const EventEmitter = require('events');
const logger = require('./../../monitoring/services/../../src/services/performanceMonitor').logger;

class AnomalyDetection extends EventEmitter {
  constructor() {
    super();
    this.models = new Map();
    this.thresholds = new Map();
    this.historicalData = new Map();
    this.isRunning = false;

    // 算法配置
    this.config = {
      // 统计方法配置
      statistical: {
        zScoreThreshold: 3.0,
        iqrMultiplier: 1.5,
        movingAverageWindow: 20,
        standardDeviationWindow: 30
      },

      // 机器学习方法配置
      machineLearning: {
        isolationTrees: {
          nEstimators: 100,
          maxSamples: 256,
          contamination: 0.1
        },
        oneClassSVM: {
          kernel: 'rbf',
          gamma: 'scale',
          nu: 0.1
        },
        localOutlierFactor: {
          nNeighbors: 20,
          contamination: 0.1
        }
      },

      // 时间序列配置
      timeSeries: {
        arima: {
          p: 1,
          d: 1,
          q: 1,
          seasonalPeriod: 24
        },
        prophet: {
          yearlySeasonality: true,
          weeklySeasonality: true,
          dailySeasonality: false,
          changepointPriorScale: 0.05
        }
      },

      // 检测窗口配置
      windows: {
        realtime: 300,      // 5分钟实时窗口
        shortTerm: 3600,    // 1小时短期窗口
        mediumTerm: 86400,  // 24小时中期窗口
        longTerm: 604800    // 7天长期窗口
      }
    };

    // 指标类型配置
    this.metricTypes = {
      // 性能指标
      performance: ['responseTime', 'cpuUsage', 'memoryUsage', 'diskUsage', 'networkIO'],

      // 业务指标
      business: ['activeUsers', 'transactionRate', 'errorRate', 'throughput', 'conversionRate'],

      // 系统指标
      system: ['connectionCount', 'queueLength', 'cacheHitRate', 'databaseLatency', 'apiLatency'],

      // 安全指标
      security: ['failedLogins', 'suspiciousActivity', 'unusualAccessPatterns', 'dataAccessAnomalies']
    };
  }

  /**
   * 启动异常检测服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('异常检测服务已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('启动智能异常检测服务');

    // 初始化检测模型
    await this.initializeModels();

    // 启动定期检测
    this.startPeriodicDetection();

    logger.info('异常检测服务启动成功');
  }

  /**
   * 停止异常检测服务
   */
  async stop() {
    this.isRunning = false;
    logger.info('异常检测服务已停止');
  }

  /**
   * 初始化检测模型
   */
  async initializeModels() {
    try {
      // 为每个指标类型初始化模型
      for (const [category, metrics] of Object.entries(this.metricTypes)) {
        for (const metric of metrics) {
          await this.initializeMetricModel(metric, category);
        }
      }

      logger.info('异常检测模型初始化完成');
    } catch (error) {
      logger.error('初始化异常检测模型失败:', error);
    }
  }

  /**
   * 初始化单个指标的检测模型
   */
  async initializeMetricModel(metricName, category) {
    const modelId = `${category}:${metricName}`;

    const model = {
      id: modelId,
      name: metricName,
      category: category,
      type: 'ensemble', // 集成多种算法
      algorithms: {
        statistical: {
          zScore: {
            enabled: true,
            threshold: this.config.statistical.zScoreThreshold,
            lastMean: 0,
            lastStdDev: 0
          },
          iqr: {
            enabled: true,
            multiplier: this.config.statistical.iqrMultiplier,
            q1: 0,
            q3: 0,
            iqr: 0
          },
          movingAverage: {
            enabled: true,
            window: this.config.statistical.movingAverageWindow,
            values: []
          }
        },
        machineLearning: {
          isolationForest: {
            enabled: false, // 需要足够数据后启用
            model: null,
            trained: false
          },
          oneClassSVM: {
            enabled: false,
            model: null,
            trained: false
          },
          localOutlierFactor: {
            enabled: false,
            model: null,
            trained: false
          }
        }
      },
      dataHistory: [],
      anomalyHistory: [],
      lastDetection: null,
      isTraining: false,
      trainingDataRequired: 100 // 需要100个数据点开始训练
    };

    this.models.set(modelId, model);
    logger.debug(`初始化指标模型: ${modelId}`);
  }

  /**
   * 检测异常
   */
  async detectAnomaly(metricName, value, timestamp = Date.now()) {
    const category = this.getMetricCategory(metricName);
    if (!category) {
      logger.warn(`未知指标类型: ${metricName}`);
      return null;
    }

    const modelId = `${category}:${metricName}`;
    const model = this.models.get(modelId);

    if (!model) {
      logger.warn(`指标模型不存在: ${modelId}`);
      return null;
    }

    // 添加数据到历史记录
    this.addDataPoint(model, value, timestamp);

    // 执行异常检测
    const anomalyResult = await this.performAnomalyDetection(model, value, timestamp);

    // 更新模型状态
    if (anomalyResult.isAnomaly) {
      model.anomalyHistory.push({
        timestamp,
        value,
        score: anomalyResult.score,
        algorithms: anomalyResult.algorithms,
        severity: anomalyResult.severity
      });

      // 保持异常历史记录在合理范围内
      if (model.anomalyHistory.length > 1000) {
        model.anomalyHistory = model.anomalyHistory.slice(-500);
      }

      // 发出异常事件
      this.emit('anomaly_detected', {
        metric: metricName,
        category,
        value,
        timestamp,
        score: anomalyResult.score,
        severity: anomalyResult.severity,
        algorithms: anomalyResult.algorithms,
        context: this.getAnomalyContext(model, value)
      });

      logger.warn(`检测到异常: ${metricName} = ${value}`, {
        score: anomalyResult.score,
        severity: anomalyResult.severity
      });
    }

    // 检查是否需要训练机器学习模型
    await this.checkAndTrainModel(model);

    return anomalyResult;
  }

  /**
   * 执行异常检测
   */
  async performAnomalyDetection(model, value, timestamp) {
    const results = {
      statistical: null,
      machineLearning: null,
      ensemble: null
    };

    // 统计方法检测
    results.statistical = await this.detectStatisticalAnomaly(model, value);

    // 机器学习方法检测（如果模型已训练）
    if (this.hasTrainedMLModel(model)) {
      results.machineLearning = await this.detectMLAnomaly(model, value);
    }

    // 集成检测结果
    results.ensemble = this.ensembleDetection(results.statistical, results.machineLearning);

    return {
      isAnomaly: results.ensemble.isAnomaly,
      score: results.ensemble.score,
      confidence: results.ensemble.confidence,
      severity: this.calculateSeverity(results.ensemble),
      algorithms: {
        statistical: results.statistical,
        machineLearning: results.machineLearning,
        ensemble: results.ensemble
      }
    };
  }

  /**
   * 统计方法异常检测
   */
  async detectStatisticalAnomaly(model, value) {
    const algorithms = model.algorithms.statistical;
    const results = {};

    // Z-Score 检测
    if (algorithms.zScore.enabled) {
      results.zScore = this.zScoreDetection(algorithms.zScore, value, model.dataHistory);
    }

    // IQR 检测
    if (algorithms.iqr.enabled) {
      results.iqr = this.iqrDetection(algorithms.iqr, value, model.dataHistory);
    }

    // 移动平均检测
    if (algorithms.movingAverage.enabled) {
      results.movingAverage = this.movingAverageDetection(algorithms.movingAverage, value);
    }

    // 综合统计检测结果
    return this.combineStatisticalResults(results);
  }

  /**
   * Z-Score 异常检测
   */
  zScoreDetection(config, value, dataHistory) {
    if (dataHistory.length < this.config.statistical.standardDeviationWindow) {
      return { isAnomaly: false, score: 0, method: 'z-score' };
    }

    const recentData = dataHistory.slice(-this.config.statistical.standardDeviationWindow);
    const values = recentData.map(d => d.value);

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 更新模型参数
    config.lastMean = mean;
    config.lastStdDev = stdDev;

    if (stdDev === 0) {
      return { isAnomaly: false, score: 0, method: 'z-score' };
    }

    const zScore = Math.abs((value - mean) / stdDev);
    const isAnomaly = zScore > config.threshold;

    return {
      isAnomaly,
      score: zScore,
      threshold: config.threshold,
      mean,
      stdDev,
      method: 'z-score'
    };
  }

  /**
   * IQR (四分位距) 异常检测
   */
  iqrDetection(config, value, dataHistory) {
    if (dataHistory.length < 10) {
      return { isAnomaly: false, score: 0, method: 'iqr' };
    }

    const values = dataHistory.map(d => d.value).sort((a, b) => a - b);
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);

    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;

    // 更新模型参数
    config.q1 = q1;
    config.q3 = q3;
    config.iqr = iqr;

    const lowerBound = q1 - (config.multiplier * iqr);
    const upperBound = q3 + (config.multiplier * iqr);

    const isAnomaly = value < lowerBound || value > upperBound;
    const score = Math.max(
      Math.abs((value - lowerBound) / iqr),
      Math.abs((value - upperBound) / iqr)
    );

    return {
      isAnomaly,
      score,
      threshold: config.multiplier,
      lowerBound,
      upperBound,
      q1,
      q3,
      iqr,
      method: 'iqr'
    };
  }

  /**
   * 移动平均异常检测
   */
  movingAverageDetection(config, value) {
    config.values.push(value);

    // 保持窗口大小
    if (config.values.length > config.window) {
      config.values.shift();
    }

    if (config.values.length < config.window) {
      return { isAnomaly: false, score: 0, method: 'moving-average' };
    }

    const movingAverage = config.values.reduce((sum, v) => sum + v, 0) / config.values.length;
    const deviation = Math.abs(value - movingAverage);
    const avgDeviation = config.values.reduce((sum, v) => sum + Math.abs(v - movingAverage), 0) / config.values.length;

    const score = deviation / avgDeviation;
    const isAnomaly = score > 2.0; // 经验阈值

    return {
      isAnomaly,
      score,
      movingAverage,
      deviation,
      method: 'moving-average'
    };
  }

  /**
   * 机器学习方法异常检测
   */
  async detectMLAnomaly(model, value) {
    const algorithms = model.algorithms.machineLearning;
    const results = {};

    // Isolation Forest 检测
    if (algorithms.isolationForest.enabled && algorithms.isolationForest.trained) {
      results.isolationForest = await this.isolationForestDetection(algorithms.isolationForest, value, model);
    }

    // One-Class SVM 检测
    if (algorithms.oneClassSVM.enabled && algorithms.oneClassSVM.trained) {
      results.oneClassSVM = await this.oneClassSVMDetection(algorithms.oneClassSVM, value, model);
    }

    // Local Outlier Factor 检测
    if (algorithms.localOutlierFactor.enabled && algorithms.localOutlierFactor.trained) {
      results.localOutlierFactor = await this.localOutlierFactorDetection(algorithms.localOutlierFactor, value, model);
    }

    return this.combineMLResults(results);
  }

  /**
   * Isolation Forest 异常检测
   */
  async isolationForestDetection(config, value, model) {
    try {
      // 简化的 Isolation Forest 实现
      // 实际项目中应使用 scikit-learn 或其他 ML 库
      const features = this.extractFeatures(value, model.dataHistory);
      const anomalyScore = this.calculateIsolationScore(features, config.model);

      const isAnomaly = anomalyScore > 0.5; // 阈值可调整

      return {
        isAnomaly,
        score: anomalyScore,
        method: 'isolation-forest'
      };
    } catch (error) {
      logger.error('Isolation Forest 检测失败:', error);
      return { isAnomaly: false, score: 0, method: 'isolation-forest', error: error.message };
    }
  }

  /**
   * One-Class SVM 异常检测
   */
  async oneClassSVMDetection(config, value, model) {
    try {
      // 简化的 One-Class SVM 实现
      const features = this.extractFeatures(value, model.dataHistory);
      const anomalyScore = this.calculateSVMScore(features, config.model);

      const isAnomaly = anomalyScore < 0; // One-Class SVM 负值表示异常

      return {
        isAnomaly,
        score: Math.abs(anomalyScore),
        method: 'one-class-svm'
      };
    } catch (error) {
      logger.error('One-Class SVM 检测失败:', error);
      return { isAnomaly: false, score: 0, method: 'one-class-svm', error: error.message };
    }
  }

  /**
   * Local Outlier Factor 异常检测
   */
  async localOutlierFactorDetection(config, value, model) {
    try {
      // 简化的 LOF 实现
      const features = this.extractFeatures(value, model.dataHistory);
      const lofScore = this.calculateLOFScore(features, model.dataHistory, config.nNeighbors);

      const isAnomaly = lofScore > 1.5; // LOF > 1.5 通常表示异常

      return {
        isAnomaly,
        score: lofScore,
        method: 'local-outlier-factor'
      };
    } catch (error) {
      logger.error('LOF 检测失败:', error);
      return { isAnomaly: false, score: 0, method: 'local-outlier-factor', error: error.message };
    }
  }

  /**
   * 集成检测结果
   */
  ensembleDetection(statisticalResult, mlResult) {
    const results = [];

    if (statisticalResult && statisticalResult.isAnomaly) {
      results.push({
        type: 'statistical',
        score: statisticalResult.score,
        confidence: 0.7
      });
    }

    if (mlResult && mlResult.isAnomaly) {
      results.push({
        type: 'machine-learning',
        score: mlResult.score,
        confidence: 0.9
      });
    }

    if (results.length === 0) {
      return {
        isAnomaly: false,
        score: 0,
        confidence: 1.0,
        method: 'ensemble'
      };
    }

    // 加权平均
    const weightedScore = results.reduce((sum, r) => sum + r.score * r.confidence, 0) /
                        results.reduce((sum, r) => sum + r.confidence, 0);

    const confidence = Math.max(...results.map(r => r.confidence));

    return {
      isAnomaly: weightedScore > 0.5,
      score: weightedScore,
      confidence,
      method: 'ensemble',
      components: results
    };
  }

  /**
   * 训练机器学习模型
   */
  async trainMLModel(modelId) {
    const model = this.models.get(modelId);
    if (!model || model.dataHistory.length < model.trainingDataRequired) {
      return false;
    }

    if (model.isTraining) {
      return false;
    }

    model.isTraining = true;

    try {
      logger.info(`开始训练模型: ${modelId}`);

      // 准备训练数据
      const trainingData = this.prepareTrainingData(model.dataHistory);

      // 训练 Isolation Forest
      await this.trainIsolationForest(model.algorithms.machineLearning.isolationForest, trainingData);

      // 训练 One-Class SVM
      await this.trainOneClassSVM(model.algorithms.machineLearning.oneClassSVM, trainingData);

      // 训练 Local Outlier Factor
      await this.trainLocalOutlierFactor(model.algorithms.machineLearning.localOutlierFactor, trainingData);

      // 标记模型为已训练
      Object.values(model.algorithms.machineLearning).forEach(algo => {
        if (algo.enabled) {
          algo.trained = true;
        }
      });

      logger.info(`模型训练完成: ${modelId}`);
      return true;

    } catch (error) {
      logger.error(`模型训练失败 ${modelId}:`, error);
      return false;
    } finally {
      model.isTraining = false;
    }
  }

  /**
   * 检查并训练模型
   */
  async checkAndTrainModel(model) {
    // 检查是否需要训练
    if (!this.hasTrainedMLModel(model) &&
        model.dataHistory.length >= model.trainingDataRequired &&
        !model.isTraining) {

      // 异步训练模型
      this.trainMLModel(model.id).catch(error => {
        logger.error(`异步模型训练失败 ${model.id}:`, error);
      });
    }
  }

  /**
   * 获取指标类别
   */
  getMetricCategory(metricName) {
    for (const [category, metrics] of Object.entries(this.metricTypes)) {
      if (metrics.includes(metricName)) {
        return category;
      }
    }
    return null;
  }

  /**
   * 添加数据点
   */
  addDataPoint(model, value, timestamp) {
    model.dataHistory.push({
      value,
      timestamp,
      features: this.extractFeatures(value, model.dataHistory)
    });

    // 保持历史数据在合理范围内
    if (model.dataHistory.length > 10000) {
      model.dataHistory = model.dataHistory.slice(-5000);
    }

    // 更新最后检测时间
    model.lastDetection = timestamp;
  }

  /**
   * 提取特征
   */
  extractFeatures(value, history) {
    if (history.length === 0) {
      return [value];
    }

    const recentValues = history.slice(-10).map(d => d.value);
    const mean = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentValues.length;
    const trend = this.calculateTrend(recentValues);

    return [
      value,
      mean,
      variance,
      trend,
      value - mean, // 偏差
      value / mean,  // 相对值
    ];
  }

  /**
   * 计算趋势
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = values.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * 获取异常上下文
   */
  getAnomalyContext(model, currentValue) {
    const recentAnomalies = model.anomalyHistory.slice(-5);
    const dataPoints = model.dataHistory.slice(-100);

    return {
      recentAnomalies: recentAnomalies.length,
      anomalyRate: recentAnomalies.length / Math.max(dataPoints.length / 10, 1),
      dataPoints: dataPoints.length,
      lastAnomaly: recentAnomalies.length > 0 ? recentAnomalies[recentAnomalies.length - 1].timestamp : null,
      currentValue,
      historicalMean: dataPoints.length > 0 ? dataPoints.reduce((sum, d) => sum + d.value, 0) / dataPoints.length : currentValue,
      trend: this.calculateTrend(dataPoints.slice(-20).map(d => d.value))
    };
  }

  /**
   * 计算异常严重程度
   */
  calculateSeverity(result) {
    const score = result.score;
    const confidence = result.confidence;

    if (score > 3.0 && confidence > 0.8) {
      return 'critical';
    } else if (score > 2.0 && confidence > 0.6) {
      return 'high';
    } else if (score > 1.0 && confidence > 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 启动定期检测
   */
  startPeriodicDetection() {
    // 每分钟检查一次模型训练状态
    setInterval(() => {
      if (!this.isRunning) return;

      for (const model of this.models.values()) {
        this.checkAndTrainModel(model);
      }
    }, 60000);
  }

  /**
   * 获取模型统计信息
   */
  getModelStats() {
    const stats = {
      totalModels: this.models.size,
      trainedModels: 0,
      totalDataPoints: 0,
      totalAnomalies: 0,
      categoryStats: {}
    };

    for (const [category] of Object.entries(this.metricTypes)) {
      stats.categoryStats[category] = {
        models: 0,
        trainedModels: 0,
        dataPoints: 0,
        anomalies: 0
      };
    }

    for (const model of this.models.values()) {
      stats.totalDataPoints += model.dataHistory.length;
      stats.totalAnomalies += model.anomalyHistory.length;

      if (this.hasTrainedMLModel(model)) {
        stats.trainedModels++;
      }

      if (stats.categoryStats[model.category]) {
        stats.categoryStats[model.category].models++;
        stats.categoryStats[model.category].dataPoints += model.dataHistory.length;
        stats.categoryStats[model.category].anomalies += model.anomalyHistory.length;

        if (this.hasTrainedMLModel(model)) {
          stats.categoryStats[model.category].trainedModels++;
        }
      }
    }

    return stats;
  }

  /**
   * 检查是否有已训练的ML模型
   */
  hasTrainedMLModel(model) {
    return Object.values(model.algorithms.machineLearning)
      .some(algo => algo.enabled && algo.trained);
  }

  // 简化的机器学习方法实现（实际项目中应使用专业库）
  async calculateIsolationScore(features, model) {
    // 简化实现：基于特征值的异常检测
    const avgFeature = features.reduce((sum, f) => sum + f, 0) / features.length;
    const variance = features.reduce((sum, f) => sum + Math.pow(f - avgFeature, 2), 0) / features.length;
    return Math.min(variance / 100, 1); // 归一化到 [0, 1]
  }

  async calculateSVMScore(features, model) {
    // 简化实现：基于距离的超平面分类
    const distance = Math.sqrt(features.reduce((sum, f) => sum + f * f, 0));
    return distance > 10 ? -1 : 1; // 简单的距离阈值
  }

  async calculateLOFScore(features, history, k) {
    // 简化实现：基于k近邻的局部密度
    if (history.length < k) return 1;

    const distances = history.slice(-k).map(d =>
      Math.sqrt(features.reduce((sum, f, i) => {
        const diff = f - d.features[i] || 0;
        return sum + diff * diff;
      }, 0))
    );

    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    return avgDistance / 10; // 归一化
  }

  // 简化的训练方法（实际项目中应使用专业ML库）
  async trainIsolationForest(config, data) {
    config.model = { type: 'isolation-forest', trained: true };
    logger.info('Isolation Forest 模型训练完成');
  }

  async trainOneClassSVM(config, data) {
    config.model = { type: 'one-class-svm', trained: true };
    logger.info('One-Class SVM 模型训练完成');
  }

  async trainLocalOutlierFactor(config, data) {
    config.model = { type: 'lof', trained: true };
    logger.info('Local Outlier Factor 模型训练完成');
  }

  prepareTrainingData(history) {
    return history.map(d => d.features);
  }

  combineStatisticalResults(results) {
    const anomalyResults = Object.values(results).filter(r => r.isAnomaly);

    if (anomalyResults.length === 0) {
      return {
        isAnomaly: false,
        score: 0,
        methods: Object.keys(results)
      };
    }

    const maxScore = Math.max(...anomalyResults.map(r => r.score));
    const methods = Object.keys(results);

    return {
      isAnomaly: true,
      score: maxScore,
      methods
    };
  }

  combineMLResults(results) {
    const anomalyResults = Object.values(results).filter(r => r && r.isAnomaly);

    if (anomalyResults.length === 0) {
      return {
        isAnomaly: false,
        score: 0,
        methods: Object.keys(results)
      };
    }

    const avgScore = anomalyResults.reduce((sum, r) => sum + r.score, 0) / anomalyResults.length;
    const methods = Object.keys(results);

    return {
      isAnomaly: true,
      score: avgScore,
      methods
    };
  }
}

module.exports = AnomalyDetection;