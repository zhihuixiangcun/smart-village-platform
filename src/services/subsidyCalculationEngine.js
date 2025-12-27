const householdCalculationEngine = require('./householdCalculationEngine');
const landAreaCalculationEngine = require('./landAreaCalculationEngine');
const logger = require('../utils/logger');

/**
 * 补贴金额自动计算引擎
 * 整合人口、土地、政策规则等多维度计算
 */

class SubsidyCalculationEngine {
  constructor() {
    // 计算规则类型
    this.calculationTypes = {
      FIXED: 'fixed',               // 固定金额
      PERCAPITA: 'per_capita',      // 按人头计算
      PER_AREA: 'per_area',         // 按面积计算
      TIERED: 'tiered',             // 分级计算
      FORMULA: 'formula',           // 公式计算
      HYBRID: 'hybrid'              // 混合计算
    };

    // 分级计算规则
    this.tierRules = {
      household_size: {
        tiers: [
          { min: 1, max: 2, rate: 1.0 },
          { min: 3, max: 4, rate: 1.2 },
          { min: 5, max: 6, rate: 1.5 },
          { min: 7, max: null, rate: 2.0 }
        ]
      },
      land_area: {
        tiers: [
          { min: 0, max: 10, rate: 1.0 },
          { min: 10, max: 30, rate: 0.9 },
          { min: 30, max: 50, rate: 0.8 },
          { min: 50, max: null, rate: 0.7 }
        ]
      },
      income_level: {
        tiers: [
          { min: 0, max: 20000, rate: 1.5 },      // 低收入
          { min: 20000, max: 50000, rate: 1.2 }, // 中低收入
          { min: 50000, max: 100000, rate: 1.0 }, // 中等收入
          { min: 100000, max: null, rate: 0.8 }  // 高收入
        ]
      }
    };

    // 特殊群体加成
    this.specialGroupBonuses = {
      poverty_household: { name: '低保户', bonus: 0.3 },
      disabled_person: { name: '残疾人', bonus: 0.2 },
      elderly_over_80: { name: '80岁以上老人', bonus: 0.15 },
      single_parent: { name: '单亲家庭', bonus: 0.1 },
      veteran: { name: '退役军人', bonus: 0.1 },
      party_member: { name: '党员', bonus: 0.05 }
    };

    // 地区调整系数
    this.regionalAdjustments = {
      developed: { name: '发达地区', coefficient: 0.8 },
      developing: { name: '发展中地区', coefficient: 1.0 },
      underdeveloped: { name: '欠发达地区', coefficient: 1.2 },
      remote: { name: '偏远地区', coefficient: 1.3 },
      poverty_stricken: { name: '贫困地区', coefficient: 1.5 }
    };

    // 时间调整系数（根据申请时间）
    this.temporalAdjustments = {
      early_application: { threshold: 30, bonus: 0.1 },    // 提前申请
      on_time: { threshold: 0, bonus: 0 },                  // 按时申请
      late_application: { threshold: -30, penalty: 0.1 }   // 延迟申请
    };

    // 计算公式模板
    this.formulaTemplates = {
      basic_formula: 'base_amount * household_multiplier * area_multiplier * adjustment_coefficient',
      progressive_formula: 'base_amount + (household_size - 1) * per_person_increment + (land_area - 1) * per_area_increment',
      composite_formula: '(base_amount * household_size) + (area_bonus * land_area) + special_adjustments',
      conditional_formula: 'IF(household_size > 4, base_amount * 1.5, base_amount) * area_factor',
      dynamic_formula: 'base_amount * pow(household_size, 0.7) * pow(land_area, 0.5) * regional_factor'
    };
  }

