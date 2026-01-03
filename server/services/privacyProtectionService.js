/**
 * 隐私保护服务
 * 提供数据脱敏、权限验证、查看记录等功能
 */

const PrivacyRule = require('../models/PrivacyRule');
const SecurityAudit = require('../models/SecurityAudit');

class PrivacyProtectionService {
  constructor() {
    // 缓存隐私规则
    this.ruleCache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10分钟缓存

    // 初始化默认规则
    this.initDefaultRules();
  }

  /**
   * 初始化默认隐私规则
   */
  async initDefaultRules() {
    try {
      const count = await PrivacyRule.countDocuments();
      if (count === 0) {
        const defaultRules = PrivacyRule.getDefaultRules();
        await PrivacyRule.insertMany(defaultRules);
        console.log('Default privacy rules initialized');
      }
    } catch (error) {
      console.error('Error initializing default privacy rules:', error);
    }
  }

  /**
   * 脱敏处理数据
   * @param {Object} data - 原始数据
   * @param {Object} user - 当前用户
   * @param {String} scenario - 使用场景
   * @returns {Object} 脱敏后的数据
   */
  async maskData(data, user, scenario = 'display') {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const result = { ...data };
    const rules = await this.getActiveRules();

    for (const rule of rules) {
      // 检查规则是否适用于当前场景
      if (rule.scenarios.length > 0 && !rule.scenarios.includes(scenario)) {
        continue;
      }

      // 获取字段名
      const fieldName = this.getFieldName(rule.ruleType);

      // 检查数据中是否包含该字段
      if (result[fieldName]) {
        // 检查用户是否有权限查看完整信息
        const hasPermission = await this.checkPermission(rule, user);

        if (!hasPermission) {
          // 应用脱敏规则
          result[fieldName] = this.applyMask(result[fieldName], rule);
          result[`${fieldName}_masked`] = true;
          result[`${fieldName}_mask_reason`] = 'insufficient_permission';

          // 记录脱敏操作
          await this.logMaskOperation(fieldName, user, rule);
        }
      }
    }

    // 处理嵌套对象
    for (const key in result) {
      if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = await this.maskData(result[key], user, scenario);
      }
    }

    // 处理数组
    if (Array.isArray(result)) {
      const maskedArray = [];
      for (const item of result) {
        if (typeof item === 'object') {
          maskedArray.push(await this.maskData(item, user, scenario));
        } else {
          maskedArray.push(item);
        }
      }
      return maskedArray;
    }

