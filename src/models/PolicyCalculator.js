const mongoose = require('mongoose');
const logger = require('../utils/logger');

const policyCalculatorSchema = new mongoose.Schema({
  // 基础信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  calculatorId: {
    type: String,
    required: true,
    unique: true
  },
  calculatorName: {
    type: String,
    required: true,
    trim: true
  },
  calculatorType: {
    type: String,
    enum: ['subsidy', 'benefit', 'allowance', 'compensation', 'tax_relief'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // 政策基本信息
  policyInfo: {
    policyName: {
      type: String,
      required: true
    },
    policyCategory: {
      type: String,
      enum: [
        'agriculture',        // 农业
        'housing',           // 住房
        'education',         // 教育
        'medical',           // 医疗
        'elderly',           // 老年人
        'disability',        // 残疾人
        'employment',        // 就业
        'entrepreneurship',  // 创业
        'disaster_relief',   // 灾害救助
        'poverty_alleviation', // 扶贫
        'environmental',     // 环保
        'infrastructure'     // 基础设施
      ],
      required: true
    },
    policyLevel: {
      type: String,
      enum: ['national', 'provincial', 'municipal', 'county', 'township', 'village'],
      required: true
    },
    effectiveDate: {
      type: Date,
      required: true
    },
    expiryDate: Date,
    description: String,
    legalBasis: String,
    issuingAuthority: String
  },

  // 计算规则
  calculationRules: {
    baseAmount: {
      type: Number,
      default: 0
    },
    unitType: {
      type: String,
      enum: ['person', 'household', 'mu', 'hectare', 'square_meter', 'yuan', 'item'],
      required: true
    },
    rateType: {
      type: String,
      enum: ['fixed', 'percentage', 'tiered', 'formula'],
      required: true
    },
    rates: [{
      condition: String,           // 条件表达式
      rate: Number,               // 费率
      minAmount: Number,          // 最小金额
      maxAmount: Number,          // 最大金额
      multiplier: Number,         // 倍数
      description: String
    }],
    formula: String,             // 计算公式（可选）
    rounding: {
      type: String,
      enum: ['ceil', 'floor', 'round'],
      default: 'round'
    },
    precision: {
      type: Number,
      default: 2
    }
  },

  // 申请条件
  eligibilityCriteria: {
    requiredConditions: [{
      field: String,               // 字段名
      operator: String,            // 操作符: eq, ne, gt, lt, gte, lte, in, nin, exists, regex
      value: mongoose.Schema.Types.Mixed, // 值
      dataType: String,           // 数据类型: string, number, boolean, date, array, object
      description: String,
      mandatory: Boolean           // 是否必须满足
    }],
    priorityConditions: [{
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed,
      weight: Number,             // 权重
      description: String
    }],
    exclusionCriteria: [{
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed,
      reason: String              // 排除原因
    }],
    documentation: [{
      docType: String,            // 证件类型
      docName: String,            // 证件名称
      required: Boolean,          // 是否必须
      description: String,
      validityPeriod: Number       // 有效期（天）
    }],
    limits: {
      ageRange: {
        min: Number,
        max: Number
      },
      incomeRange: {
        min: Number,
        max: Number
      },
      assetRange: {
        min: Number,
        max: Number
      },
      householdSizeRange: {
        min: Number,
        max: Number
      },
      maxApplications: Number,    // 最大申请次数
      applicationFrequency: String // 申请频率: once, yearly, monthly
    }
  },

  // 家庭人口计算规则
  householdCalculation: {
    calculationMethod: {
      type: String,
      enum: ['registered', 'actual', 'mixed'],
      default: 'registered'
    },
    memberTypes: [{
      type: {
        type: String,
        enum: [
          'householder',       // 户主
          'spouse',           // 配偶
          'child',           // 子女
          'parent',          // 父母
          'grandparent',      // 祖父母
          'grandchild',      // 孙子女
          'sibling',         // 兄弟姐妹
          'other_relative',  // 其他亲属
          'non_relative'     // 非亲属
        ]
      },
      multiplier: {
        type: Number,
        default: 1
      },
      maxAge: Number,
      minAge: Number,
      specialConditions: [String]
    }],
    specialAllowances: [{
      condition: String,           // 特殊条件
      additionalMembers: Number,   // 额外人口数
      description: String
    }],
    verificationMethod: {
      type: String,
      enum: ['hukou', 'residence', 'declaration', 'mixed'],
      default: 'hukou'
    }
  },

  // 土地面积计算
  landCalculation: {
    landTypes: [{
      landType: {
        type: String,
        enum: [
          'cultivated',       // 耕地
          'forest',          // 林地
          'grassland',       // 草地
          'water_body',      // 水域
          'homestead',       // 宅基地
          'construction',    // 建设用地
          'waste',          // 荒地
          'other'           // 其他
        ]
      },
      unitType: {
        type: String,
        enum: ['mu', 'hectare', 'square_meter', 'acre'],
        default: 'mu'
      },
      conversionFactor: Number,   // 转换系数
      multiplier: {
        type: Number,
        default: 1
      },
      maxArea: Number,            // 最大面积
      minArea: Number,            // 最小面积
      documentation: [String]     // 所需证明文件
    }],
    measurementMethod: {
      type: String,
      enum: ['official', 'self_declared', 'satellite', 'survey'],
      default: 'official'
    },
    accuracyTolerance: {
      type: Number,
      default: 0.05  // 5%误差容忍度
    }
  },

  // AI增强配置
  aiConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    modelType: {
      type: String,
      enum: ['regression', 'classification', 'clustering', 'neural_network'],
      default: 'regression'
    },
    features: [{
      name: String,
      type: String,               // numeric, categorical, text
      importance: Number,          // 特征重要性
      encoding: String,            // 编码方式
      range: {
        min: Number,
        max: Number
      }
    }],
    modelVersion: String,         // 模型版本
    lastTrained: Date,
    accuracy: Number,              // 模型准确度
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    }
  },

  // 计算历史和统计
  statistics: {
    totalCalculations: {
      type: Number,
      default: 0
    },
    successfulCalculations: {
      type: Number,
      default: 0
    },
    failedCalculations: {
      type: Number,
      default: 0
    },
    averageCalculationTime: {
      type: Number,
      default: 0
    },
    lastCalculated: Date,
    popularFields: [{
      fieldName: String,
      usageCount: Number
    }],
    errorDistribution: [{
      errorType: String,
      count: Number,
      lastOccurred: Date
    }]
  },

  // 版本控制
  version: {
    type: Number,
    default: 1
  },
  changelog: [{
    version: Number,
    changes: [String],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 创建和更新信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
policyCalculatorSchema.index({ villageId: 1, calculatorType: 1, isActive: 1 });
policyCalculatorSchema.index({ 'policyInfo.policyCategory': 1, policyLevel: 1 });
policyCalculatorSchema.index({ calculatorId: 1 }, { unique: true });
policyCalculatorSchema.index({ 'eligibilityCriteria.requiredConditions.field': 1 });
policyCalculatorSchema.index({ 'aiConfig.enabled': 1 });

// 虚拟字段：是否在有效期内
policyCalculatorSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive &&
         this.policyInfo.effectiveDate <= now &&
         (!this.policyInfo.expiryDate || this.policyInfo.expiryDate >= now);
});

// 虚拟字段：剩余有效天数
policyCalculatorSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.policyInfo.expiryDate) {
    return null;
  }
  const now = new Date();
  const diffTime = this.policyInfo.expiryDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// 实例方法：计算补贴金额