  /**
   * 计算补贴金额
   * @param {Object} policyData 政策数据
   * @param {Object} applicationData 申请数据
   * @param {Object} options 计算选项
   * @returns {Object} 计算结果
   */
  async calculateSubsidy(policyData, applicationData, options = {}) {
    const {
      enableAIEnhancement = false,
      includeDetailedBreakdown = true,
      applyHistoricalData = false,
      customParameters = {}
    } = options;

    const result = {
      baseAmount: 0,
      calculatedAmount: 0,
      finalAmount: 0,
      breakdown: {
        components: [],
        adjustments: [],
        bonuses: [],
        deductions: []
      },
      factors: {
        household: {},
        land: {},
        policy: {},
        regional: {},
        temporal: {},
        special: {}
      },
      calculations: {
        method: policyData.calculationRules?.calculationType || 'fixed',
        formula: '',
        steps: [],
        confidence: 1.0
      },
      eligibility: {
        isEligible: false,
        score: 0,
        failedCriteria: []
      },
      metadata: {
        calculationTime: new Date(),
        version: '1.0.0',
        parameters: options
      }
    };

    try {
      // 1. 资格检查
      result.eligibility = this.checkEligibility(policyData, applicationData);
      if (!result.eligibility.isEligible) {
        return {
          success: false,
          reason: '不符合申请条件',
          failedCriteria: result.eligibility.failedCriteria,
          data: result
        };
      }

      // 2. 计算家庭人口
      if (this.requiresHouseholdCalculation(policyData)) {
        result.factors.household = await this.calculateHouseholdFactors(policyData, applicationData);
      }

      // 3. 计算土地面积
      if (this.requiresLandCalculation(policyData)) {
        result.factors.land = await this.calculateLandFactors(policyData, applicationData);
      }

      // 4. 计算基础金额
      result.baseAmount = this.calculateBaseAmount(policyData, result.factors);

      // 5. 应用计算规则
      result.calculatedAmount = this.applyCalculationRules(
        policyData,
        result.baseAmount,
        result.factors
      );

      // 6. 应用调整系数
      result.breakdown.adjustments = this.calculateAdjustments(
        policyData,
        applicationData,
        result.calculatedAmount,
        result.factors
      );

      result.adjustedAmount = result.breakdown.adjustments.reduce(
        (total, adj) => total + adj.amount,
        result.calculatedAmount
      );

      // 7. 应用特殊群体加成
      result.breakdown.bonuses = this.calculateSpecialBonuses(applicationData, result.adjustedAmount);

      result.bonusAmount = result.breakdown.bonuses.reduce(
        (total, bonus) => total + bonus.amount,
        0
      );

      result.amountBeforeDeductions = result.adjustedAmount + result.bonusAmount;

      // 8. 应用扣减项
      result.breakdown.deductions = this.calculateDeductions(
        policyData,
        applicationData,
        result.amountBeforeDeductions
      );

      // 9. 计算最终金额
      result.finalAmount = Math.max(0, result.amountBeforeDeductions -
        result.breakdown.deductions.reduce((total, ded) => total + ded.amount, 0));

      // 10. AI增强（如果启用）
      if (enableAIEnhancement) {
        result.aiEnhancement = await this.applyAIEnhancement(
          policyData,
          applicationData,
          result
        );

        if (result.aiEnhancement.adjustment) {
          result.finalAmount = result.aiEnhancement.adjustedAmount || result.finalAmount;
        }
      }

      // 11. 生成详细分解
      if (includeDetailedBreakdown) {
        result.breakdown.components = this.generateDetailedBreakdown(result);
        result.calculations.steps = this.generateCalculationSteps(policyData, result);
      }

      // 12. 计算置信度
      result.calculations.confidence = this.calculateConfidence(
        policyData,
        applicationData,
        result
      );

      // 13. 格式化结果
      result.finalAmount = parseFloat(result.finalAmount.toFixed(2));

      return {
        success: true,
        data: result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: result
      };
    }
  }

