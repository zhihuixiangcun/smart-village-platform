/**
 * 土地面积测算引擎
 * 提供多种土地类型、单位转换、面积计算等功能
 */

class LandAreaCalculationEngine {
  constructor() {
    // 土地类型定义
    this.landTypes = {
      cultivated: {
        name: '耕地',
        coefficient: 1.0,
        eligibilityMultiplier: 1.2,
        description: '用于种植农作物的土地'
      },
      forest: {
        name: '林地',
        coefficient: 0.8,
        eligibilityMultiplier: 0.9,
        description: '生长树木的土地'
      },
      grassland: {
        name: '草地',
        coefficient: 0.6,
        eligibilityMultiplier: 0.7,
        description: '生长草本植物的土地'
      },
      water_body: {
        name: '水域',
        coefficient: 0.4,
        eligibilityMultiplier: 0.5,
        description: '水面、池塘、沟渠等'
      },
      homestead: {
        name: '宅基地',
        coefficient: 0.3,
        eligibilityMultiplier: 0.2,
        description: '农村居民住宅用地'
      },
      construction: {
        name: '建设用地',
        coefficient: 0.2,
        eligibilityMultiplier: 0.1,
        description: '用于建设的土地'
      },
      waste: {
        name: '荒地',
        coefficient: 0.5,
        eligibilityMultiplier: 0.6,
        description: '尚未利用的土地'
      },
      other: {
        name: '其他',
        coefficient: 0.7,
        eligibilityMultiplier: 0.8,
        description: '其他类型土地'
      }
    };

    // 面积单位转换
    this.unitConversions = {
      // 1 亩 = 666.67 平方米
      mu: {
        toSquareMeter: 666.6666667,
        toHectare: 0.0666666667,
        toAcre: 0.1647369209,
        name: '亩',
        standardUnit: true
      },
      // 1 公顷 = 10000 平方米
      hectare: {
        toSquareMeter: 10000,
        toMu: 15,
        toAcre: 2.4710538147,
        name: '公顷',
        standardUnit: true
      },
      // 1 平方米
      square_meter: {
        toMu: 0.0015,
        toHectare: 0.0001,
        toAcre: 0.0002471054,
        name: '平方米',
        baseUnit: true
      },
      // 1 英亩 = 4046.86 平方米
      acre: {
        toSquareMeter: 4046.8564224,
        toMu: 6.0702846336,
        toHectare: 0.4046856422,
        name: '英亩'
      }
    };

    // 土地等级划分
    this.landGrades = {
      premium: {
        name: '优等地',
        multiplier: 1.3,
        conditions: {
          minFertility: 0.8,
          maxSlope: 5,
          irrigationAccess: true,
          locationScore: 0.9
        }
      },
      good: {
        name: '上等地',
        multiplier: 1.1,
        conditions: {
          minFertility: 0.6,
          maxSlope: 10,
          irrigationAccess: true,
          locationScore: 0.7
        }
      },
      medium: {
        name: '中等地',
        multiplier: 1.0,
        conditions: {
          minFertility: 0.4,
          maxSlope: 15,
          irrigationAccess: false,
          locationScore: 0.5
        }
      },
      low: {
        name: '下等地',
        multiplier: 0.8,
        conditions: {
          minFertility: 0.2,
          maxSlope: 25,
          irrigationAccess: false,
          locationScore: 0.3
        }
      },
      marginal: {
        name: '边际地',
        multiplier: 0.6,
        conditions: {
          minFertility: 0,
          maxSlope: 35,
          irrigationAccess: false,
          locationScore: 0.1
        }
      }
    };

    // 作物类型系数
    this.cropCoefficients = {
      rice: { name: '水稻', coefficient: 1.2, waterRequirement: 'high' },
      wheat: { name: '小麦', coefficient: 1.0, waterRequirement: 'medium' },
      corn: { name: '玉米', coefficient: 0.9, waterRequirement: 'medium' },
      vegetables: { name: '蔬菜', coefficient: 1.3, waterRequirement: 'high' },
      fruits: { name: '果树', coefficient: 1.1, waterRequirement: 'medium' },
      aquaculture: { name: '水产养殖', coefficient: 1.4, waterRequirement: 'very_high' },
      livestock: { name: '畜牧养殖', coefficient: 0.8, waterRequirement: 'low' },
      other: { name: '其他', coefficient: 0.7, waterRequirement: 'low' }
    };
  }