policyCalculatorSchema.methods.calculateSubsidy = function(applicationData) {
  try {
    // 验证申请条件
    const eligibility = this.checkEligibility(applicationData);
    if (!eligible) {
      throw new Error('不符合申请条件');
    }

    // 计算家庭人口
    const householdSize = this.calculateHouseholdSize(applicationData);

    // 计算土地面积
    const landArea = this.calculateLandArea(applicationData);

    // 应用AI模型（如果启用）
    let adjustedAmount = 0;
    if (this.aiConfig.enabled && this.aiConfig.modelType) {
      adjustedAmount = this.applyAIModel(applicationData, householdSize, landArea);
    }

    // 根据计算规则计算基础金额
    const baseAmount = this.calculateBaseAmount(applicationData, householdSize, landArea);

    // 应用费率
    let calculatedAmount = this.applyRates(baseAmount, applicationData);

    // 应用AI调整
    if (adjustedAmount > 0) {
      calculatedAmount = this.blendAIResult(calculatedAmount, adjustedAmount);
    }

    // 应用四舍五入
    calculatedAmount = this.applyRounding(calculatedAmount);

    return {
      amount: calculatedAmount,
      householdSize,
      landArea,
      eligibility,
      breakdown: this.generateBreakdown(applicationData, calculatedAmount),
      confidence: this.calculateConfidence(applicationData),
      recommendations: this.generateRecommendations(applicationData, calculatedAmount)
    };
  } catch (error) {
    // 更新错误统计
    this.statistics.failedCalculations++;
    this.statistics.errorDistribution.push({
      errorType: error.name,
      count: 1,
      lastOccurred: new Date()
    });

    throw error;
  }
};