  /**
   * 检查申请资格
   */
  checkEligibility(policyData, applicationData) {
    const eligibility = {
      isEligible: true,
      score: 0,
      failedCriteria: [],
      passedCriteria: []
    };

    const criteria = policyData.eligibilityCriteria;
    if (!criteria) {
      return eligibility;
    }

    const { applicantInfo, householdInfo, landInfo } = applicationData;

    // 年龄检查
    if (criteria.minAge || criteria.maxAge) {
      const age = this.calculateAge(applicantInfo.birthDate);
      if (criteria.minAge && age < criteria.minAge) {
        eligibility.failedCriteria.push({
          field: 'age',
          rule: 'minAge',
          expected: criteria.minAge,
          actual: age,
          message: `申请人年龄${age}岁小于最低要求${criteria.minAge}岁`
        });
        eligibility.isEligible = false;
      } else {
        eligibility.passedCriteria.push('age');
      }

      if (criteria.maxAge && age > criteria.maxAge) {
        eligibility.failedCriteria.push({
          field: 'age',
          rule: 'maxAge',
          expected: criteria.maxAge,
          actual: age,
          message: `申请人年龄${age}岁超过最大限制${criteria.maxAge}岁`
        });
        eligibility.isEligible = false;
      }
    }

    // 家庭人口检查
    if (criteria.requirements) {
      criteria.requirements.forEach(req => {
        if (req.field === 'householdSize') {
          const householdSize = householdInfo?.registeredHouseholdSize || 0;
          if (req.minValue && householdSize < req.minValue) {
            eligibility.failedCriteria.push({
              field: 'householdSize',
              rule: 'minValue',
              expected: req.minValue,
              actual: householdSize,
              message: `家庭人口${householdSize}人少于最低要求${req.minValue}人`
            });
            eligibility.isEligible = false;
          } else {
            eligibility.passedCriteria.push('householdSize');
          }
        }

        if (req.field === 'landArea') {
          const landArea = landInfo?.totalLandArea || 0;
          if (req.minValue && landArea < req.minValue) {
            eligibility.failedCriteria.push({
              field: 'landArea',
              rule: 'minValue',
              expected: req.minValue,
              actual: landArea,
              message: `土地面积${landArea}亩少于最低要求${req.minValue}亩`
            });
            eligibility.isEligible = false;
          } else {
            eligibility.passedCriteria.push('landArea');
          }
        }
      });
    }

    // 地区检查
    if (criteria.allowedRegions && criteria.allowedRegions.length > 0) {
      const region = applicationData.metadata?.region || applicationData.villageId;
      if (!criteria.allowedRegions.includes(region)) {
        eligibility.failedCriteria.push({
          field: 'region',
          rule: 'allowedRegions',
          expected: criteria.allowedRegions,
          actual: region,
          message: '申请地区不在政策覆盖范围内'
        });
        eligibility.isEligible = false;
      } else {
        eligibility.passedCriteria.push('region');
      }
    }

    // 收入检查
    if (criteria.maxIncome) {
      const annualIncome = applicantInfo?.annualIncome || 0;
      if (annualIncome > criteria.maxIncome) {
        eligibility.failedCriteria.push({
          field: 'income',
          rule: 'maxIncome',
          expected: criteria.maxIncome,
          actual: annualIncome,
          message: `家庭年收入${annualIncome}元超过最高限制${criteria.maxIncome}元`
        });
        eligibility.isEligible = false;
      } else {
        eligibility.passedCriteria.push('income');
      }
    }

    // 计算资格分数
    const totalCriteria = (criteria.requirements?.length || 0) +
                         (criteria.minAge ? 1 : 0) +
                         (criteria.maxAge ? 1 : 0) +
                         (criteria.allowedRegions?.length > 0 ? 1 : 0) +
                         (criteria.maxIncome ? 1 : 0);

    eligibility.score = eligibility.passedCriteria.length / Math.max(totalCriteria, 1);

    return eligibility;
  }

  /**
   * 判断是否需要家庭人口计算
   */
  requiresHouseholdCalculation(policyData) {
    const calcRules = policyData.calculationRules || {};
    return calcRules.calculationType === this.calculationTypes.PERCAPITA ||
           calcRules.calculationType === this.calculationTypes.TIERED ||
           calcRules.calculationType === this.calculationTypes.HYBRID ||
           calcRules.dependsOnHouseholdSize === true;
  }

