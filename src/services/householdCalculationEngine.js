/**
 * 家庭人口计算引擎
 * 提供多种计算方法和智能分析
 */

class HouseholdCalculationEngine {
  constructor() {
    this.calculationMethods = {
      REGISTERED: 'registered',           // 户籍人口
      ACTUAL: 'actual',                  // 实际居住人口
      MIXED: 'mixed',                    // 混合计算
      WEIGHTED: 'weighted',              // 加权计算
      DYNAMIC: 'dynamic',                // 动态调整
      VERIFICATION_BASED: 'verification' // 核实为基础
    };

    this.familyRelationshipMap = {
      self: 1,
      spouse: 1,
      child: 1,
      parent: 1,
      grandparent: 0.8,
      grandchild: 0.8,
      sibling: 0.9,
      other_relative: 0.7,
      non_relative: 0.3
    };

    this.specialStatusWeights = {
      student: 1.2,          // 学生享受额外权重
      elderly: 1.1,          // 老年人额外权重
      disabled: 1.3,         // 残疾人额外权重
      chronic_illness: 1.25, // 慢性病患者额外权重
      infant: 1.5,           // 婴幼儿额外权重
      pregnant: 1.4          // 孕妇额外权重
    };
  }

  /**
   * 计算家庭人口数
   * @param {Object} householdData 家庭数据
   * @param {Object} options 计算选项
   * @returns {Object} 计算结果
   */
  calculateHouseholdSize(householdData, options = {}) {
    const {
      method = this.calculationMethods.REGISTERED,
      includeSpecialWeights = false,
      verificationLevel = 'basic',
      customWeights = {}
    } = options;

    const result = {
      baseCount: 0,
      adjustedCount: 0,
      weightedCount: 0,
      verifiedCount: 0,
      breakdown: {
        primary: 0,        // 主要家庭成员
        dependent: 0,      // 受抚养家庭成员
        extended: 0,       // 扩展家庭成员
        non_family: 0      // 非家庭成员
      },
      specialGroups: {
        students: 0,
        elderly: 0,
        disabled: 0,
        children: 0,
        infants: 0
      },
      calculationDetails: {
        method,
        verifications: {},
        adjustments: [],
        confidence: 1.0
      }
    };

    try {
      // 基础计算
      result.baseCount = this.calculateBaseCount(householdData, method);

      // 应用家庭关系权重
      result.adjustedCount = this.applyRelationshipWeights(householdData, result.baseCount);

      // 应用特殊状态权重（如果启用）
      if (includeSpecialWeights) {
        result.weightedCount = this.applySpecialWeights(householdData, result.adjustedCount, customWeights);
        result.specialGroups = this.identifySpecialGroups(householdData);
      } else {
        result.weightedCount = result.adjustedCount;
      }

      // 核实计算
      result.verifiedCount = this.calculateVerifiedCount(householdData, verificationLevel);

      // 分类统计
      result.breakdown = this.categorizeMembers(householdData);

      // 计算置信度
      result.calculationDetails.confidence = this.calculateConfidence(householdData, method, verificationLevel);

      // 生成调整说明
      result.calculationDetails.adjustments = this.generateAdjustmentExplanations(
        householdData,
        result,
        method,
        includeSpecialWeights
      );

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
   * 计算基础人口数
   */
  calculateBaseCount(householdData, method) {
    const { householdMembers, registeredHouseholdSize, actualHouseholdSize } = householdData;

    switch (method) {
    case this.calculationMethods.REGISTERED:
      return registeredHouseholdSize || (householdMembers ? householdMembers.length : 0);

    case this.calculationMethods.ACTUAL:
      return actualHouseholdSize || this.countActualResidents(householdMembers);

    case this.calculationMethods.MIXED:
      return this.calculateMixedCount(householdData);

    case this.calculationMethods.DYNAMIC:
      return this.calculateDynamicCount(householdData);

    default:
      return registeredHouseholdSize || 0;
    }
  }

  /**
   * 统计实际居住人口
   */
  countActualResidents(members) {
    if (!members || !Array.isArray(members)) return 0;

    return members.filter(member => {
      // 检查是否为实际居住成员
      return member.residenceStatus === 'resident' ||
             member.isLivingAtHome !== false ||
             member.employment !== 'working_abroad';
    }).length;
  }

  /**
   * 混合计算方法
   */
  calculateMixedCount(householdData) {
    const { registeredHouseholdSize, actualHouseholdSize, householdMembers } = householdData;

    // 如果两个数据都存在，取较大值但不超出的合理范围
    if (registeredHouseholdSize && actualHouseholdSize) {
      const registered = parseInt(registeredHouseholdSize);
      const actual = parseInt(actualHouseholdSize);

      // 如果差异超过20%，使用核实方法
      if (Math.abs(registered - actual) / Math.max(registered, actual) > 0.2) {
        return this.calculateVerifiedCount(householdData, 'detailed');
      }

      // 否则取平均值
      return Math.round((registered + actual) / 2);
    }

    // 如果只有一个数据源，使用该数据
    return registeredHouseholdSize || actualHouseholdSize ||
           (householdMembers ? householdMembers.length : 0);
  }

  /**
   * 动态计算方法
   */
  calculateDynamicCount(householdData) {
    const { householdMembers, registeredHouseholdSize, actualHouseholdSize } = householdData;

    let baseCount = 0;
    let adjustments = 0;

    // 从注册人口开始
    baseCount = registeredHouseholdSize || 0;

    // 根据家庭成员信息动态调整
    if (householdMembers && Array.isArray(householdMembers)) {
      householdMembers.forEach(member => {
        // 主要成员（自述、配偶、子女）通常应该被计入
        if (['self', 'spouse', 'child'].includes(member.relationship)) {
          if (member.isLivingAtHome !== false) {
            adjustments += 1;
          }
        }

        // 学生在校但家庭经济来源仍在原家庭
        if (member.isStudent && member.age <= 25) {
          adjustments += 0.8;
        }

        // 外地工作但经济关系紧密的成员
        if (member.employment === 'working_abroad' && member.sendsRemittance) {
          adjustments += 0.6;
        }
      });
    }

    // 应用实际居住人口作为上限
    const actualMax = actualHouseholdSize || baseCount;
    const dynamicCount = Math.min(baseCount + adjustments, actualMax * 1.2);

    return Math.round(dynamicCount);
  }

  /**
   * 应用家庭关系权重
   */
  applyRelationshipWeights(householdData, baseCount) {
    const { householdMembers } = householdData;

    if (!householdMembers || !Array.isArray(householdMembers)) {
      return baseCount;
    }

    let weightedSum = 0;

    householdMembers.forEach(member => {
      const relationship = member.relationship || 'other_relative';
      const weight = this.familyRelationshipMap[relationship] || 0.5;

      // 根据居住状态调整权重
      let adjustedWeight = weight;
      if (member.isLivingAtHome === false) {
        adjustedWeight *= 0.3; // 不在家居住的成员权重降低
      } else if (member.residenceStatus === 'part_time') {
        adjustedWeight *= 0.7; // 部分时间居住的成员权重降低
      }

      weightedSum += adjustedWeight;
    });

    // 确保权重计算结果在合理范围内
    return Math.min(Math.max(Math.round(weightedSum), 1), baseCount * 1.5);
  }

  /**
   * 应用特殊状态权重
   */
  applySpecialWeights(householdData, baseCount, customWeights = {}) {
    const { householdMembers } = householdData;

    if (!householdMembers || !Array.isArray(householdMembers)) {
      return baseCount;
    }

    let additionalWeight = 0;

    householdMembers.forEach(member => {
      // 检查特殊状态
      if (member.isStudent && member.age <= 25) {
        additionalWeight += (customWeights.student || this.specialStatusWeights.student) - 1;
      }

      if (member.age >= 65) {
        additionalWeight += (customWeights.elderly || this.specialStatusWeights.elderly) - 1;
      }

      if (member.hasDisability) {
        additionalWeight += (customWeights.disabled || this.specialStatusWeights.disabled) - 1;
      }

      if (member.age <= 6) {
        additionalWeight += (customWeights.infant || this.specialStatusWeights.infant) - 1;
      }

      if (member.isPregnant) {
        additionalWeight += (customWeights.pregnant || this.specialStatusWeights.pregnant) - 1;
      }
    });

    return Math.round(baseCount + additionalWeight);
  }

  /**
   * 计算核实后的人口数
   */
  calculateVerifiedCount(householdData, verificationLevel = 'basic') {
    const { householdMembers, verificationDocuments } = householdData;

    if (!householdMembers || !Array.isArray(householdMembers)) {
      return 0;
    }

    let verifiedCount = 0;
    const verificationRequirements = this.getVerificationRequirements(verificationLevel);

    householdMembers.forEach(member => {
      let memberVerified = false;

      // 基础核实：检查基本字段
      if (verificationLevel === 'basic') {
        memberVerified = !!(member.name && member.idNumber && member.relationship);
      }
      // 详细核实：检查所有必需字段
      else if (verificationLevel === 'detailed') {
        memberVerified = this.verifyMemberDetails(member, verificationRequirements);
      }
      // 严格核实：需要文档支持
      else if (verificationLevel === 'strict') {
        memberVerified = this.verifyMemberWithDocuments(member, verificationDocuments);
      }

      if (memberVerified) {
        verifiedCount++;
      }
    });

    return verifiedCount;
  }

  /**
   * 获取核实要求
   */
  getVerificationRequirements(level) {
    switch (level) {
    case 'basic':
      return ['name', 'relationship'];
    case 'detailed':
      return ['name', 'idNumber', 'relationship', 'birthDate', 'gender'];
    case 'strict':
      return ['name', 'idNumber', 'relationship', 'birthDate', 'gender', 'address', 'phone'];
    default:
      return ['name', 'relationship'];
    }
  }

  /**
   * 核实成员详细信息
   */
  verifyMemberDetails(member, requirements) {
    return requirements.every(field => {
      const value = member[field];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * 使用文档核实成员
   */
  verifyMemberWithDocuments(member, verificationDocuments) {
    // 这里可以实现更复杂的文档验证逻辑
    // 比如检查身份证、户口本等文档的一致性

    const hasBasicInfo = member.name && member.idNumber && member.relationship;

    // 检查是否有支持文档
    const hasSupportingDocuments = verificationDocuments &&
      verificationDocuments.some(doc =>
        doc.memberId === member.id ||
        doc.memberName === member.name
      );

    return hasBasicInfo && hasSupportingDocuments;
  }

  /**
   * 分类家庭成员
   */
  categorizeMembers(householdData) {
    const { householdMembers } = householdData;

    if (!householdMembers || !Array.isArray(householdMembers)) {
      return {
        primary: 0,
        dependent: 0,
        extended: 0,
        non_family: 0
      };
    }

    const breakdown = {
      primary: 0,      // 主要成员：自述、配偶、子女
      dependent: 0,    // 受抚养成员：需要经济支持的未成年或老年成员
      extended: 0,     // 扩展成员：其他亲属
      non_family: 0    // 非家庭成员
    };

    householdMembers.forEach(member => {
      const relationship = member.relationship || 'other_relative';

      if (['self', 'spouse', 'child'].includes(relationship)) {
        breakdown.primary++;

        // 检查是否为受抚养成员
        if (member.age <= 18 || (member.age >= 65 && !member.isEmployed)) {
          breakdown.dependent++;
        }
      } else if (['parent', 'grandparent', 'grandchild', 'sibling'].includes(relationship)) {
        breakdown.extended++;

        // 某些扩展家庭成员也可能是受抚养成员
        if (relationship === 'parent' && member.age >= 65) {
          breakdown.dependent++;
        }
      } else {
        breakdown.non_family++;
      }
    });

    return breakdown;
  }

  /**
   * 识别特殊群体
   */
  identifySpecialGroups(householdData) {
    const { householdMembers } = householdData;

    if (!householdMembers || !Array.isArray(householdMembers)) {
      return {
        students: 0,
        elderly: 0,
        disabled: 0,
        children: 0,
        infants: 0
      };
    }

    const groups = {
      students: 0,
      elderly: 0,
      disabled: 0,
      children: 0,
      infants: 0
    };

    householdMembers.forEach(member => {
      const age = member.age || 0;

      if (member.isStudent) groups.students++;
      if (age >= 65) groups.elderly++;
      if (member.hasDisability) groups.disabled++;
      if (age >= 6 && age <= 18) groups.children++;
      if (age <= 6) groups.infants++;
    });

    return groups;
  }

  /**
   * 计算置信度
   */
  calculateConfidence(householdData, method, verificationLevel) {
    let confidence = 1.0;

    // 根据计算方法调整置信度
    switch (method) {
    case this.calculationMethods.REGISTERED:
      confidence *= 0.9;
      break;
    case this.calculationMethods.ACTUAL:
      confidence *= 0.85;
      break;
    case this.calculationMethods.MIXED:
      confidence *= 0.95;
      break;
    case this.calculationMethods.DYNAMIC:
      confidence *= 0.8;
      break;
    }

    // 根据核实水平调整置信度
    switch (verificationLevel) {
    case 'basic':
      confidence *= 0.8;
      break;
    case 'detailed':
      confidence *= 0.9;
      break;
    case 'strict':
      confidence *= 0.95;
      break;
    }

    // 根据数据完整性调整
    const { householdMembers, registeredHouseholdSize, actualHouseholdSize } = householdData;

    if (householdMembers && Array.isArray(householdMembers)) {
      const completeMembers = householdMembers.filter(member =>
        member.name && member.idNumber && member.relationship
      ).length;

      const completenessRatio = completeMembers / householdMembers.length;
      confidence *= (0.5 + completenessRatio * 0.5);
    }

    // 数据一致性检查
    if (registeredHouseholdSize && actualHouseholdSize) {
      const diff = Math.abs(registeredHouseholdSize - actualHouseholdSize);
      const maxVal = Math.max(registeredHouseholdSize, actualHouseholdSize);
      const consistency = 1 - (diff / maxVal);
      confidence *= Math.max(0.7, consistency);
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * 生成调整说明
   */
  generateAdjustmentExplanations(householdData, result, method, includeSpecialWeights) {
    const explanations = [];

    // 计算方法说明
    switch (method) {
    case this.calculationMethods.REGISTERED:
      explanations.push(`采用户籍人口计算法，基础人口数：${result.baseCount}`);
      break;
    case this.calculationMethods.ACTUAL:
      explanations.push(`采用实际居住人口计算法，基础人口数：${result.baseCount}`);
      break;
    case this.calculationMethods.MIXED:
      explanations.push('采用混合计算法，结合户籍和实际居住数据');
      break;
    case this.calculationMethods.DYNAMIC:
      explanations.push('采用动态计算法，根据成员具体情况调整');
      break;
    }

    // 权重调整说明
    if (result.adjustedCount !== result.baseCount) {
      explanations.push(`根据家庭关系调整：${result.baseCount} → ${result.adjustedCount}`);
    }

    // 特殊权重说明
    if (includeSpecialWeights && result.weightedCount !== result.adjustedCount) {
      explanations.push(`考虑特殊群体需求调整：${result.adjustedCount} → ${result.weightedCount}`);
      if (result.specialGroups.students > 0) {
        explanations.push(`  - 包含${result.specialGroups.students}名学生成员`);
      }
      if (result.specialGroups.elderly > 0) {
        explanations.push(`  - 包含${result.specialGroups.elderly}名老年成员`);
      }
      if (result.specialGroups.disabled > 0) {
        explanations.push(`  - 包含${result.specialGroups.disabled}名残疾成员`);
      }
    }

    // 核实说明
    if (result.verifiedCount < result.weightedCount) {
      explanations.push(`经核实验证：${result.weightedCount} → ${result.verifiedCount}（已核实成员数）`);
    }

    // 置信度说明
    if (result.calculationDetails.confidence < 0.8) {
      explanations.push(`⚠️ 计算置信度较低（${(result.calculationDetails.confidence * 100).toFixed(1)}%），建议核实数据准确性`);
    }

    return explanations;
  }

  /**
   * 批量计算多个家庭
   */
  batchCalculate(householdsData, options = {}) {
    const results = [];

    householdsData.forEach((householdData, index) => {
      const result = this.calculateHouseholdSize(householdData, options);
      result.index = index;
      result.householdId = householdData.householdId;
      results.push(result);
    });

    return results;
  }

  /**
   * 验证计算结果的合理性
   */
  validateCalculationResult(householdData, result) {
    const validations = [];
    const { householdMembers } = householdData;

    // 检查结果是否为正数
    if (result.data.weightedCount <= 0) {
      validations.push({
        type: 'error',
        message: '计算结果必须大于0'
      });
    }

    // 检查是否超出合理范围
    if (result.data.weightedCount > 20) {
      validations.push({
        type: 'warning',
        message: '计算结果超出常规家庭规模，请核实数据'
      });
    }

    // 检查与成员列表的一致性
    if (householdMembers && Array.isArray(householdMembers)) {
      const memberListCount = householdMembers.length;
      const calculatedCount = result.data.weightedCount;

      if (Math.abs(memberListCount - calculatedCount) > memberListCount * 0.5) {
        validations.push({
          type: 'warning',
          message: `计算结果（${calculatedCount}）与成员列表数量（${memberListCount}）差异较大`
        });
      }
    }

    // 检查特殊群体的合理性
    const { specialGroups } = result.data;
    const totalSpecial = specialGroups.students + specialGroups.elderly +
                        specialGroups.disabled + specialGroups.children + specialGroups.infants;

    if (totalSpecial > result.data.weightedCount) {
      validations.push({
        type: 'error',
        message: '特殊群体总数超过计算人口数，数据有误'
      });
    }

    return {
      isValid: validations.filter(v => v.type === 'error').length === 0,
      validations
    };
  }
}

module.exports = new HouseholdCalculationEngine();