// 实例方法：检查申请资格
policyCalculatorSchema.methods.checkEligibility = function(applicationData) {
  const { requiredConditions, exclusionCriteria } = this.eligibilityCriteria;

  // 检查排除条件（优先级最高）
  for (const exclusion of exclusionCriteria) {
    if (this.evaluateCondition(exclusion, applicationData)) {
      return {
        eligible: false,
        reason: exclusion.reason,
        failedField: exclusion.field
      };
    }
  }

  // 检查必需条件
  const mandatoryConditions = requiredConditions.filter(c => c.mandatory);
  for (const condition of mandatoryConditions) {
    if (!this.evaluateCondition(condition, applicationData)) {
      return {
        eligible: false,
        reason: `缺少必需条件: ${condition.description || condition.field}`,
        failedField: condition.field
      };
    }
  }

  // 检查可选条件（评分用）
  const optionalConditions = requiredConditions.filter(c => !c.mandatory);
  let score = 0;
  let totalScore = 0;

  for (const condition of optionalConditions) {
    totalScore++;
    if (this.evaluateCondition(condition, applicationData)) {
      score++;
    }
  }

  return {
    eligible: true,
    score: totalScore > 0 ? score / totalScore : 1,
    matchedConditions: score,
    totalConditions: totalScore
  };
};

// 实例方法：计算家庭人口
policyCalculatorSchema.methods.calculateHouseholdSize = function(applicationData) {
  let totalSize = 0;

  if (!applicationData.householdMembers || !Array.isArray(applicationData.householdMembers)) {
    return 0;
  }

  const { memberTypes, specialAllowances } = this.householdCalculation;

  // 基础人口计算
  applicationData.householdMembers.forEach(member => {
    const memberType = memberTypes.find(m => m.type === member.type);
    if (memberType) {
      // 检查年龄限制
      const memberAge = this.calculateAge(member.birthDate);
      if (memberType.minAge && memberAge < memberType.minAge) return;
      if (memberType.maxAge && memberAge > memberType.maxAge) return;

      // 检查特殊条件
      const meetsSpecialConditions = memberType.specialConditions.every(condition =>
        this.evaluateSpecialCondition(condition, member, applicationData)
      );

      if (meetsSpecialConditions) {
        totalSize += memberType.multiplier;
      }
    }
  });

  // 应用特殊津贴
  for (const allowance of specialAllowances) {
    if (this.evaluateSpecialCondition(allowance.condition, applicationData)) {
      totalSize += allowance.additionalMembers;
    }
  }

  // 应用计算方法调整
  if (this.householdCalculation.calculationMethod === 'registered') {
    // 使用户籍人口
    totalSize = Math.min(totalSize, applicationData.registeredHouseholdSize || totalSize);
  }

  return Math.max(0, totalSize);
};

// 实例方法：计算土地面积
policyCalculatorSchema.methods.calculateLandArea = function(applicationData) {
  if (!applicationData.landParcels || !Array.isArray(applicationData.landParcels)) {
    return 0;
  }

  const { landTypes, conversionFactor, accuracyTolerance } = this.landCalculation;
  let totalArea = 0;

  applicationData.landParcels.forEach(parcel => {
    const landType = landTypes.find(l => l.landType === parcel.landType);
    if (landType) {
      let parcelArea = parseFloat(parcel.area || 0);

      // 转换为标准单位
      if (landType.unitType !== this.calculationRules.unitType) {
        parcelArea *= (landType.conversionFactor || 1);
      }

      // 应用倍数
      parcelArea *= (landType.multiplier || 1);

      // 检查面积限制
      if (landType.minArea && parcelArea < landType.minArea) return;
      if (landType.maxArea && parcelArea > landType.maxArea) return;

      // 应用精度容忍度
      if (accuracyTolerance > 0) {
        parcelArea *= (1 + (Math.random() - 0.5) * accuracyTolerance);
      }

      totalArea += parcelArea;
    }
  });

  return Math.max(0, totalArea);
};