  /**
   * 判断是否需要土地面积计算
   */
  requiresLandCalculation(policyData) {
    const calcRules = policyData.calculationRules || {};
    return calcRules.calculationType === this.calculationTypes.PER_AREA ||
           calcRules.calculationType === this.calculationTypes.HYBRID ||
           calcRules.dependsOnLandArea === true;
  }

  /**
   * 计算家庭人口因素
   */
  async calculateHouseholdFactors(policyData, applicationData) {
    const householdOptions = {
      method: 'mixed',
      includeSpecialWeights: true,
      verificationLevel: 'detailed'
    };

    const householdResult = householdCalculationEngine.calculateHouseholdSize(
      applicationData,
      householdOptions
    );

    if (!householdResult.success) {
      throw new Error(`家庭人口计算失败: ${householdResult.error}`);
    }

    const factors = {
      size: householdResult.data.weightedCount,
      breakdown: householdResult.data.breakdown,
      specialGroups: householdResult.data.specialGroups,
      calculationMethod: householdOptions.method,
      confidence: householdResult.data.calculationDetails.confidence
    };

    // 应用分级规则
    if (policyData.calculationRules?.calculationType === this.calculationTypes.TIERED) {
      factors.tierRate = this.getTierRate('household_size', factors.size);
    }

    return factors;
  }

  /**
   * 计算土地面积因素
   */
  async calculateLandFactors(policyData, applicationData) {
    const landOptions = {
      targetUnit: 'mu',
      includeIneligible: true,
      applyLandGrades: policyData.considersLandGrade === true,
      considerCropTypes: policyData.considersCropTypes === true
    };

    const landResult = landAreaCalculationEngine.calculateLandArea(
      applicationData.landInfo || {},
      landOptions
    );

    if (!landResult.success) {
      throw new Error(`土地面积计算失败: ${landResult.error}`);
    }

    const factors = {
      totalArea: landResult.data.totalArea,
      eligibleArea: landResult.data.eligibleArea,
      adjustedArea: landResult.data.adjustedArea,
      breakdown: landResult.data.breakdown,
      calculationMethod: 'standard',
      confidence: landResult.data.calculations.confidence
    };

    // 应用分级规则
    if (policyData.calculationRules?.calculationType === this.calculationTypes.TIERED) {
      factors.tierRate = this.getTierRate('land_area', factors.eligibleArea);
    }

    return factors;
  }

  /**
   * 获取分级费率
   */
  getTierRate(type, value) {
    const tiers = this.tierRules[type]?.tiers;
    if (!tiers) return 1.0;

    for (const tier of tiers) {
      if (value >= tier.min && (tier.max === null || value <= tier.max)) {
        return tier.rate;
      }
    }

    return 1.0;
  }

  /**
   * 计算基础金额
   */
  calculateBaseAmount(policyData, factors) {
    const calcRules = policyData.calculationRules || {};

    switch (calcRules.calculationType) {
    case this.calculationTypes.FIXED:
      return calcRules.baseAmount || 0;

    case this.calculationTypes.PERCAPITA:
      const perCapitaRate = calcRules.perCapitaRate || 0;
      const householdSize = factors.household?.size || 1;
      return perCapitaRate * householdSize;

    case this.calculationTypes.PER_AREA:
      const perAreaRate = calcRules.perAreaRate || 0;
      const landArea = factors.land?.eligibleArea || 0;
      return perAreaRate * landArea;

    case this.calculationTypes.HYBRID:
      const baseFixed = calcRules.baseAmount || 0;
      const perCapita = (calcRules.perCapitaRate || 0) * (factors.household?.size || 0);
      const perArea = (calcRules.perAreaRate || 0) * (factors.land?.eligibleArea || 0);
      return baseFixed + perCapita + perArea;

    default:
      return calcRules.baseAmount || 0;
    }
  }

