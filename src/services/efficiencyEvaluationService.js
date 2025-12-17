/**
 * 村务效能评估服务
 * 评估村务处理效率、服务质量、决策效果等
 */

const mongoose = require('mongoose');
const { format, subDays, startOfDay, endOfDay, eachDayOfInterval } = require('date-fns');

class EfficiencyEvaluationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15分钟缓存

    // 效能评估指标体系
    this.efficiencyMetrics = {
      responsiveness: '响应时效性',      // 平均响应时间
      processing: '处理效率',          // 平均处理时间
      quality: '处理质量',            // 一次性解决率
      satisfaction: '满意度',         // 用户满意度评分
      throughput: '处理吞吐量',        // 日均处理量
      cost: '成本效益',              // 单位处理成本
      compliance: '合规性',           // 流程合规率
      innovation: '创新性'            // 创新改进数量
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
   * 综合效能评估
   */
  async getComprehensiveEfficiencyEvaluation(villageId = null, timeRange = 'month') {
    const cacheKey = `comprehensive_efficiency_${villageId}_${timeRange}`;

    return this.getCachedData(cacheKey, async () => {
      const evaluations = {
        responsiveness: await this.evaluateResponsiveness(villageId, timeRange),
        processing: await this.evaluateProcessingEfficiency(villageId, timeRange),
        quality: await this.evaluateServiceQuality(villageId, timeRange),
        satisfaction: await this.evaluateUserSatisfaction(villageId, timeRange),
        throughput: await this.evaluateThroughput(villageId, timeRange),
        cost: await this.evaluateCostEfficiency(villageId, timeRange),
        compliance: await this.evaluateProcessCompliance(villageId, timeRange),
        innovation: await this.evaluateInnovationMetrics(villageId, timeRange)
      };

      // 计算综合效能分数
      const overallScore = this.calculateOverallEfficiencyScore(evaluations);
      const trends = await this.analyzeEfficiencyTrends(villageId, timeRange);
      const benchmarks = await this.getIndustryBenchmarks();
      const recommendations = this.generateEfficiencyRecommendations(evaluations, overallScore);

      return {
        success: true,
        data: {
          overallScore,
          evaluations,
          trends,
          benchmarks,
          recommendations,
          summary: {
            grade: this.getEfficiencyGrade(overallScore),
            strengths: this.identifyStrengths(evaluations),
            weaknesses: this.identifyWeaknesses(evaluations),
            improvementAreas: this.identifyImprovementAreas(evaluations)
          }
        }
      };
    });
  }

  /**
   * 评估响应时效性
   */
  async evaluateResponsiveness(villageId, timeRange) {
    // 模拟响应时间数据
    const responseTimeData = {
      averageResponseTime: Math.floor(Math.random() * 30) + 15, // 15-45分钟
      firstResponseRate: 0.85 + Math.random() * 0.1, // 85-95%
      responseTimeDistribution: {
        within5min: 0.15,
        within15min: 0.45,
        within30min: 0.30,
        within60min: 0.08,
        over60min: 0.02
      },
      serviceResponseTimes: {
        '证件办理': Math.floor(Math.random() * 20) + 10,
        '费用缴纳': Math.floor(Math.random() * 10) + 5,
        '投诉处理': Math.floor(Math.random() * 40) + 20,
        '信息查询': Math.floor(Math.random() * 5) + 2,
        '村务咨询': Math.floor(Math.random() * 30) + 15
      }
    };

    const score = this.calculateResponsivenessScore(responseTimeData);

    return {
      metric: 'responsiveness',
      name: '响应时效性',
      score,
      grade: this.getScoreGrade(score),
      details: responseTimeData,
      trend: Math.random() > 0.5 ? 'improving' : 'stable',
      target: 90, // 目标分数
      status: score >= 90 ? 'excellent' : score >= 75 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * 评估处理效率
   */
  async evaluateProcessingEfficiency(villageId, timeRange) {
    const processingData = {
      averageProcessingTime: Math.floor(Math.random() * 120) + 60, // 60-180分钟
      processingTimeDistribution: {
        within30min: 0.25,
        within60min: 0.40,
        within120min: 0.25,
        within180min: 0.08,
        over180min: 0.02
      },
      firstTimeResolutionRate: 0.78 + Math.random() * 0.15, // 78-93%
      escalationRate: 0.05 + Math.random() * 0.05, // 5-10%
      processOptimizations: Math.floor(Math.random() * 5) + 2
    };

    const score = this.calculateProcessingScore(processingData);

    return {
      metric: 'processing',
      name: '处理效率',
      score,
      grade: this.getScoreGrade(score),
      details: processingData,
      trend: Math.random() > 0.5 ? 'improving' : 'stable',
      target: 85,
      status: score >= 85 ? 'excellent' : score >= 70 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * 评估服务质量
   */
  async evaluateServiceQuality(villageId, timeRange) {
    const qualityData = {
      accuracyRate: 0.92 + Math.random() * 0.06, // 92-98%
      completenessRate: 0.88 + Math.random() * 0.10, // 88-98%
      errorRate: 0.01 + Math.random() * 0.02, // 1-3%
      complaintRate: 0.02 + Math.random() * 0.03, // 2-5%
      serviceRecoveryRate: 0.85 + Math.random() * 0.10, // 85-95%
      qualityMetrics: {
        '证件办理': { accuracy: 0.98, completeness: 0.95 },
        '费用缴纳': { accuracy: 0.99, completeness: 0.99 },
        '投诉处理': { accuracy: 0.85, completeness: 0.80 },
        '信息查询': { accuracy: 0.92, completeness: 0.88 }
      }
    };

    const score = this.calculateQualityScore(qualityData);

    return {
      metric: 'quality',
      name: '服务质量',
      score,
      grade: this.getScoreGrade(score),
      details: qualityData,
      trend: Math.random() > 0.5 ? 'improving' : 'stable',
      target: 90,
      status: score >= 90 ? 'excellent' : score >= 80 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * 评估用户满意度
   */
  async evaluateUserSatisfaction(villageId, timeRange) {
    const satisfactionData = {
      overallSatisfaction: 4.2 + Math.random() * 0.6, // 4.2-4.8
      npsScore: 45 + Math.random() * 25, // 45-70 (Net Promoter Score)
      satisfactionDistribution: {
        verySatisfied: 0.35 + Math.random() * 0.15,
        satisfied: 0.40 + Math.random() * 0.10,
        neutral: 0.15 + Math.random() * 0.05,
        dissatisfied: 0.05 + Math.random() * 0.03,
        veryDissatisfied: 0.01 + Math.random() * 0.02
      },
      serviceSatisfaction: {
        '证件办理': 4.5 + Math.random() * 0.4,
        '费用缴纳': 4.3 + Math.random() * 0.4,
        '投诉处理': 3.8 + Math.random() * 0.4,
        '信息查询': 4.2 + Math.random() * 0.4
      },
      feedbackAnalysis: {
        positiveKeywords: ['高效', '便民', '专业', '热情'],
        negativeKeywords: ['等待时间长', '流程复杂', '态度冷淡'],
        improvementSuggestions: 25
      }
    };

    const score = this.calculateSatisfactionScore(satisfactionData);

    return {
      metric: 'satisfaction',
      name: '用户满意度',
      score,
      grade: this.getScoreGrade(score),
      details: satisfactionData,
      trend: Math.random() > 0.5 ? 'improving' : 'stable',
      target: 85,
      status: score >= 85 ? 'excellent' : score >= 75 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * 评估处理吞吐量
   */
  async evaluateThroughput(villageId, timeRange) {
    const throughputData = {
      dailyThroughput: Math.floor(Math.random() * 50) + 100, // 100-150件/天
      peakHourThroughput: Math.floor(Math.random() * 20) + 15, // 15-35件/小时
      averageHandlingTime: Math.floor(Math.random() * 15) + 10, // 10-25分钟/件
      staffUtilization: 0.75 + Math.random() * 0.20, // 75-95%
      capacityUtilization: 0.65 + Math.random() * 0.25, // 65-90%
      throughputTrend: Math.random() > 0.5 ? 'increasing' : 'stable'
    };

    const score = this.calculateThroughputScore(throughputData);

    return {
      metric: 'throughput',
      name: '处理吞吐量',
      score,
      grade: this.getScoreGrade(score),
      details: throughputData,
      trend: throughputData.throughputTrend,
      target: 80,
      status: score >= 80 ? 'excellent' : score >= 70 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * 评估成本效益
   */
  async evaluateCostEfficiency(villageId, timeRange) {
    const costData = {
      averageCostPerTransaction: Math.floor(Math.random() * 20) + 10, // 10-30元/笔
      costBreakdown: {
        personnel: 0.45, // 45%
        technology: 0.25, // 25%
        overhead: 0.20, // 20%
        materials: 0.10 // 10%
      },
      costReduction: 0.05 + Math.random() * 0.10, // 5-15%
      automationRate: 0.30 + Math.random() * 0.40, // 30-70%
      roi: 2.5 + Math.random() * 2.0, // ROI 2.5-4.5
      costPerService: {
        '证件办理': Math.floor(Math.random() * 15) + 20,
        '费用缴纳': Math.floor(Math.random() * 5) + 8,
        '投诉处理': Math.floor(Math.random() * 25) + 30,
        '信息查询': Math.floor(Math.random() * 3) + 2
      }
    };

    const score = this.calculateCostScore(costData);

    return {
      metric: 'cost',
      name: '成本效益',
      score,
      grade: this.getScoreGrade(score),
      details: costData,
      trend: Math.random() > 0.5 ? 'improving' : 'stable',
      target: 75,
      status: score >= 75 ? 'excellent' : score >= 60 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * 评估流程合规性
   */
  async evaluateProcessCompliance(villageId, timeRange) {
    const complianceData = {
      overallComplianceRate: 0.88 + Math.random() * 0.10, // 88-98%
      processAdherence: {
        '证件办理': 0.95 + Math.random() * 0.04,
        '费用缴纳': 0.98 + Math.random() * 0.02,
        '投诉处理': 0.85 + Math.random() * 0.10,
        '信息查询': 0.92 + Math.random() * 0.06
      },
      documentationCompliance: 0.90 + Math.random() * 0.08, // 90-98%
      auditFindings: Math.floor(Math.random() * 3), // 0-2个发现
      correctiveActions: Math.floor(Math.random() * 5) + 3, // 3-7个改进措施
      complianceViolations: Math.floor(Math.random() * 5) // 0-4个违规
    };

    const score = this.calculateComplianceScore(complianceData);

    return {
      metric: 'compliance',
      name: '流程合规性',
      score,
      grade: this.getScoreGrade(score),
      details: complianceData,
      trend: Math.random() > 0.5 ? 'improving' : 'stable',
      target: 95,
      status: score >= 95 ? 'excellent' : score >= 85 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * 评估创新性指标
   */
  async evaluateInnovationMetrics(villageId, timeRange) {
    const innovationData = {
      newServicesImplemented: Math.floor(Math.random() * 3) + 2, // 2-4个新服务
      processImprovements: Math.floor(Math.random() * 8) + 5, // 5-12个改进
      technologyAdoptions: Math.floor(Math.random() * 4) + 1, // 1-4个新技术
      innovationSavings: Math.floor(Math.random() * 50000) + 10000, // 1-5万元节省
      citizenInnovationParticipation: 0.15 + Math.random() * 0.10, // 15-25%参与率
      bestPracticeSharing: Math.floor(Math.random() * 3) + 1 // 1-3个最佳实践分享
    };

    const score = this.calculateInnovationScore(innovationData);

    return {
      metric: 'innovation',
      name: '创新性',
      score,
      grade: this.getScoreGrade(score),
      details: innovationData,
      trend: Math.random() > 0.5 ? 'improving' : 'stable',
      target: 70,
      status: score >= 70 ? 'excellent' : score >= 55 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * 计算响应时效性分数
   */
  calculateResponsivenessScore(data) {
    const timeScore = Math.max(0, 100 - (data.averageResponseTime - 15) * 2);
    const rateScore = data.firstResponseRate * 100;
    const distributionScore = (data.responseTimeDistribution.within30min * 60) +
                            (data.responseTimeDistribution.within60min * 30) +
                            (data.responseTimeDistribution.over60min * 10);

    return Math.round((timeScore * 0.4 + rateScore * 0.3 + distributionScore * 0.3));
  }

  /**
   * 计算处理效率分数
   */
  calculateProcessingScore(data) {
    const timeScore = Math.max(0, 100 - (data.averageProcessingTime - 60) * 0.5);
    const resolutionScore = data.firstTimeResolutionRate * 100;
    const escalationScore = Math.max(0, 100 - data.escalationRate * 200);

    return Math.round((timeScore * 0.4 + resolutionScore * 0.4 + escalationScore * 0.2));
  }

  /**
   * 计算服务质量分数
   */
  calculateQualityScore(data) {
    const accuracyScore = data.accuracyRate * 100;
    const completenessScore = data.completenessRate * 100;
    const errorScore = Math.max(0, 100 - data.errorRate * 500);
    const complaintScore = Math.max(0, 100 - data.complaintRate * 200);

    return Math.round((accuracyScore * 0.3 + completenessScore * 0.3 + errorScore * 0.2 + complaintScore * 0.2));
  }

  /**
   * 计算满意度分数
   */
  calculateSatisfactionScore(data) {
    const satisfactionScore = (data.overallSatisfaction / 5) * 100;
    const npsScore = Math.min(100, (data.npsScore + 100) / 2);
    const distributionScore = (data.satisfactionDistribution.verySatisfied + data.satisfactionDistribution.satisfied) * 100;

    return Math.round((satisfactionScore * 0.4 + npsScore * 0.3 + distributionScore * 0.3));
  }

  /**
   * 计算吞吐量分数
   */
  calculateThroughputScore(data) {
    const throughputScore = Math.min(100, (data.dailyThroughput / 150) * 100);
    const utilizationScore = ((data.staffUtilization + data.capacityUtilization) / 2) * 100;
    const efficiencyScore = Math.min(100, (100 / data.averageHandlingTime) * 3);

    return Math.round((throughputScore * 0.4 + utilizationScore * 0.3 + efficiencyScore * 0.3));
  }

  /**
   * 计算成本效益分数
   */
  calculateCostScore(data) {
    const costScore = Math.max(0, 100 - (data.averageCostPerTransaction - 10) * 3);
    const reductionScore = data.costReduction * 100;
    const automationScore = data.automationRate * 100;
    const roiScore = Math.min(100, (data.roi / 5) * 100);

    return Math.round((costScore * 0.3 + reductionScore * 0.2 + automationScore * 0.2 + roiScore * 0.3));
  }

  /**
   * 计算合规性分数
   */
  calculateComplianceScore(data) {
    const complianceScore = data.overallComplianceRate * 100;
    const documentationScore = data.documentationCompliance * 100;
    const violationScore = Math.max(0, 100 - data.complianceViolations * 10);

    return Math.round((complianceScore * 0.5 + documentationScore * 0.3 + violationScore * 0.2));
  }

  /**
   * 计算创新性分数
   */
  calculateInnovationScore(data) {
    const serviceScore = Math.min(100, data.newServicesImplemented * 25);
    const improvementScore = Math.min(100, data.processImprovements * 8);
    const technologyScore = Math.min(100, data.technologyAdoptions * 25);
    const participationScore = data.citizenInnovationParticipation * 100;

    return Math.round((serviceScore * 0.3 + improvementScore * 0.3 + technologyScore * 0.2 + participationScore * 0.2));
  }

  /**
   * 计算综合效能分数
   */
  calculateOverallEfficiencyScore(evaluations) {
    const weights = {
      responsiveness: 0.15,
      processing: 0.20,
      quality: 0.20,
      satisfaction: 0.20,
      throughput: 0.10,
      cost: 0.10,
      compliance: 0.03,
      innovation: 0.02
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [metric, evaluation] of Object.entries(evaluations)) {
      totalScore += evaluation.score * weights[metric];
      totalWeight += weights[metric];
    }

    return Math.round(totalScore / totalWeight);
  }

  /**
   * 分析效能趋势
   */
  async analyzeEfficiencyTrends(villageId, timeRange) {
    // 模拟趋势数据
    const monthlyData = [];
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];

    for (let i = 0; i < 6; i++) {
      monthlyData.push({
        month: months[i],
        overallScore: Math.floor(Math.random() * 15) + 75,
        responsiveness: Math.floor(Math.random() * 20) + 75,
        processing: Math.floor(Math.random() * 20) + 70,
        quality: Math.floor(Math.random() * 15) + 80,
        satisfaction: Math.floor(Math.random() * 20) + 75,
        improvementCount: Math.floor(Math.random() * 5) + 2
      });
    }

    return {
      monthlyData,
      trendAnalysis: {
        overallTrend: this.calculateTrend(monthlyData.map(d => d.overallScore)),
        keyImprovements: ['响应时间缩短20%', '一次性解决率提升15%'],
        challenges: ['满意度波动', '成本控制压力']
      }
    };
  }

  /**
   * 获取行业基准
   */
  async getIndustryBenchmarks() {
    return {
      responsiveness: 85,
      processing: 80,
      quality: 90,
      satisfaction: 82,
      throughput: 75,
      cost: 70,
      compliance: 95,
      innovation: 60
    };
  }

  /**
   * 生成效能改进建议
   */
  generateEfficiencyRecommendations(evaluations, overallScore) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };

    // 根据各项指标生成具体建议
    for (const [metric, evaluation] of Object.entries(evaluations)) {
      if (evaluation.score < evaluation.target) {
        const recommendation = this.getSpecificRecommendation(metric, evaluation.score);

        if (evaluation.score < 60) {
          recommendations.immediate.push(recommendation);
        } else if (evaluation.score < 80) {
          recommendations.shortTerm.push(recommendation);
        } else {
          recommendations.longTerm.push(recommendation);
        }
      }
    }

    return recommendations;
  }

  /**
   * 获取具体改进建议
   */
  getSpecificRecommendation(metric, score) {
    const recommendations = {
      responsiveness: {
        low: '建立快速响应机制，设定响应时间SLA',
        medium: '优化响应流程，增加客服人员培训',
        high: '实施智能客服，提升响应效率'
      },
      processing: {
        low: '简化处理流程，减少不必要的环节',
        medium: '加强流程标准化，提升处理效率',
        high: '引入自动化处理系统，提升处理速度'
      },
      quality: {
        low: '建立质量检查机制，加强过程监控',
        medium: '完善培训体系，提升专业技能',
        high: '实施全面质量管理，追求零缺陷'
      },
      satisfaction: {
        low: '改善服务态度，加强沟通技巧培训',
        medium: '优化用户体验，简化操作流程',
        high: '实施客户关系管理，提供个性化服务'
      },
      throughput: {
        low: '增加服务窗口，延长服务时间',
        medium: '优化资源配置，提升服务能力',
        high: '实施弹性排班，应对需求波动'
      },
      cost: {
        low: '控制成本支出，优化资源配置',
        medium: '提高自动化水平，降低人力成本',
        high: '实施精益管理，消除浪费'
      },
      compliance: {
        low: '加强合规培训，完善监督机制',
        medium: '建立合规检查清单，定期审计',
        high: '实施合规管理系统，确保100%合规'
      },
      innovation: {
        low: '鼓励创新思维，建立创新机制',
        medium: '增加创新投入，支持创新项目',
        high: '建立创新生态，推动持续创新'
      }
    };

    const level = score < 60 ? 'low' : score < 80 ? 'medium' : 'high';
    return recommendations[metric]?.[level] || '持续改进';
  }

  /**
   * 获取效能等级
   */
  getEfficiencyGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 65) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取分数等级
   */
  getScoreGrade(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'average';
    if (score >= 60) return 'below_average';
    return 'poor';
  }

  /**
   * 识别优势
   */
  identifyStrengths(evaluations) {
    const strengths = [];
    for (const [metric, evaluation] of Object.entries(evaluations)) {
      if (evaluation.score >= evaluation.target) {
        strengths.push({
          metric: evaluation.name,
          score: evaluation.score,
          description: `${evaluation.name}表现优秀，得分${evaluation.score}分`
        });
      }
    }
    return strengths;
  }

  /**
   * 识别弱点
   */
  identifyWeaknesses(evaluations) {
    const weaknesses = [];
    for (const [metric, evaluation] of Object.entries(evaluations)) {
      if (evaluation.score < evaluation.target * 0.8) {
        weaknesses.push({
          metric: evaluation.name,
          score: evaluation.score,
          target: evaluation.target,
          gap: evaluation.target - evaluation.score,
          description: `${evaluation.name}需要改进，当前得分${evaluation.score}分，目标${evaluation.target}分`
        });
      }
    }
    return weaknesses;
  }

  /**
   * 识别改进领域
   */
  identifyImprovementAreas(evaluations) {
    const areas = [];
    for (const [metric, evaluation] of Object.entries(evaluations)) {
      if (evaluation.score < evaluation.target) {
        areas.push({
          metric,
          name: evaluation.name,
          currentScore: evaluation.score,
          targetScore: evaluation.target,
          priority: this.calculatePriority(evaluation.score, evaluation.target),
          estimatedEffort: this.estimateImprovementEffort(metric, evaluation.score, evaluation.target),
          expectedImpact: this.estimateImprovementImpact(metric)
        });
      }
    }

    return areas.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 计算改进优先级
   */
  calculatePriority(currentScore, targetScore) {
    const gap = targetScore - currentScore;
    const gapRatio = gap / targetScore;

    if (gapRatio > 0.3) return 3; // 高优先级
    if (gapRatio > 0.15) return 2; // 中优先级
    return 1; // 低优先级
  }

  /**
   * 估算改进工作量
   */
  estimateImprovementEffort(metric, currentScore, targetScore) {
    const gap = targetScore - currentScore;
    if (gap > 20) return 'high';
    if (gap > 10) return 'medium';
    return 'low';
  }

  /**
   * 估算改进影响
   */
  estimateImprovementImpact(metric) {
    const impacts = {
      responsiveness: 'high',
      processing: 'high',
      quality: 'high',
      satisfaction: 'high',
      throughput: 'medium',
      cost: 'medium',
      compliance: 'medium',
      innovation: 'low'
    };

    return impacts[metric] || 'medium';
  }

  /**
   * 计算趋势
   */
  calculateTrend(data) {
    if (data.length < 2) return 'stable';

    const first = data[0];
    const last = data[data.length - 1];
    const change = (last - first) / first;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new EfficiencyEvaluationService();