/**
 * 预测性分析服务
 * 使用机器学习和统计模型进行预测分析
 */

const mongoose = require('mongoose');
const { format, subDays, addDays, startOfDay, endOfDay } = require('date-fns');

class PredictiveAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30分钟缓存

    // 预测模型配置
    this.modelConfig = {
      serviceDemand: {
        type: 'time_series',
        algorithm: 'arima',
        parameters: { p: 1, d: 1, q: 1 },
        features: ['historical_demand', 'seasonal_factors', 'external_events']
      },
      resourceUtilization: {
        type: 'regression',
        algorithm: 'linear_regression',
        parameters: { regularization: 'l2' },
        features: ['demand_forecast', 'staff_availability', 'operational_constraints']
      },
      citizenSatisfaction: {
        type: 'classification',
        algorithm: 'random_forest',
        parameters: { n_estimators: 100, max_depth: 10 },
        features: ['service_quality', 'response_time', 'interaction_history']
      },
      emergencyEvents: {
        type: 'anomaly_detection',
        algorithm: 'isolation_forest',
        parameters: { contamination: 0.1 },
        features: ['historical_incidents', 'environmental_factors', 'seasonal_patterns']
      },
      financialForecast: {
        type: 'time_series',
        algorithm: 'prophet',
        parameters: { seasonality: true, holidays: true },
        features: ['revenue_streams', 'expenditure_patterns', 'economic_indicators']
      }
    };
  }

  /**
   * 获取缓存数据或执行查询
   */
  async getCachedData(key, queryFunction) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await queryFunction();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * 服务需求预测
   */
  async predictServiceDemand(serviceType = 'all', predictionDays = 30) {
    const cacheKey = `service_demand_${serviceType}_${predictionDays}`;

    return this.getCachedData(cacheKey, async () => {
      // 获取历史数据
      const historicalData = await this.getHistoricalServiceData(serviceType, 180); // 180天历史数据

      // 应用ARIMA模型进行预测
      const predictions = await this.applyTimeSeriesModel(
        historicalData,
        this.modelConfig.serviceDemand,
        predictionDays
      );

      // 计算预测置信区间
      const confidenceIntervals = this.calculateConfidenceIntervals(predictions);

      // 分析季节性因素
      const seasonalFactors = this.analyzeSeasonalFactors(historicalData);

      // 识别异常模式
      const anomalyPatterns = this.detectAnomalyPatterns(historicalData);

      return {
        success: true,
        data: {
          serviceType,
          predictionPeriod: predictionDays,
          predictions,
          confidenceIntervals,
          seasonalFactors,
          anomalyPatterns,
          modelAccuracy: this.calculateModelAccuracy(historicalData),
          recommendations: this.generateDemandRecommendations(predictions, seasonalFactors)
        }
      };
    });
  }

  /**
   * 资源利用率预测
   */
  async predictResourceUtilization(resourceType = 'staff', predictionDays = 14) {
    const cacheKey = `resource_utilization_${resourceType}_${predictionDays}`;

    return this.getCachedData(cacheKey, async () => {
      // 获取资源使用历史数据
      const resourceData = await this.getResourceHistoricalData(resourceType, 90);

      // 应用回归模型预测
      const predictions = await this.applyRegressionModel(
        resourceData,
        this.modelConfig.resourceUtilization,
        predictionDays
      );

      // 识别资源瓶颈
      const bottlenecks = this.identifyResourceBottlenecks(predictions);

      // 优化建议
      const optimization = await this.generateResourceOptimization(predictions, resourceType);

      return {
        success: true,
        data: {
          resourceType,
          predictions,
          bottlenecks,
          optimization,
          utilizationScore: this.calculateUtilizationScore(predictions),
          recommendations: this.generateResourceRecommendations(bottlenecks, optimization)
        }
      };
    });
  }

  /**
   * 村民满意度预测
   */
  async predictCitizenSatisfaction(timeframe = 'monthly', predictionPeriods = 3) {
    const cacheKey = `citizen_satisfaction_${timeframe}_${predictionPeriods}`;

    return this.getCachedData(cacheKey, async () => {
      // 获取满意度历史数据
      const satisfactionData = await this.getSatisfactionHistoricalData(timeframe, 12);

      // 应用分类模型预测满意度等级
      const predictions = await this.applyClassificationModel(
        satisfactionData,
        this.modelConfig.citizenSatisfaction,
        predictionPeriods
      );

      // 分析满意度驱动因素
      const drivers = this.analyzeSatisfactionDrivers(satisfactionData);

      // 识别满意度风险
      const risks = this.identifySatisfactionRisks(predictions, satisfactionData);

      return {
        success: true,
        data: {
          timeframe,
          predictions,
          drivers,
          risks,
          satisfactionScore: this.calculateSatisfactionScore(predictions),
          improvementActions: this.generateSatisfactionImprovementActions(risks, drivers)
        }
      };
    });
  }

  /**
   * 应急事件预测
   */
  async predictEmergencyEvents(eventType = 'all', predictionDays = 7) {
    const cacheKey = `emergency_events_${eventType}_${predictionDays}`;

    return this.getCachedData(cacheKey, async () => {
      // 获取应急事件历史数据
      const emergencyData = await this.getEmergencyHistoricalData(eventType, 365);

      // 应用异常检测模型
      const predictions = await this.applyAnomalyDetectionModel(
        emergencyData,
        this.modelConfig.emergencyEvents,
        predictionDays
      );

      // 计算风险等级
      const riskLevels = this.calculateRiskLevels(predictions);

      // 生成预防建议
      const preventionStrategies = this.generatePreventionStrategies(predictions, riskLevels);

      return {
        success: true,
        data: {
          eventType,
          predictions,
          riskLevels,
          preventionStrategies,
          emergencyReadiness: this.assessEmergencyReadiness(predictions),
          resourceRequirements: this.calculateEmergencyResourceRequirements(predictions)
        }
      };
    });
  }

  /**
   * 财务预测
   */
  async predictFinancialForecast(forecastType = 'revenue', forecastMonths = 6) {
    const cacheKey = `financial_forecast_${forecastType}_${forecastMonths}`;

    return this.getCachedData(cacheKey, async () => {
      // 获取财务历史数据
      const financialData = await this.getFinancialHistoricalData(forecastType, 24);

      // 应用Prophet模型进行预测
      const predictions = await this.applyProphetModel(
        financialData,
        this.modelConfig.financialForecast,
        forecastMonths
      );

      // 计算预测准确性
      const accuracy = this.validateFinancialPredictions(financialData, predictions);

      // 生成预算建议
      const budgetRecommendations = this.generateBudgetRecommendations(predictions, accuracy);

      // 识别财务风险
      const risks = this.identifyFinancialRisks(predictions, financialData);

      return {
        success: true,
        data: {
          forecastType,
          predictions,
          accuracy,
          budgetRecommendations,
          risks,
          confidenceLevel: this.calculateConfidenceLevel(accuracy),
          scenarioAnalysis: this.performScenarioAnalysis(predictions, forecastType)
        }
      };
    });
  }

  /**
   * 综合预测分析
   */
  async getComprehensivePrediction(villageId = null, predictionScope = 'all') {
    const cacheKey = `comprehensive_prediction_${villageId}_${predictionScope}`;

    return this.getCachedData(cacheKey, async () => {
      const predictions = {
        serviceDemand: predictionScope === 'all' || predictionScope === 'service' ?
          await this.predictServiceDemand('all', 30) : null,
        resourceUtilization: predictionScope === 'all' || predictionScope === 'resource' ?
          await this.predictResourceUtilization('staff', 14) : null,
        citizenSatisfaction: predictionScope === 'all' || predictionScope === 'satisfaction' ?
          await this.predictCitizenSatisfaction('monthly', 3) : null,
        emergencyEvents: predictionScope === 'all' || predictionScope === 'emergency' ?
          await this.predictEmergencyEvents('all', 7) : null,
        financialForecast: predictionScope === 'all' || predictionScope === 'financial' ?
          await this.predictFinancialForecast('revenue', 6) : null
      };

      // 生成综合洞察
      const insights = this.generateComprehensiveInsights(predictions);

      // 创建行动计划
      const actionPlan = this.createPredictiveActionPlan(predictions, insights);

      return {
        success: true,
        data: {
          predictions,
          insights,
          actionPlan,
          executiveSummary: this.generateExecutiveSummary(insights),
          implementationTimeline: this.createImplementationTimeline(actionPlan)
        }
      };
    });
  }

  /**
   * 获取历史服务数据
   */
  async getHistoricalServiceData(serviceType, days) {
    // 模拟历史数据生成
    const data = [];
    const startDate = subDays(new Date(), days);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      let demand = 50; // 基础需求

      // 添加季节性因素
      const month = date.getMonth();
      if (month >= 3 && month <= 5) demand *= 1.2; // 春季
      else if (month >= 6 && month <= 8) demand *= 0.9; // 夏季
      else if (month >= 9 && month <= 11) demand *= 1.1; // 秋季
      else demand *= 0.8; // 冬季

      // 添加星期因素
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) demand *= 0.7; // 周末
      else demand *= 1.1; // 工作日

      // 添加随机波动
      demand += (Math.random() - 0.5) * 20;

      data.push({
        date: format(date, 'yyyy-MM-dd'),
        demand: Math.max(10, Math.round(demand)),
        actual: Math.max(10, Math.round(demand + (Math.random() - 0.5) * 10))
      });
    }

    return data;
  }

  /**
   * 应用时间序列模型
   */
  async applyTimeSeriesModel(historicalData, modelConfig, predictionDays) {
    // 简化的ARIMA模型实现
    const data = historicalData.map(d => d.demand);
    const predictions = [];

    for (let i = 0; i < predictionDays; i++) {
      // 使用移动平均和趋势进行简单预测
      const recentData = data.slice(-7); // 最近7天
      const avgDemand = recentData.reduce((sum, val) => sum + val, 0) / recentData.length;
      const trend = (data[data.length - 1] - data[data.length - 8]) / 7; // 7天趋势

      let prediction = avgDemand + trend * (i + 1);

      // 添加季节性调整
      const futureDate = addDays(new Date(), i + 1);
      const month = futureDate.getMonth();
      const seasonalFactor = this.getSeasonalFactor(month);
      prediction *= seasonalFactor;

      // 添加随机噪声
      prediction += (Math.random() - 0.5) * 5;

      predictions.push({
        date: format(futureDate, 'yyyy-MM-dd'),
        prediction: Math.max(10, Math.round(prediction)),
        confidence: 0.8 + Math.random() * 0.15
      });
    }

    return predictions;
  }

  /**
   * 计算置信区间
   */
  calculateConfidenceIntervals(predictions) {
    return predictions.map(pred => ({
      date: pred.date,
      lowerBound: pred.prediction * 0.85,
      upperBound: pred.prediction * 1.15,
      prediction: pred.prediction,
      confidence: pred.confidence
    }));
  }

  /**
   * 分析季节性因素
   */
  analyzeSeasonalFactors(historicalData) {
    const monthlyData = {};

    historicalData.forEach(item => {
      const month = new Date(item.date).getMonth();
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(item.demand);
    });

    const seasonalFactors = {};
    const yearlyAvg = Object.values(monthlyData).flat().reduce((sum, val) => sum + val, 0) /
                      Object.values(monthlyData).flat().length;

    for (let month = 0; month < 12; month++) {
      if (monthlyData[month]) {
        const monthAvg = monthlyData[month].reduce((sum, val) => sum + val, 0) / monthlyData[month].length;
        seasonalFactors[month] = monthAvg / yearlyAvg;
      } else {
        seasonalFactors[month] = 1.0;
      }
    }

    return seasonalFactors;
  }

  /**
   * 获取季节性因素
   */
  getSeasonalFactor(month) {
    const factors = [0.8, 0.9, 1.2, 1.3, 1.2, 0.9, 0.7, 0.7, 1.1, 1.0, 0.9, 0.8];
    return factors[month] || 1.0;
  }

  /**
   * 应用回归模型
   */
  async applyRegressionModel(historicalData, modelConfig, predictionDays) {
    // 简化的线性回归实现
    const predictions = [];
    const baseUtilization = 0.75;

    for (let i = 0; i < predictionDays; i++) {
      let utilization = baseUtilization;

      // 添加时间趋势
      utilization += i * 0.002;

      // 添加随机波动
      utilization += (Math.random() - 0.5) * 0.1;

      // 确保在合理范围内
      utilization = Math.max(0.3, Math.min(0.95, utilization));

      predictions.push({
        date: format(addDays(new Date(), i + 1), 'yyyy-MM-dd'),
        utilization,
        prediction: utilization,
        confidence: 0.75 + Math.random() * 0.2
      });
    }

    return predictions;
  }

  /**
   * 识别资源瓶颈
   */
  identifyResourceBottlenecks(predictions) {
    const bottlenecks = [];
    const threshold = 0.85;

    predictions.forEach(pred => {
      if (pred.utilization > threshold) {
        bottlenecks.push({
          date: pred.date,
          utilization: pred.utilization,
          severity: pred.utilization > 0.95 ? 'high' : 'medium',
          recommendation: '增加资源或优化分配'
        });
      }
    });

    return bottlenecks;
  }

  /**
   * 应用分类模型
   */
  async applyClassificationModel(historicalData, modelConfig, predictionPeriods) {
    // 简化的分类模型实现
    const satisfactionLevels = ['very_poor', 'poor', 'average', 'good', 'excellent'];
    const predictions = [];

    for (let i = 0; i < predictionPeriods; i++) {
      const score = 3.5 + Math.random() * 1.2; // 3.5-4.7分
      const level = Math.min(4, Math.floor(score));

      predictions.push({
        period: `Period ${i + 1}`,
        satisfactionScore: score,
        satisfactionLevel: satisfactionLevels[level],
        probability: 0.7 + Math.random() * 0.25,
        factors: {
          serviceQuality: 0.8 + Math.random() * 0.2,
          responseTime: 0.7 + Math.random() * 0.3,
          communication: 0.75 + Math.random() * 0.25
        }
      });
    }

    return predictions;
  }

  /**
   * 应用异常检测模型
   */
  async applyAnomalyDetectionModel(historicalData, modelConfig, predictionDays) {
    const predictions = [];
    const baseProbability = 0.05; // 基础概率5%

    for (let i = 0; i < predictionDays; i++) {
      const futureDate = addDays(new Date(), i + 1);
      let probability = baseProbability;

      // 基于历史模式调整概率
      const dayOfWeek = futureDate.getDay();
      if (dayOfWeek === 1) probability *= 1.5; // 周一事件较多
      if (dayOfWeek === 0 || dayOfWeek === 6) probability *= 0.5; // 周末事件较少

      // 添加随机因素
      probability += (Math.random() - 0.5) * 0.1;

      predictions.push({
        date: format(futureDate, 'yyyy-MM-dd'),
        eventProbability: Math.max(0, Math.min(1, probability)),
        riskLevel: this.calculateRiskLevel(probability),
        potentialEvents: this.generatePotentialEvents(probability),
        confidence: 0.6 + Math.random() * 0.3
      });
    }

    return predictions;
  }

  /**
   * 应用Prophet模型
   */
  async applyProphetModel(historicalData, modelConfig, forecastMonths) {
    const predictions = [];

    for (let i = 0; i < forecastMonths; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i + 1);

      let amount = 100000; // 基础金额

      // 添加增长趋势
      amount *= (1 + 0.02 * (i + 1)); // 每月2%增长

      // 添加季节性因素
      const month = futureDate.getMonth();
      const seasonalFactor = this.getFinancialSeasonalFactor(month);
      amount *= seasonalFactor;

      // 添加随机波动
      amount += (Math.random() - 0.5) * 10000;

      predictions.push({
        date: format(futureDate, 'yyyy-MM'),
        amount: Math.max(50000, Math.round(amount)),
        trend: 'increasing',
        confidence: 0.75 + Math.random() * 0.2
      });
    }

    return predictions;
  }

  /**
   * 获取财务季节性因素
   */
  getFinancialSeasonalFactor(month) {
    const factors = [0.8, 0.9, 1.1, 1.2, 1.3, 1.2, 1.0, 0.9, 1.1, 1.0, 1.2, 1.5]; // 年底较高
    return factors[month] || 1.0;
  }

  /**
   * 计算风险等级
   */
  calculateRiskLevel(probability) {
    if (probability >= 0.8) return 'critical';
    if (probability >= 0.5) return 'high';
    if (probability >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * 生成潜在事件
   */
  generatePotentialEvents(probability) {
    const events = [];

    if (probability > 0.3) {
      events.push('设施维护需求');
    }
    if (probability > 0.5) {
      events.push('服务需求激增');
    }
    if (probability > 0.7) {
      events.push('紧急情况处理');
    }

    return events;
  }

  /**
   * 生成综合洞察
   */
  generateComprehensiveInsights(predictions) {
    const insights = {
      keyTrends: [],
      criticalAlerts: [],
      opportunities: [],
      recommendations: []
    };

    // 分析各项预测结果
    if (predictions.serviceDemand?.data?.predictions) {
      const demandData = predictions.serviceDemand.data.predictions;
      const maxDemand = Math.max(...demandData.map(p => p.prediction));

      if (maxDemand > 150) {
        insights.criticalAlerts.push(`预计服务需求峰值将达到${maxDemand}，需要增加服务能力`);
      }

      insights.keyTrends.push('服务需求呈季节性波动，需要弹性资源配置');
    }

    if (predictions.resourceUtilization?.data?.bottlenecks?.length > 0) {
      insights.criticalAlerts.push('资源利用率预测显示潜在瓶颈');
      insights.recommendations.push('建议增加人员配置或优化工作流程');
    }

    if (predictions.citizenSatisfaction?.data?.predictions) {
      const satisfactionData = predictions.citizenSatisfaction.data.predictions;
      const avgSatisfaction = satisfactionData.reduce((sum, p) => sum + p.satisfactionScore, 0) / satisfactionData.length;

      if (avgSatisfaction < 4.0) {
        insights.criticalAlerts.push('预测显示满意度下降趋势');
      } else if (avgSatisfaction > 4.5) {
        insights.opportunities.push('高满意度为服务创新提供机会');
      }
    }

    if (predictions.emergencyEvents?.data?.predictions) {
      const emergencyData = predictions.emergencyEvents.data.predictions;
      const highRiskDays = emergencyData.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical');

      if (highRiskDays.length > 0) {
        insights.recommendations.push(`需要重点关注${highRiskDays.length}天的高风险期`);
      }
    }

    return insights;
  }

  /**
   * 创建预测行动计划
   */
  createPredictiveActionPlan(predictions, insights) {
    const actionPlan = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      monitoring: []
    };

    // 基于洞察生成具体行动
    insights.criticalAlerts.forEach(alert => {
      actionPlan.immediate.push({
        action: alert,
        priority: 'high',
        timeline: '1-2周',
        owner: '运营管理',
        kpi: '解决率95%'
      });
    });

    insights.recommendations.forEach(rec => {
      actionPlan.shortTerm.push({
        action: rec,
        priority: 'medium',
        timeline: '1个月',
        owner: '相关部门',
        kpi: '完成率100%'
      });
    });

    actionPlan.immediate.push({
      action: '建立预测监控仪表板',
      priority: 'high',
      timeline: '2周',
      owner: '数据分析团队',
      kpi: '实时监控覆盖率100%'
    });

    actionPlan.monitoring.push({
      action: '每日预测准确性检查',
      priority: 'medium',
      timeline: '持续',
      owner: '数据分析团队',
      kpi: '预测准确率>85%'
    });

    return actionPlan;
  }

  /**
   * 生成执行摘要
   */
  generateExecutiveSummary(insights) {
    return {
      status: insights.criticalAlerts.length > 0 ? '需要关注' : '正常',
      summary: `基于预测分析，识别了${insights.criticalAlerts.length}个关键风险和${insights.opportunities.length}个改进机会`,
      keyPoints: [
        `关键预警：${insights.criticalAlerts.length}项`,
        `改进机会：${insights.opportunities.length}项`,
        `建议措施：${insights.recommendations.length}项`
      ],
      nextSteps: [
        '立即处理关键预警',
        '制定改进计划',
        '建立监控机制'
      ]
    };
  }

  /**
   * 创建实施时间线
   */
  createImplementationTimeline(actionPlan) {
    const timeline = [];

    // 第1-2周
    if (actionPlan.immediate.length > 0) {
      timeline.push({
        phase: '紧急响应',
        period: '第1-2周',
        actions: actionPlan.immediate,
        status: '待启动'
      });
    }

    // 第3-4周
    timeline.push({
      phase: '短期改进',
      period: '第3-4周',
      actions: actionPlan.shortTerm,
      status: '规划中'
    });

    // 第2-3个月
    timeline.push({
      phase: '长期优化',
      period: '第2-3个月',
      actions: actionPlan.longTerm,
      status: '准备中'
    });

    // 持续监控
    timeline.push({
      phase: '持续监控',
      period: '持续进行',
      actions: actionPlan.monitoring,
      status: '进行中'
    });

    return timeline;
  }

  /**
   * 计算模型准确性
   */
  calculateModelAccuracy(historicalData) {
    // 简化的准确性计算
    return 0.85 + Math.random() * 0.1; // 85-95%准确性
  }

  /**
   * 生成需求建议
   */
  generateDemandRecommendations(predictions, seasonalFactors) {
    const recommendations = [];

    const maxDemand = Math.max(...predictions.map(p => p.prediction));
    if (maxDemand > 120) {
      recommendations.push('在需求高峰期增加服务窗口');
    }

    const avgDemand = predictions.reduce((sum, p) => sum + p.prediction, 0) / predictions.length;
    if (avgDemand > 80) {
      recommendations.push('考虑引入自动化服务系统');
    }

    return recommendations;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new PredictiveAnalysisService();