  /**
   * 应用计算规则
   */
  applyCalculationRules(policyData, baseAmount, factors) {
    const calcRules = policyData.calculationRules || {};
    let calculatedAmount = baseAmount;

    // 应用分级费率
    if (calcRules.calculationType === this.calculationTypes.TIERED) {
      const householdRate = factors.household?.tierRate || 1.0;
      const landRate = factors.land?.tierRate || 1.0;

      // 综合费率（取较低者以避免过度补贴）
      const combinedRate = Math.min(householdRate, landRate);
      calculatedAmount *= combinedRate;
    }

    // 应用公式计算（如果有）
    if (calcRules.formula) {
      calculatedAmount = this.evaluateFormula(
        calcRules.formula,
        baseAmount,
        factors
      );
    }

    // 应用费率表
    if (policyData.calculationRates && policyData.calculationRates.length > 0) {
      calculatedAmount = this.applyRateTable(
        policyData.calculationRates,
        calculatedAmount,
        factors
      );
    }

    return calculatedAmount;
  }

  /**
   * 计算调整系数
   */
  calculateAdjustments(policyData, applicationData, amount, factors) {
    const adjustments = [];

    // 地区调整
    const regionType = this.determineRegionType(applicationData);
    const regionalFactor = this.regionalAdjustments[regionType]?.coefficient || 1.0;
    if (regionalFactor !== 1.0) {
      adjustments.push({
        type: 'regional',
        name: `${this.regionalAdjustments[regionType]?.name || '地区调整'}`,
        rate: regionalFactor,
        amount: amount * (regionalFactor - 1),
        description: `${regionType}地区系数调整`
      });
    }

    // 时间调整
    const temporalFactor = this.calculateTemporalFactor(applicationData);
    if (temporalFactor !== 1.0) {
      adjustments.push({
        type: 'temporal',
        name: '申请时间调整',
        rate: temporalFactor,
        amount: amount * (temporalFactor - 1),
        description: '基于申请时间的调整'
      });
    }

    return adjustments;
  }

  /**
   * 计算特殊群体加成
   */
  calculateSpecialBonuses(applicationData, amount) {
    const bonuses = [];
    const { applicantInfo, householdInfo } = applicationData;

    // 低保户加成
    if (applicantInfo.isPovertyHousehold) {
      const bonus = this.specialGroupBonuses.poverty_household;
      bonuses.push({
        type: 'special_group',
        name: bonus.name,
        rate: bonus.bonus,
        amount: amount * bonus.bonus,
        description: `低保户家庭加成${(bonus.bonus * 100).toFixed(1)}%`
      });
    }

    // 残疾人加成
    if (applicantInfo.hasDisability) {
      const bonus = this.specialGroupBonuses.disabled_person;
      bonuses.push({
        type: 'special_group',
        name: bonus.name,
        rate: bonus.bonus,
        amount: amount * bonus.bonus,
        description: `残疾人加成${(bonus.bonus * 100).toFixed(1)}%`
      });
    }

    // 老年人加成
    const age = this.calculateAge(applicantInfo.birthDate);
    if (age >= 80) {
      const bonus = this.specialGroupBonuses.elderly_over_80;
      bonuses.push({
        type: 'special_group',
        name: bonus.name,
        rate: bonus.bonus,
        amount: amount * bonus.bonus,
        description: `80岁以上老人加成${(bonus.bonus * 100).toFixed(1)}%`
      });
    }

    // 退役军人加成
    if (applicantInfo.isVeteran) {
      const bonus = this.specialGroupBonuses.veteran;
      bonuses.push({
        type: 'special_group',
        name: bonus.name,
        rate: bonus.bonus,
        amount: amount * bonus.bonus,
        description: `退役军人加成${(bonus.bonus * 100).toFixed(1)}%`
      });
    }

    return bonuses;
  }

  /**
   * 计算扣减项
   */
  calculateDeductions(policyData, applicationData, amount) {
    const deductions = [];

    // 超额部分扣减
    const maxAmount = policyData.maxAmount;
    if (maxAmount && amount > maxAmount) {
      deductions.push({
        type: 'excess',
        name: '超额扣减',
        amount: amount - maxAmount,
        description: `超过最高补贴限额${maxAmount}元`
      });
    }

    // 重复申请扣减
    if (applicationData.hasPreviousApplication === true) {
      const deductionRate = 0.2; // 重复申请扣减20%
      deductions.push({
        type: 'duplicate',
        name: '重复申请扣减',
        amount: amount * deductionRate,
        description: `重复申请扣减${(deductionRate * 100).toFixed(1)}%`
      });
    }

    return deductions;
  }