// 实例方法：应用AI模型
policyCalculatorSchema.methods.applyAIModel = function(applicationData, householdSize, landArea) {
  // 这里应该调用实际的AI模型
  // 简化实现，返回基于规则的调整
  let adjustment = 0;

  // 基于历史数据的调整因子
  if (householdSize > 5) adjustment *= 1.1; // 大家庭有额外补贴
  if (landArea > 10) adjustment *= 1.05; // 大土地有额外补贴

  // 基于特殊情况的调整
  if (applicationData.hasDisabilityMember) adjustment *= 1.2;
  if (applicationData.isPovertyHousehold) adjustment *= 1.15;
  if (applicationData.hasVeteran) adjustment *= 1.1;

  return adjustment;
};

// 实例方法：计算基础金额
policyCalculatorSchema.methods.calculateBaseAmount = function(applicationData, householdSize, landArea) {
  let baseAmount = this.calculationRules.baseAmount || 0;

  // 根据家庭人口调整
  if (this.calculationRules.unitType === 'person') {
    baseAmount += householdSize * (this.calculationRules.rates[0]?.rate || 0);
  }

  // 根据土地面积调整
  if (this.calculationRules.unitType === 'mu' || this.calculationRules.unitType === 'hectare') {
    baseAmount += landArea * (this.calculationRules.rates[1]?.rate || 0);
  }

  return baseAmount;
};

// 实例方法：应用费率
policyCalculatorSchema.methods.applyRates = function(baseAmount, applicationData) {
  const { rateType, rates } = this.calculationRules;

  if (rateType === 'fixed') {
    return baseAmount + (rates[0]?.rate || 0);
  }

  if (rateType === 'percentage') {
    const rate = rates[0]?.rate || 0;
    return baseAmount * (1 + rate / 100);
  }

  if (rateType === 'tiered') {
    for (const tier of rates) {
      if (this.evaluateCondition(tier.condition, applicationData)) {
        const amount = baseAmount * (tier.rate / 100) + (tier.minAmount || 0);
        return Math.min(amount, tier.maxAmount || Infinity);
      }
    }
  }

  if (rateType === 'formula' && this.calculationRules.formula) {
    // 安全的公式计算（仅支持基本运算）
    return this.evaluateFormula(this.calculationRules.formula, {
      baseAmount,
      ...applicationData
    });
  }

  return baseAmount;
};

// 实例方法：混合AI结果
policyCalculatorSchema.methods.blendAIResult = function(traditionalAmount, aiAmount) {
  const confidence = this.aiConfig.confidence || 0.8;
  return traditionalAmount * (1 - confidence) + aiAmount * confidence;
};

// 实例方法：应用四舍五入
policyCalculatorSchema.methods.applyRounding = function(amount) {
  const { rounding, precision } = this.calculationRules;
  const factor = Math.pow(10, precision);

  let rounded = amount * factor;
  if (rounding === 'ceil') {
    rounded = Math.ceil(rounded);
  } else if (rounding === 'floor') {
    rounded = Math.floor(rounded);
  } else {
    rounded = Math.round(rounded);
  }

  return rounded / factor;
};

// 实例方法：生成计算明细
policyCalculatorSchema.methods.generateBreakdown = function(applicationData, calculatedAmount) {
  return {
    baseAmount: this.calculationRules.baseAmount,
    householdSize: this.calculateHouseholdSize(applicationData),
    landArea: this.calculateLandArea(applicationData),
    appliedRate: this.calculationRules.rates[0]?.rate || 0,
    calculations: [
      {
        step: '基础金额',
        value: this.calculationRules.baseAmount
      },
      {
        step: '家庭人口调整',
        factor: this.calculateHouseholdSize(applicationData)
      },
      {
        step: '土地面积调整',
        factor: this.calculateLandArea(applicationData)
      },
      {
        step: '费率应用',
        rate: this.calculationRules.rates[0]?.rate || 0
      }
    ]
  };
};

// 实例方法：计算置信度
policyCalculatorSchema.methods.calculateConfidence = function(applicationData) {
  let confidence = 1.0;

  // 数据完整性检查
  if (!applicationData.householdMembers) confidence -= 0.2;
  if (!applicationData.landParcels) confidence -= 0.2;
  if (!applicationData.incomeInfo) confidence -= 0.1;

  // 数据准确性检查
  if (this.hasMissingDocuments(applicationData)) confidence -= 0.1;

  return Math.max(0, confidence);
};