    return result;
  }

  /**
   * 应用脱敏规则
   * @param {String} value - 原始值
   * @param {Object} rule - 脱敏规则
   * @returns {String} 脱敏后的值
   */
  applyMask(value, rule) {
    if (!value) return value;

    const valueStr = String(value);
    const { keepFirst, keepLast, maskChar } = rule.displayRule;

    // 如果使用了自定义正则表达式
    if (rule.maskRegex) {
      try {
        const regex = new RegExp(rule.maskRegex);
        return valueStr.replace(regex, maskChar);
      } catch (error) {
        console.error('Invalid mask regex:', error);
      }
    }

    // 使用默认的脱敏逻辑
    if (valueStr.length <= keepFirst + keepLast) {
      return valueStr; // 值太短，不脱敏
    }

    const firstPart = valueStr.substring(0, keepFirst);
    const lastPart = valueStr.substring(valueStr.length - keepLast);
    const maskLength = valueStr.length - keepFirst - keepLast;
    const maskedPart = maskChar.repeat(maskLength);

    return firstPart + maskedPart + lastPart;
  }

  /**
   * 检查用户权限
   * @param {Object} rule - 隐私规则
   * @param {Object} user - 用户信息
   * @returns {Boolean} 是否有权限
   */
  async checkPermission(rule, user) {
    if (!user) return false;

    // 检查角色权限
    if (rule.allowedRoles.includes(user.role)) {
      return true;
    }

    // 检查具体用户权限
    if (rule.allowedUsers.length > 0) {
      const hasUserPermission = rule.allowedUsers.some(id => id.equals(user._id));
      if (hasUserPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查是否需要人脸识别验证
   * @param {String} fieldType - 字段类型
   * @param {Object} user - 用户信息
   * @returns {Boolean} 是否需要验证
   */
  async requireFaceAuth(fieldType, user) {
    const rule = await this.getRuleByType(fieldType);

    if (!rule) return false;

    // 如果用户有权限查看完整信息，检查是否需要人脸识别
    const hasPermission = await this.checkPermission(rule, user);

    return hasPermission && rule.requireFaceAuth;
  }

  /**
   * 请求查看完整敏感信息
   * @param {String} fieldType - 字段类型
   * @param {String} recordId - 记录ID
   * @param {Object} user - 用户信息
   * @param {Boolean} faceVerified - 是否已通过人脸验证
   * @returns {Object} 请求结果
   */
  async requestViewFullInfo(fieldType, recordId, user, faceVerified = false) {
    try {
      const rule = await this.getRuleByType(fieldType);

      if (!rule) {
        return {
          success: false,
          message: '未找到相关规则'
        };
      }

      // 检查权限
      const hasPermission = await this.checkPermission(rule, user);

      if (!hasPermission) {
        await this.logDeniedAccess(fieldType, recordId, user, 'no_permission');
        return {
          success: false,
          message: '您没有权限查看此信息',
          requireFaceAuth: false
        };
      }

      // 检查是否需要人脸识别
      if (rule.requireFaceAuth && !faceVerified) {
        return {
          success: false,
          message: '需要进行人脸识别验证',
          requireFaceAuth: true
        };
      }

      // 检查查看次数限制
      if (rule.viewLimit > 0) {
        const viewCount = await this.getViewCount(fieldType, recordId, user._id);

        if (viewCount >= rule.viewLimit) {
          await this.logDeniedAccess(fieldType, recordId, user, 'view_limit_exceeded');
          return {
            success: false,
            message: `今日查看次数已达上限（${rule.viewLimit}次）`,
            requireFaceAuth: false
          };
        }
      }

      // 检查时间限制
      if (rule.timeRestriction.enabled) {
        const isInAllowedTime = this.checkTimeRestriction(rule.timeRestriction);

        if (!isInAllowedTime) {
          await this.logDeniedAccess(fieldType, recordId, user, 'time_restriction');
          return {
            success: false,
            message: '当前时间不允许查看此信息',
            requireFaceAuth: false
          };
        }
      }

      // 记录查看操作
      await this.recordView(fieldType, recordId, user);

      return {
        success: true,
        message: '验证通过'
      };
    } catch (error) {
      console.error('Error requesting view full info:', error);
      return {
        success: false,
        message: '请求失败',
        error: error.message
      };
    }
  }

  /**
   * 检查时间限制
   * @param {Object} restriction - 时间限制规则
   * @returns {Boolean} 是否在允许时间内
   */
  checkTimeRestriction(restriction) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const currentDay = now.getDay();

    // 检查星期限制
    if (restriction.allowedDays.length > 0) {
      if (!restriction.allowedDays.includes(currentDay)) {
        return false;
      }
    }

    // 检查时间限制
    if (restriction.allowedHours.length > 0) {
      return restriction.allowedHours.some(({ start, end }) => {
        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        return currentTime >= startTime && currentTime <= endTime;
      });
    }

    return true;
  }

  /**
   * 记录查看操作
   * @param {String} fieldType - 字段类型
   * @param {String} recordId - 记录ID
   * @param {Object} user - 用户信息
   */
  async recordView(fieldType, recordId, user) {
    await SecurityAudit.log({
      operationType: 'view_sensitive_data',
      operationName: '查看敏感信息',
      operator: {
        userId: user._id,
        userName: user.name,
        userRole: user.role
      },
      ipAddress: user.ip || 'unknown',
      target: {
        targetType: 'user',
        targetId: recordId,
        targetName: fieldType
      },
      operationDetails: {
        fieldType,
        recordId,
        viewTime: new Date()
      },
      sensitiveFields: [fieldType],
      sensitivityLevel: 'high',
      result: 'success'
    });
  }

  /**
   * 记录拒绝访问
   * @param {String} fieldType - 字段类型
   * @param {String} recordId - 记录ID
   * @param {Object} user - 用户信息
   * @param {String} reason - 拒绝原因
   */
  async logDeniedAccess(fieldType, recordId, user, reason) {
    await SecurityAudit.log({
      operationType: 'view_sensitive_data',
      operationName: '尝试查看敏感信息被拒绝',
      operator: {
        userId: user._id,
        userName: user.name,
        userRole: user.role
      },
      ipAddress: user.ip || 'unknown',
      target: {
        targetType: 'user',
        targetId: recordId,
        targetName: fieldType
      },
      operationDetails: {
        fieldType,
        recordId,
        denyReason: reason
      },
      sensitiveFields: [fieldType],
      sensitivityLevel: 'high',
      result: 'failed',
      errorMessage: reason
    });
  }

  /**
   * 记录脱敏操作
   * @param {String} fieldName - 字段名
   * @param {Object} user - 用户信息
   * @param {Object} rule - 应用的规则
   */
  async logMaskOperation(fieldName, user, rule) {
    // 可选：记录脱敏操作到审计日志
    // 注意：这可能产生大量日志，建议根据实际情况决定是否启用
  }

  /**
   * 获取用户的查看记录
   * @param {String} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Array} 查看记录
   */
  async getViewHistory(userId, options = {}) {
    const {
      startDate,
      endDate,
      limit = 50,
      skip = 0
    } = options;

    const query = {
      'operator.userId': userId,
      operationType: 'view_sensitive_data'
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    return SecurityAudit.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  /**
   * 获取查看次数统计
   * @param {String} fieldType - 字段类型
   * @param {String} recordId - 记录ID
   * @param {String} userId - 用户ID
   * @returns {Number} 查看次数
   */
  async getViewCount(fieldType, recordId, userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return SecurityAudit.countDocuments({
      'operator.userId': userId,
      'target.targetId': recordId,
      operationDetails: { fieldType },
      createdAt: { $gte: today, $lt: tomorrow },
      result: 'success'
    });
  }

  /**
   * 获取指定类型的规则
   * @param {String} ruleType - 规则类型
   * @returns {Object} 隐私规则
   */
  async getRuleByType(ruleType) {
    const cacheKey = `rule_${ruleType}`;

    // 检查缓存
    if (this.ruleCache.has(cacheKey)) {
      const cached = this.ruleCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // 从数据库查询
    const rule = await PrivacyRule.getRuleByType(ruleType);

    if (rule) {
      this.ruleCache.set(cacheKey, {
        data: rule,
        timestamp: Date.now()
      });
    }

    return rule;
  }

  /**
   * 获取所有启用的规则
   * @returns {Array} 隐私规则列表
   */
  async getActiveRules() {
    return PrivacyRule.getActiveRules();
  }

  /**
   * 创建或更新隐私规则
   * @param {Object} ruleData - 规则数据
   * @param {String} userId - 操作用户ID
   * @returns {Object} 操作结果
   */
  async upsertRule(ruleData, userId) {
    try {
      if (ruleData._id) {
        // 更新现有规则
        const rule = await PrivacyRule.findByIdAndUpdate(
          ruleData._id,
          {
            ...ruleData,
            updatedBy: userId
          },
          { new: true }
        );

        // 清除缓存
        this.clearRuleCache(rule.ruleType);

        return {
          success: true,
          message: '规则更新成功',
          rule
        };
      } else {
        // 创建新规则
        const rule = await PrivacyRule.create({
          ...ruleData,
          createdBy: userId
        });

        return {
          success: true,
          message: '规则创建成功',
          rule
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '操作失败',
        error: error.message
      };
    }
  }

  /**
   * 删除隐私规则
   * @param {String} ruleId - 规则ID
   * @returns {Object} 操作结果
   */
  async deleteRule(ruleId) {
    try {
      const rule = await PrivacyRule.findByIdAndDelete(ruleId);

      if (!rule) {
        return {
          success: false,
          message: '规则不存在'
        };
      }

      // 清除缓存
      this.clearRuleCache(rule.ruleType);

      return {
        success: true,
        message: '规则删除成功'
      };
    } catch (error) {
      return {
        success: false,
        message: '删除失败',
        error: error.message
      };
    }
  }

  /**
   * 获取字段名
   * @param {String} ruleType - 规则类型
   * @returns {String} 字段名
   */
  getFieldName(ruleType) {
    const fieldMap = {
      id_card: 'idCard',
      phone: 'phone',
      bank_card: 'bankCard',
      address: 'address',
      email: 'email',
      name: 'name'
    };
    return fieldMap[ruleType] || ruleType;
  }

  /**
   * 清除规则缓存
   * @param {String} ruleType - 规则类型
   */
  clearRuleCache(ruleType) {
    this.ruleCache.delete(`rule_${ruleType}`);
  }

  /**
   * 清除所有缓存
   */
  clearAllCache() {
    this.ruleCache.clear();
  }
}

// 导出单例
module.exports = new PrivacyProtectionService();