  /**
   * 应用AI增强
   */
  async applyAIEnhancement(policyData, applicationData, result) {
    // 模拟AI增强计算
    // 实际实现中应该调用真实的AI服务

    const enhancement = {
      applied: false,
      adjustment: 0,
      confidence: 0,
      factors: [],
      explanation: ''
    };

    try {
      // 模拟AI分析
      const aiFactors = [];

      // 分析申请历史
      if (applicationData.applicationHistory && applicationData.applicationHistory.length > 0) {
        const historyScore = this.analyzeApplicationHistory(applicationData.applicationHistory);
        aiFactors.push({
          name: '申请历史',
          score: historyScore,
          impact: historyScore > 0.8 ? 'positive' : 'neutral'
        });
      }

      // 分析地区发展水平
      const regionDevelopmentScore = this.analyzeRegionDevelopment(applicationData.metadata?.region);
      aiFactors.push({
        name: '地区发展水平',
        score: regionDevelopmentScore,
        impact: regionDevelopmentScore < 0.5 ? 'positive' : 'neutral'
      });

      // 分析特殊困难程度
      const hardshipScore = this.analyzeHardshipLevel(applicationData);
      aiFactors.push({
        name: '特殊困难程度',
        score: hardshipScore,
        impact: hardshipScore > 0.7 ? 'positive' : 'neutral'
      });

      // 计算AI调整系数
      let adjustmentFactor = 1.0;
      let hasPositiveAdjustment = false;

      aiFactors.forEach(factor => {
        if (factor.impact === 'positive') {
          adjustmentFactor += (factor.score - 0.5) * 0.2; // 最多增加10%
          hasPositiveAdjustment = true;
        }
      });

      if (hasPositiveAdjustment && adjustmentFactor > 1.01) {
        enhancement.applied = true;
        enhancement.adjustment = result.finalAmount * (adjustmentFactor - 1);
        enhancement.confidence = 0.85; // AI调整的置信度
        enhancement.factors = aiFactors;
        enhancement.explanation = `基于AI分析的多维度评估，应用${(adjustmentFactor * 100 - 100).toFixed(1)}%的智能调整`;
      }

    } catch (error) {
      logger.error('AI增强计算失败:', error);
      enhancement.error = error.message;
    }

    return enhancement;
  }

  /**
   * 生成详细分解
   */
  generateDetailedBreakdown(result) {
    const components = [];

    // 基础金额
    components.push({
      name: '基础金额',
      amount: result.baseAmount,
      description: '政策规定的基础补贴金额'
    });

    // 调整项
    result.breakdown.adjustments.forEach(adj => {
      components.push({
        name: adj.name,
        amount: adj.amount,
        type: 'adjustment',
        description: adj.description
      });
    });

    // 加成项
    result.breakdown.bonuses.forEach(bonus => {
      components.push({
        name: bonus.name,
        amount: bonus.amount,
        type: 'bonus',
        description: bonus.description
      });
    });

    // 扣减项
    result.breakdown.deductions.forEach(ded => {
      components.push({
        name: ded.name,
        amount: -ded.amount,
        type: 'deduction',
        description: ded.description
      });
    });

    return components;
  }