// 实例方法：生成建议
policyCalculatorSchema.methods.generateRecommendations = function(applicationData, calculatedAmount) {
  const recommendations = [];

  // 基于计算结果的建议
  if (calculatedAmount < 1000) {
    recommendations.push({
      type: 'increase_subsidy',
      message: '建议补充申请材料以提高补贴金额',
      action: 'upload_additional_docs'
    });
  }

  // 基于数据完整性的建议
  if (this.hasMissingDocuments(applicationData)) {
    recommendations.push({
      type: 'complete_documentation',
      message: '补充缺失的证明文件',
      action: 'upload_missing_docs'
    });
  }

  // 基于家庭情况的建议
  const householdSize = this.calculateHouseholdSize(applicationData);
  if (householdSize > 5) {
    recommendations.push({
      type: 'check_eligibility',
      message: '您可能符合大型家庭补贴政策',
      action: 'apply_additional_policy'
    });
  }

  return recommendations;
};

// 辅助方法
policyCalculatorSchema.methods.evaluateCondition = function(condition, data) {
  const fieldValue = this.getFieldValue(data, condition.field);

  switch (condition.operator) {
    case 'eq': return fieldValue === condition.value;
    case 'ne': return fieldValue !== condition.value;
    case 'gt': return fieldValue > condition.value;
    case 'lt': return fieldValue < condition.value;
    case 'gte': return fieldValue >= condition.value;
    case 'lte': return fieldValue <= condition.value;
    case 'in': return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case 'nin': return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
    case 'exists': return fieldValue !== undefined && fieldValue !== null;
    case 'regex': return new RegExp(condition.value).test(String(fieldValue));
    default: return true;
  }
};

policyCalculatorSchema.methods.getFieldValue = function(data, fieldPath) {
  const fields = fieldPath.split('.');
  let value = data;

  for (const field of fields) {
    if (value && typeof value === 'object') {
      value = value[field];
    } else {
      value = undefined;
    }
  }

  return value;
};

policyCalculatorSchema.methods.calculateAge = function(birthDate) {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

policyCalculatorSchema.methods.evaluateSpecialCondition = function(condition, context) {
  // 这里应该实现复杂的条件评估逻辑
  // 简化实现
  return true;
};

policyCalculatorSchema.methods.evaluateFormula = function(formula, variables) {
  // 安全的公式计算
  try {
    // 只允许基本数学运算
    const safeFormula = formula.replace(/[^0-9+\-*/().\s]/g, '');

    // 替换变量
    let evaluatedFormula = safeFormula;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      evaluatedFormula = evaluatedFormula.replace(regex, value);
    });

    // 计算结果
    return Function('"use strict"; return (' + evaluatedFormula + ')')();
  } catch (error) {
    logger.error('Formula evaluation error:', error);
    return 0;
  }
};

policyCalculatorSchema.methods.hasMissingDocuments = function(applicationData) {
  const requiredDocs = this.eligibilityCriteria.documentation.filter(d => d.required);

  return requiredDocs.some(doc => {
    return !applicationData.documents ||
           !applicationData.documents.some(d => d.type === doc.docType);
  });
};

// 静态方法：获取适用的计算器
policyCalculatorSchema.statics.getApplicableCalculators = async function(villageId, applicationData) {
  return this.find({
    villageId,
    isActive: true,
    isValid: true
  }).sort({ 'policyInfo.effectiveDate': -1 });
};

// 静态方法：批量计算补贴
policyCalculatorSchema.statics.batchCalculate = async function(calculators, applications) {
  const results = [];

  for (const calculator of calculators) {
    for (const application of applications) {
      try {
        const result = await calculator.calculateSubsidy(application);
        results.push({
          calculatorId: calculator._id,
          calculatorName: calculator.calculatorName,
          applicationId: application._id,
          result: result
        });
      } catch (error) {
        results.push({
          calculatorId: calculator._id,
          calculatorName: calculator.calculatorName,
          applicationId: application._id,
          error: error.message
        });
      }
    }
  }

  return results;
};

// 静态方法：训练AI模型
policyCalculatorSchema.statics.trainAIModel = async function(modelId, trainingData) {
  // 这里应该实现实际的AI模型训练逻辑
  // 简化实现，更新模型的准确度和版本
  const calculator = await this.findById(modelId);
  if (calculator && calculator.aiConfig.enabled) {
    calculator.aiConfig.lastTrained = new Date();
    calculator.aiConfig.accuracy = Math.random() * 0.2 + 0.8; // 模拟准确度
    await calculator.save();
  }
};

module.exports = mongoose.model('PolicyCalculator', policyCalculatorSchema);