import { ref, computed } from 'vue';

/**
 * 智能审批建议组合式函数
 */
export function useSmartApproval() {
  // 历史审批数据（模拟数据，实际项目中从后端获取）
  const historicalData = ref([
    {
      category: 'infrastructure',
      amount: 25000,
      applicant: '张建设',
      approved: true,
      approvalTime: 2.5, // 小时
      riskFactors: ['amount_high'],
      season: 'spring'
    },
    {
      category: 'office',
      amount: 3500,
      applicant: '王会计',
      approved: true,
      approvalTime: 0.5,
      riskFactors: [],
      season: 'winter'
    },
    {
      category: 'culture',
      amount: 8000,
      applicant: '李文化',
      approved: true,
      approvalTime: 1.0,
      riskFactors: ['seasonal'],
      season: 'spring'
    },
    // 更多历史数据...
  ]);

  // 风险评估规则
  const riskRules = {
    // 金额风险
    amount: {
      veryHigh: { threshold: 50000, score: 90, message: '金额超过5万元，需要特别关注' },
      high: { threshold: 20000, score: 70, message: '金额较大，建议仔细审核' },
      medium: { threshold: 10000, score: 40, message: '金额适中，常规审核' },
      low: { threshold: 5000, score: 20, message: '小额支出，可快速审批' },
      veryLow: { threshold: 1000, score: 10, message: '小额支出，建议自动通过' }
    },

    // 申请人信用评级
    applicantCredit: {
      excellent: { score: 5, message: '申请人信用优秀' },
      good: { score: 15, message: '申请人信用良好' },
      fair: { score: 30, message: '申请人信用一般' },
      poor: { score: 60, message: '申请人信用较差，需谨慎审核' }
    },

    // 支出类别风险
    categoryRisk: {
      emergency: { score: 80, message: '应急支出，优先处理但需核实' },
      infrastructure: { score: 50, message: '基础设施支出，需核实工程必要性' },
      operation: { score: 30, message: '日常运营支出，常规审核' },
      culture: { score: 25, message: '文化活动支出，核实活动合理性' },
      office: { score: 20, message: '办公用品支出，低风险' }
    },

    // 时间风险
    timeRisk: {
      endOfYear: { score: 40, message: '年末支出，注意预算执行情况' },
      holiday: { score: 30, message: '节假日期间，注意必要性' },
      normal: { score: 10, message: '正常时期支出' }
    },

    // 频率风险
    frequencyRisk: {
      tooFrequent: { score: 50, message: '同类支出频繁，需注意是否合理' },
      normal: { score: 10, message: '支出频率正常' }
    }
  };

  /**
   * 计算智能审批建议
   * @param {Object} application - 审批申请对象
   * @returns {Object} 审批建议结果
   */
  const calculateApprovalSuggestion = (application) => {
    const {
      amount,
      category,
      applicant,
      submitTime,
      description,
      urgency = 'normal'
    } = application;

    let totalRiskScore = 0;
    const riskFactors = [];
    const recommendations = [];

    // 1. 金额风险评估
    const amountRisk = assessAmountRisk(amount);
    totalRiskScore += amountRisk.score;
    riskFactors.push(amountRisk);

    // 2. 申请人信用评估
    const creditRisk = assessApplicantCredit(applicant);
    totalRiskScore += creditRisk.score;
    riskFactors.push(creditRisk);

    // 3. 支出类别风险评估
    const categoryRiskScore = assessCategoryRisk(category);
    totalRiskScore += categoryRiskScore.score;
    riskFactors.push(categoryRiskScore);

    // 4. 时间风险评估
    const timeRisk = assessTimeRisk(submitTime);
    totalRiskScore += timeRisk.score;
    riskFactors.push(timeRisk);

    // 5. 频率风险评估
    const frequencyRisk = assessFrequencyRisk(applicant, category);
    totalRiskScore += frequencyRisk.score;
    riskFactors.push(frequencyRisk);

    // 6. 历史相似案例分析
    const similarCases = findSimilarCases(application);
    const historicalInsight = analyzeSimilarCases(similarCases);

    // 生成最终建议
    const finalRecommendation = generateFinalRecommendation(
      totalRiskScore,
      riskFactors,
      historicalInsight,
      urgency
    );

    return {
      riskLevel: getRiskLevel(totalRiskScore),
      riskScore: totalRiskScore,
      riskFactors: riskFactors.filter(factor => factor.score > 0),
      recommendation: finalRecommendation,
      similarCases,
      historicalInsight,
      autoApprovalEligible: totalRiskScore <= 50 && amount <= 5000,
      estimatedApprovalTime: estimateApprovalTime(totalRiskScore, amount),
      requiredApprovers: getRequiredApprovers(totalRiskScore, amount),
      warnings: generateWarnings(riskFactors),
      nextSteps: generateNextSteps(finalRecommendation.action)
    };
  };

  // 金额风险评估
  const assessAmountRisk = (amount) => {
    const rules = riskRules.amount;

    if (amount >= rules.veryHigh.threshold) {
      return { type: 'amount', level: 'veryHigh', ...rules.veryHigh };
    } else if (amount >= rules.high.threshold) {
      return { type: 'amount', level: 'high', ...rules.high };
    } else if (amount >= rules.medium.threshold) {
      return { type: 'amount', level: 'medium', ...rules.medium };
    } else if (amount >= rules.low.threshold) {
      return { type: 'amount', level: 'low', ...rules.low };
    } else {
      return { type: 'amount', level: 'veryLow', ...rules.veryLow };
    }
  };

  // 申请人信用评估（简化版，实际项目中需要完整的信用评分系统）
  const assessApplicantCredit = (applicant) => {
    // 模拟信用评分逻辑
    const creditScores = {
      '张建设': 'good',
      '李文化': 'excellent',
      '王会计': 'excellent',
      '赵财务': 'good',
      '孙清洁': 'fair'
    };

    const creditLevel = creditScores[applicant] || 'fair';
    return {
      type: 'credit',
      level: creditLevel,
      ...riskRules.applicantCredit[creditLevel]
    };
  };

  // 支出类别风险评估
  const assessCategoryRisk = (category) => {
    const categoryMap = {
      'infrastructure': 'infrastructure',
      'operation': 'operation',
      'culture': 'culture',
      'office': 'office',
      'emergency': 'emergency'
    };

    const riskCategory = categoryMap[category] || 'operation';
    return {
      type: 'category',
      level: riskCategory,
      ...riskRules.categoryRisk[riskCategory]
    };
  };

  // 时间风险评估
  const assessTimeRisk = (submitTime) => {
    const date = new Date(submitTime);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 年末风险（11-12月）
    if (month >= 11) {
      return { type: 'time', level: 'endOfYear', ...riskRules.timeRisk.endOfYear };
    }

    // 节假日风险（简化判断）
    const holidays = [
      { month: 1, days: [1] }, // 元旦
      { month: 2, days: [14] }, // 春节（简化）
      { month: 5, days: [1] }, // 劳动节
      { month: 10, days: [1] }  // 国庆节
    ];

    for (const holiday of holidays) {
      if (month === holiday.month && holiday.days.includes(day)) {
        return { type: 'time', level: 'holiday', ...riskRules.timeRisk.holiday };
      }
    }

    return { type: 'time', level: 'normal', ...riskRules.timeRisk.normal };
  };

  // 频率风险评估
  const assessFrequencyRisk = (applicant, category) => {
    // 统计最近30天内同类申请次数
    const recentApplications = historicalData.value.filter(item => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return item.applicant === applicant &&
             item.category === category &&
             new Date(item.submitTime) > thirtyDaysAgo;
    });

    if (recentApplications.length >= 3) {
      return { type: 'frequency', level: 'tooFrequent', ...riskRules.frequencyRisk.tooFrequent };
    }

    return { type: 'frequency', level: 'normal', ...riskRules.frequencyRisk.normal };
  };

  // 查找相似案例
  const findSimilarCases = (application) => {
    return historicalData.value.filter(item => {
      const amountSimilar = Math.abs(item.amount - application.amount) <= application.amount * 0.3;
      const categorySame = item.category === application.category;
      const applicantSame = item.applicant === application.applicant;

      return amountSimilar && (categorySame || applicantSame);
    }).slice(0, 5); // 返回最多5个相似案例
  };

  // 分析相似案例
  const analyzeSimilarCases = (similarCases) => {
    if (similarCases.length === 0) {
      return {
        approvalRate: 0,
        averageApprovalTime: 0,
        commonRiskFactors: [],
        recommendation: '无历史相似案例参考'
      };
    }

    const approvedCases = similarCases.filter(case_ => case_.approved);
    const approvalRate = (approvedCases.length / similarCases.length) * 100;
    const averageApprovalTime = approvedCases.reduce((sum, case_) => sum + case_.approvalTime, 0) / approvedCases.length;

    // 统计常见风险因素
    const riskFactorCounts = {};
    similarCases.forEach(case_ => {
      case_.riskFactors?.forEach(factor => {
        riskFactorCounts[factor] = (riskFactorCounts[factor] || 0) + 1;
      });
    });

    const commonRiskFactors = Object.entries(riskFactorCounts)
      .filter(([factor, count]) => count >= 2)
      .map(([factor, count]) => ({ factor, frequency: count }));

    return {
      approvalRate: Math.round(approvalRate),
      averageApprovalTime: Math.round(averageApprovalTime * 10) / 10,
      commonRiskFactors,
      recommendation: generateHistoricalRecommendation(approvalRate, averageApprovalTime)
    };
  };

  // 生成历史案例建议
  const generateHistoricalRecommendation = (approvalRate, averageTime) => {
    if (approvalRate >= 90) {
      return `历史相似案例通过率${approvalRate}%，建议快速审批`;
    } else if (approvalRate >= 70) {
      return `历史相似案例通过率${approvalRate}%，常规审核即可`;
    } else if (approvalRate >= 50) {
      return `历史相似案例通过率${approvalRate}%，建议仔细审核`;
    } else {
      return `历史相似案例通过率${approvalRate}%，建议谨慎审批`;
    }
  };

  // 生成最终建议
  const generateFinalRecommendation = (riskScore, riskFactors, historicalInsight, urgency) => {
    let action, priority, reason, confidence;

    if (riskScore <= 30) {
      action = 'auto_approve';
      priority = 'low';
      reason = '风险评分较低，建议自动通过';
      confidence = 85;
    } else if (riskScore <= 50) {
      action = 'fast_approve';
      priority = 'medium';
      reason = '风险评分适中，可快速审批';
      confidence = 75;
    } else if (riskScore <= 70) {
      action = 'careful_review';
      priority = 'high';
      reason = '风险评分较高，需要仔细审核';
      confidence = 65;
    } else {
      action = 'detailed_review';
      priority = 'very_high';
      reason = '风险评分很高，需要详细审核';
      confidence = 55;
    }

    // 考虑紧急程度
    if (urgency === 'urgent' && riskScore <= 60) {
      priority = 'urgent';
      reason += '，但考虑到紧急程度，建议优先处理';
    }

    return {
      action,
      priority,
      reason,
      confidence,
      estimatedTime: estimateApprovalTime(riskScore, 0)
    };
  };

  // 估算审批时间
  const estimateApprovalTime = (riskScore, amount) => {
    let baseTime = 1; // 基础时间1小时

    if (riskScore > 70) baseTime = 4;
    else if (riskScore > 50) baseTime = 2;
    else if (riskScore > 30) baseTime = 1;
    else baseTime = 0.5;

    // 金额影响
    if (amount > 50000) baseTime *= 2;
    else if (amount > 20000) baseTime *= 1.5;

    return Math.round(baseTime * 10) / 10;
  };

  // 获取所需审批人员级别
  const getRequiredApprovers = (riskScore, amount) => {
    if (amount > 50000 || riskScore > 80) {
      return ['村支书', '村主任', '财务主管'];
    } else if (amount > 20000 || riskScore > 60) {
      return ['村主任', '财务主管'];
    } else if (amount > 5000 || riskScore > 40) {
      return ['财务主管'];
    } else {
      return ['值班人员'];
    }
  };

  // 生成风险等级
  const getRiskLevel = (score) => {
    if (score <= 30) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 70) return 'high';
    return 'very_high';
  };

  // 生成警告信息
  const generateWarnings = (riskFactors) => {
    const warnings = [];

    riskFactors.forEach(factor => {
      if (factor.score >= 60) {
        warnings.push({
          level: 'error',
          message: factor.message,
          suggestion: getWarningActionSuggestion(factor.type)
        });
      } else if (factor.score >= 40) {
        warnings.push({
          level: 'warning',
          message: factor.message,
          suggestion: getWarningActionSuggestion(factor.type)
        });
      }
    });

    return warnings;
  };

  // 获取警告处理建议
  const getWarningActionSuggestion = (type) => {
    const suggestions = {
      amount: '建议核实支出必要性和预算情况',
      credit: '建议查看申请人历史记录',
      category: '建议核实该类别支出的合规性',
      time: '建议确认支出时间的合理性',
      frequency: '建议核实是否存在重复申请'
    };
    return suggestions[type] || '建议进一步核实';
  };

  // 生成后续步骤
  const generateNextSteps = (action) => {
    const steps = {
      auto_approve: [
        '系统自动审批通过',
        '通知申请人',
        '记录审批日志'
      ],
      fast_approve: [
        '值班人员快速审核',
        '确认基本信息无误',
        '批准并通知申请人'
      ],
      careful_review: [
        '主管部门仔细审核',
        '核实相关材料',
        '必要时进行实地核查',
        '做出审批决定'
      ],
      detailed_review: [
        '多级审批流程',
        '详细核实所有材料',
        '召开审批会议讨论',
        '谨慎做出最终决定'
      ]
    };
    return steps[action] || ['按标准流程审批'];
  };

  return {
    calculateApprovalSuggestion,
    historicalData,
    riskRules
  };
}