  /**
   * 计算土地总面积
   * @param {Object} landData 土地数据
   * @param {Object} options 计算选项
   * @returns {Object} 计算结果
   */
  calculateLandArea(landData, options = {}) {
    const {
      targetUnit = 'mu',
      includeIneligible = true,
      applyLandGrades = false,
      considerCropTypes = false,
      customCoefficients = {}
    } = options;

    const result = {
      totalArea: 0,
      eligibleArea: 0,
      adjustedArea: 0,
      breakdown: {
        byType: {},
        byGrade: {},
        byUsage: {}
      },
      details: {
        landParcels: [],
        conversions: [],
        adjustments: [],
        recommendations: []
      },
      calculations: {
        method: 'standard',
        confidence: 1.0,
        dataQuality: 'good'
      }
    };

    try {
      const { landParcels, totalLandArea, totalLandUnit } = landData;

      // 处理地块数据
      if (landParcels && Array.isArray(landParcels)) {
        result.details.landParcels = this.processLandParcels(
          landParcels,
          targetUnit,
          customCoefficients
        );

        // 按类型分类统计
        result.breakdown.byType = this.categorizeByType(result.details.landParcels);

        // 应用土地等级（如果启用）
        if (applyLandGrades) {
          result.breakdown.byGrade = this.categorizeByGrade(result.details.landParcels);
        }

        // 按用途分类统计
        if (considerCropTypes) {
          result.breakdown.byUsage = this.categorizeByUsage(result.details.landParcels);
        }
      }

      // 计算总面积
      result.totalArea = this.calculateTotalArea(result.details.landParcels, targetUnit);

      // 处理直接输入的总面积
      if (totalLandArea && totalLandUnit) {
        const convertedArea = this.convertArea(totalLandArea, totalLandUnit, targetUnit);
        result.details.conversions.push({
          original: { area: totalLandArea, unit: totalLandUnit },
          converted: { area: convertedArea, unit: targetUnit }
        });

        // 如果没有地块明细，使用直接输入的面积
        if (result.details.landParcels.length === 0) {
          result.totalArea = convertedArea;
        } else {
          // 验证数据一致性
          const discrepancy = Math.abs(result.totalArea - convertedArea) / Math.max(result.totalArea, convertedArea);
          if (discrepancy > 0.1) { // 差异超过10%
            result.details.recommendations.push({
              type: 'data_inconsistency',
              message: `地块明细总面积（${result.totalArea.toFixed(2)}${targetUnit}）与直接输入面积（${convertedArea.toFixed(2)}${targetUnit}）差异较大，建议核实数据`,
              severity: 'warning'
            });
            result.calculations.dataQuality = 'questionable';
          }
        }
      }

      // 计算符合条件的面积
      result.eligibleArea = this.calculateEligibleArea(result.details.landParcels, targetUnit);

      // 计算调整后面积（考虑土地等级和作物类型）
      result.adjustedArea = this.calculateAdjustedArea(
        result.details.landParcels,
        targetUnit,
        applyLandGrades,
        considerCropTypes
      );

      // 生成调整说明
      result.details.adjustments = this.generateAdjustmentExplanations(
        result,
        options
      );

      // 计算置信度
      result.calculations.confidence = this.calculateConfidence(landData, result);

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
   * 处理地块数据
   */
  processLandParcels(landParcels, targetUnit, customCoefficients) {
    return landParcels.map(parcel => {
      const processedParcel = { ...parcel };

      // 转换面积单位
      if (parcel.area && parcel.areaUnit && parcel.areaUnit !== targetUnit) {
        processedParcel.convertedArea = this.convertArea(
          parcel.area,
          parcel.areaUnit,
          targetUnit
        );
      } else {
        processedParcel.convertedArea = parcel.area || 0;
      }

      // 获取土地类型系数
      const landTypeInfo = this.landTypes[parcel.landType] || this.landTypes.other;
      processedParcel.landTypeInfo = landTypeInfo;
      processedParcel.landTypeCoefficient = customCoefficients[parcel.landType] || landTypeInfo.coefficient;

      // 计算有效面积
      processedParcel.effectiveArea = processedParcel.convertedArea * processedParcel.landTypeCoefficient;

      // 应用土地等级（如果有）
      if (parcel.grade) {
        const gradeInfo = this.landGrades[parcel.grade];
        if (gradeInfo) {
          processedParcel.gradeInfo = gradeInfo;
          processedParcel.gradeMultiplier = gradeInfo.multiplier;
          processedParcel.gradeAdjustedArea = processedParcel.effectiveArea * gradeInfo.multiplier;
        }
      }

      // 应用作物系数（如果有）
      if (parcel.usage) {
        const cropInfo = this.cropCoefficients[parcel.usage] || this.cropCoefficients.other;
        processedParcel.cropInfo = cropInfo;
        processedParcel.cropCoefficient = cropInfo.coefficient;
        if (processedParcel.gradeAdjustedArea) {
          processedParcel.finalArea = processedParcel.gradeAdjustedArea * cropInfo.coefficient;
        } else {
          processedParcel.finalArea = processedParcel.effectiveArea * cropInfo.coefficient;
        }
      } else {
        processedParcel.finalArea = processedParcel.gradeAdjustedArea || processedParcel.effectiveArea;
      }

      return processedParcel;
    });
  }

  /**
   * 面积单位转换
   */
  convertArea(amount, fromUnit, toUnit) {
    if (!amount || amount <= 0) return 0;

    const fromConversion = this.unitConversions[fromUnit];
    const toConversion = this.unitConversions[toUnit];

    if (!fromConversion || !toConversion) {
      throw new Error(`不支持的面积单位: ${fromUnit} 或 ${toUnit}`);
    }

    // 先转换为平方米（基准单位）
    let squareMeters = amount;
    if (!fromConversion.baseUnit) {
      squareMeters = amount * fromConversion.toSquareMeter;
    }

    // 再转换为目标单位
    let targetAmount = squareMeters;
    if (!toConversion.baseUnit) {
      targetAmount = squareMeters / toConversion.toSquareMeter;
    }

    return parseFloat(targetAmount.toFixed(6));
  }

  /**
   * 按土地类型分类统计
   */
  categorizeByType(landParcels) {
    const categorized = {};

    landParcels.forEach(parcel => {
      const landType = parcel.landType || 'other';
      const typeInfo = this.landTypes[landType] || this.landTypes.other;

      if (!categorized[landType]) {
        categorized[landType] = {
          name: typeInfo.name,
          totalArea: 0,
          effectiveArea: 0,
          count: 0,
          coefficient: typeInfo.coefficient,
          eligibilityMultiplier: typeInfo.eligibilityMultiplier
        };
      }

      categorized[landType].totalArea += parcel.convertedArea || 0;
      categorized[landType].effectiveArea += parcel.effectiveArea || 0;
      categorized[landType].count += 1;
    });

    // 四舍五入保留两位小数
    Object.keys(categorized).forEach(key => {
      categorized[key].totalArea = parseFloat(categorized[key].totalArea.toFixed(2));
      categorized[key].effectiveArea = parseFloat(categorized[key].effectiveArea.toFixed(2));
    });

    return categorized;
  }

  /**
   * 按土地等级分类统计
   */
  categorizeByGrade(landParcels) {
    const categorized = {};

    landParcels.forEach(parcel => {
      let grade = 'medium'; // 默认等级

      // 根据地块条件判断等级
      if (parcel.fertility && parcel.slope && parcel.irrigationAccess !== undefined) {
        grade = this.determineLandGrade(parcel);
      } else if (parcel.grade) {
        grade = parcel.grade;
      }

      const gradeInfo = this.landGrades[grade];

      if (!categorized[grade]) {
        categorized[grade] = {
          name: gradeInfo.name,
          totalArea: 0,
          count: 0,
          multiplier: gradeInfo.multiplier
        };
      }

      categorized[grade].totalArea += parcel.convertedArea || 0;
      categorized[grade].count += 1;
    });

    // 四舍五入保留两位小数
    Object.keys(categorized).forEach(key => {
      categorized[key].totalArea = parseFloat(categorized[key].totalArea.toFixed(2));
    });

    return categorized;
  }

  /**
   * 按用途分类统计
   */
  categorizeByUsage(landParcels) {
    const categorized = {};

    landParcels.forEach(parcel => {
      const usage = parcel.usage || 'other';
      const cropInfo = this.cropCoefficients[usage] || this.cropCoefficients.other;

      if (!categorized[usage]) {
        categorized[usage] = {
          name: cropInfo.name,
          totalArea: 0,
          effectiveArea: 0,
          count: 0,
          coefficient: cropInfo.coefficient,
          waterRequirement: cropInfo.waterRequirement
        };
      }

      categorized[usage].totalArea += parcel.convertedArea || 0;
      categorized[usage].effectiveArea += parcel.finalArea || 0;
      categorized[usage].count += 1;
    });

    // 四舍五入保留两位小数
    Object.keys(categorized).forEach(key => {
      categorized[key].totalArea = parseFloat(categorized[key].totalArea.toFixed(2));
      categorized[key].effectiveArea = parseFloat(categorized[key].effectiveArea.toFixed(2));
    });

    return categorized;
  }

  /**
   * 判断土地等级
   */
  determineLandGrade(parcel) {
    const conditions = {
      minFertility: parcel.fertility || 0,
      maxSlope: parcel.slope || 0,
      irrigationAccess: parcel.irrigationAccess || false,
      locationScore: parcel.locationScore || 0
    };

    // 优等地
    if (conditions.minFertility >= 0.8 &&
        conditions.maxSlope <= 5 &&
        conditions.irrigationAccess &&
        conditions.locationScore >= 0.9) {
      return 'premium';
    }

    // 上等地
    if (conditions.minFertility >= 0.6 &&
        conditions.maxSlope <= 10 &&
        conditions.irrigationAccess &&
        conditions.locationScore >= 0.7) {
      return 'good';
    }

    // 中等地
    if (conditions.minFertility >= 0.4 &&
        conditions.maxSlope <= 15 &&
        conditions.locationScore >= 0.5) {
      return 'medium';
    }

    // 下等地
    if (conditions.minFertility >= 0.2 &&
        conditions.maxSlope <= 25 &&
        conditions.locationScore >= 0.3) {
      return 'low';
    }

    // 边际地
    return 'marginal';
  }

  /**
   * 计算总面积
   */
  calculateTotalArea(landParcels, targetUnit) {
    return landParcels.reduce((total, parcel) => {
      return total + (parcel.convertedArea || 0);
    }, 0);
  }

  /**
   * 计算符合条件的面积
   */
  calculateEligibleArea(landParcels, targetUnit) {
    return landParcels.reduce((total, parcel) => {
      const landTypeInfo = this.landTypes[parcel.landType] || this.landTypes.other;
      if (landTypeInfo.eligibilityMultiplier > 0) {
        return total + parcel.effectiveArea;
      }
      return total;
    }, 0);
  }

  /**
   * 计算调整后面积
   */
  calculateAdjustedArea(landParcels, targetUnit, applyLandGrades, considerCropTypes) {
    return landParcels.reduce((total, parcel) => {
      let adjustedArea = parcel.effectiveArea;

      if (applyLandGrades && parcel.gradeMultiplier) {
        adjustedArea *= parcel.gradeMultiplier;
      }

      if (considerCropTypes && parcel.cropCoefficient) {
        adjustedArea *= parcel.cropCoefficient;
      }

      return total + adjustedArea;
    }, 0);
  }

  /**
   * 生成调整说明
   */
  generateAdjustmentExplanations(result, options) {
    const explanations = [];

    // 基础计算说明
    explanations.push(`基础计算：总面积 ${result.totalArea} ${options.targetUnit || '亩'}`);

    // 符合条件面积说明
    if (result.eligibleArea < result.totalArea) {
      explanations.push(`符合补贴条件面积：${result.eligibleArea} ${options.targetUnit || '亩'}`);
      explanations.push('  - 宅基地、建设用地等类型不计入补贴面积');
    }

    // 土地等级调整说明
    if (options.applyLandGrades && Object.keys(result.breakdown.byGrade).length > 0) {
      explanations.push('土地等级调整：');
      Object.keys(result.breakdown.byGrade).forEach(grade => {
        const gradeData = result.breakdown.byGrade[grade];
        if (gradeData.multiplier !== 1.0) {
          explanations.push(`  - ${gradeData.name} × ${gradeData.multiplier}`);
        }
      });
    }

    // 作物类型调整说明
    if (options.considerCropTypes && Object.keys(result.breakdown.byUsage).length > 0) {
      explanations.push('作物类型调整：');
      Object.keys(result.breakdown.byUsage).forEach(usage => {
        const usageData = result.breakdown.byUsage[usage];
        if (usageData.coefficient !== 1.0) {
          explanations.push(`  - ${usageData.name} × ${usageData.coefficient}`);
        }
      });
    }

    // 最终调整面积说明
    if (result.adjustedArea !== result.eligibleArea) {
      explanations.push(`调整后面积：${result.adjustedArea} ${options.targetUnit || '亩'}`);
    }

    return explanations;
  }

  /**
   * 计算置信度
   */
  calculateConfidence(landData, result) {
    let confidence = 1.0;

    // 数据来源评估
    if (landData.landParcels && Array.isArray(landData.landParcels)) {
      const parcelCount = landData.landParcels.length;

      if (parcelCount === 0) {
        confidence *= 0.7; // 无地块明细，置信度降低
      } else if (parcelCount < 3) {
        confidence *= 0.85; // 地块数量较少
      }

      // 检查数据完整性
      const completeParcels = landData.landParcels.filter(parcel =>
        parcel.area && parcel.areaUnit && parcel.landType
      ).length;

      const completenessRatio = completeParcels / parcelCount;
      confidence *= (0.5 + completenessRatio * 0.5);
    } else if (landData.totalLandArea && landData.totalLandUnit) {
      confidence *= 0.8; // 只有总面积，置信度中等
    } else {
      confidence *= 0.3; // 数据不足，置信度很低
    }

    // 数据一致性检查
    if (result.details.recommendations.some(rec => rec.type === 'data_inconsistency')) {
      confidence *= 0.8;
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * 批量计算多户土地面积
   */
  batchCalculate(householdsData, options = {}) {
    const results = [];

    householdsData.forEach((householdData, index) => {
      const result = this.calculateLandArea(householdData, options);
      result.index = index;
      result.householdId = householdData.householdId;
      results.push(result);
    });

    return results;
  }

  /**
   * 验证计算结果
   */
  validateCalculationResult(landData, result) {
    const validations = [];

    // 检查基本数值
    if (result.data.totalArea <= 0) {
      validations.push({
        type: 'error',
        message: '总面积必须大于0'
      });
    }

    // 检查面积合理性
    if (result.data.totalArea > 100) { // 假设单户土地面积不超过100亩
      validations.push({
        type: 'warning',
        message: '总面积超出常规农户规模，请核实数据'
      });
    }

    // 检查类型分布
    const typeBreakdown = result.data.breakdown.byType;
    if (Object.keys(typeBreakdown).length === 0) {
      validations.push({
        type: 'warning',
        message: '缺少土地类型分类信息'
      });
    }

    // 检查数据质量
    if (result.data.calculations.confidence < 0.5) {
      validations.push({
        type: 'warning',
        message: '计算结果置信度较低，建议补充详细信息'
      });
    }

    return {
      isValid: validations.filter(v => v.type === 'error').length === 0,
      validations
    };
  }

  /**
   * 获取土地类型信息
   */
  getLandType(landType) {
    return this.landTypes[landType] || this.landTypes.other;
  }

  /**
   * 获取所有土地类型
   */
  getAllLandTypes() {
    return Object.keys(this.landTypes).map(key => ({
      value: key,
      ...this.landTypes[key]
    }));
  }

  /**
   * 获取土地等级信息
   */
  getLandGrade(grade) {
    return this.landGrades[grade];
  }

  /**
   * 获取所有土地等级
   */
  getAllLandGrades() {
    return Object.keys(this.landGrades).map(key => ({
      value: key,
      ...this.landGrades[key]
    }));
  }

  /**
   * 获取作物类型信息
   */
  getCropType(cropType) {
    return this.cropCoefficients[cropType] || this.cropCoefficients.other;
  }

  /**
   * 获取所有作物类型
   */
  getAllCropTypes() {
    return Object.keys(this.cropCoefficients).map(key => ({
      value: key,
      ...this.cropCoefficients[key]
    }));
  }
}

module.exports = new LandAreaCalculationEngine();