  /**
   * 生成计算步骤
   */
  generateCalculationSteps(policyData, result) {
    const steps = [];

    steps.push({
      step: 1,
      title: '资格检查',
      description: `检查申请条件，结果：${result.eligibility.isEligible ? '通过' : '未通过'}`,
      details: result.eligibility.passedCriteria
    });

    if (result.factors.household) {
      steps.push({
        step: 2,
        title: '家庭人口计算',
        description: `计算家庭人口${result.factors.household.size}人`,
        details: `采用${result.factors.household.calculationMethod}方法，置信度${(result.factors.household.confidence * 100).toFixed(1)}%`
      });
    }

    if (result.factors.land) {
      steps.push({
        step: 3,
        title: '土地面积计算',
        description: `计算土地面积${result.factors.land.eligibleArea}亩`,
        details: `符合条件面积${result.factors.land.eligibleArea}亩，调整后面积${result.factors.land.adjustedArea}亩`
      });
    }

    steps.push({
      step: 4,
      title: '基础金额计算',
      description: `基础金额：${result.baseAmount}元`
    });

    steps.push({
      step: 5,
      title: '应用计算规则',
      description: `应用${result.calculations.method}计算规则`,
      details: `计算后金额：${result.calculatedAmount}元`
    });

    steps.push({
      step: 6,
      title: '应用调整系数',
      description: '应用地区、时间等调整系数',
      details: `调整后金额：${result.adjustedAmount}元`
    });

    steps.push({
      step: 7,
      title: '特殊群体加成',
      description: '应用特殊群体政策加成',
      details: `加成金额：${result.bonusAmount}元`
    });

    steps.push({
      step: 8,
      title: '最终金额',
      description: `最终补贴金额：${result.finalAmount}元`
    });

    if (result.aiEnhancement && result.aiEnhancement.applied) {
      steps.push({
        step: 9,
        title: 'AI智能调整',
        description: result.aiEnhancement.explanation,
        details: `AI调整金额：${result.aiEnhancement.adjustment.toFixed(2)}元`
      });
    }

    return steps;
  }

  /**
   * 计算置信度
   */
  calculateConfidence(policyData, applicationData, result) {
    let confidence = 1.0;

    // 基于资格分数
    confidence *= (0.5 + result.eligibility.score * 0.5);

    // 基于家庭计算置信度
    if (result.factors.household) {
      confidence *= result.factors.household.confidence;
    }

    // 基于土地计算置信度
    if (result.factors.land) {
      confidence *= result.factors.land.confidence;
    }

    // 基于数据完整性
    const dataCompleteness = this.assessDataCompleteness(applicationData);
    confidence *= dataCompleteness;

    // 基于历史数据
    if (applicationData.hasPreviousApplication) {
      confidence *= 0.9; // 有历史记录的数据更可靠
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * 评估数据完整性
   */
  assessDataCompleteness(applicationData) {
    const requiredFields = [
      'applicantInfo.name',
      'applicantInfo.idNumber',
      'applicantInfo.birthDate',
      'householdInfo.registeredHouseholdSize'
    ];

    let filledFields = 0;
    requiredFields.forEach(field => {
      if (this.getNestedValue(applicationData, field)) {
        filledFields++;
      }
    });

    return filledFields / requiredFields.length;
  }

  /**
   * 辅助方法
   */

  calculateAge(birthDate) {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  determineRegionType(applicationData) {
    const region = applicationData.metadata?.region || 'developing';
    return this.regionalAdjustments[region] ? region : 'developing';
  }

  calculateTemporalFactor(applicationData) {
    // 简化的时间因素计算
    // 实际实现应基于申请时间和政策截止时间
    return 1.0;
  }

  evaluateFormula(formula, baseAmount, factors) {
    // 简化的公式计算
    // 实际实现应使用安全的公式解析器
    return baseAmount;
  }

  applyRateTable(rateTable, amount, factors) {
    // 简化的费率表应用
    return amount;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  analyzeApplicationHistory(history) {
    // 模拟申请历史分析
    return 0.8;
  }

  analyzeRegionDevelopment(region) {
    // 模拟地区发展水平分析
    return 0.6;
  }

  analyzeHardshipLevel(applicationData) {
    // 模拟特殊困难程度分析
    const { applicantInfo } = applicationData;
    let score = 0;

    if (applicantInfo.isPovertyHousehold) score += 0.4;
    if (applicantInfo.hasDisability) score += 0.3;
    if (applicantInfo.annualIncome < 20000) score += 0.3;

    return Math.min(score, 1.0);
  }
}

module.exports = new SubsidyCalculationEngine();