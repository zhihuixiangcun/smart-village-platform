/**
 * 二维码管理系统
 * 负责户一码的生成、验证、权限控制和安全管理
 */

const crypto = require('crypto');
const qrcode = require('qrcode');
const Household = require('../models/Household');
const User = require('../models/User');
const logger = require('../config/logger');

class QRCodeService {
  constructor() {
    // 二维码配置
    this.qrConfig = {
      errorCorrectionLevel: 'H', // 高纠错级别
      type: 'image/png',
      quality: 0.9,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    };

    // 访问令牌配置
    this.tokenConfig = {
      algorithm: 'HS256',
      expiresIn: '365d', // 1年有效期
      issuer: 'smart-village-platform'
    };

    // 权限级别定义
    this.permissionLevels = {
      PUBLIC: 0,     // 公开访问
      NEIGHBOR: 1,   // 邻居访问
      RELATIVE: 2,   // 亲属访问
      FAMILY: 3,     // 家庭成员访问
      ADMIN: 4       // 管理员访问
    };
  }

  /**
   * 生成户一码
   * @param {string} householdId - 家庭ID
   * @param {Object} options - 生成选项
   * @returns {Promise<Object>} 二维码信息
   */
  async generateHouseholdQRCode(householdId, options = {}) {
    try {
      logger.info(`开始生成户一码: ${householdId}`);

      // 1. 验证家庭是否存在
      const household = await Household.findOne({
        _id: householdId,
        status: 'active'
      }).populate('householder.userId');

      if (!household) {
        throw new Error('家庭不存在或状态不活跃');
      }

      // 2. 检查是否需要重新生成（过期或达到使用次数限制）
      if (this.shouldRegenerateQRCode(household, options)) {
        // 生成新的访问令牌
        const accessToken = this.generateAccessToken(household, options);

        // 更新二维码信息
        household.qrCode = {
          codeData: JSON.stringify(this.createQRCodeData(household, accessToken)),
          accessToken,
          expiryDate: this.calculateExpiryDate(options.validityDays || 365),
          version: options.version || '1.0',
          lastGenerated: new Date(),
          usageCount: 0,
          maxUsage: options.maxUsage || 1000
        };

        await household.save();
      }

      // 3. 生成二维码图片
      const qrCodeImage = await this.generateQRCodeImage(household.qrCode.codeData);

      // 4. 记录生成历史
      await this.recordQRCodeGeneration(household, options);

      logger.info(`户一码生成成功: ${household.codeId}`);

      return {
        householdId: household._id,
        codeId: household.codeId,
        qrCodeImage,
        qrCodeData: household.qrCode.codeData,
        expiryDate: household.qrCode.expiryDate,
        usageCount: household.qrCode.usageCount,
        maxUsage: household.qrCode.maxUsage,
        version: household.qrCode.version
      };

    } catch (error) {
      logger.error('生成户一码失败:', error);
      throw error;
    }
  }

  /**
   * 验证二维码
   * @param {string} qrCodeData - 二维码数据
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 验证结果
   */
  async verifyQRCode(qrCodeData, options = {}) {
    try {
      logger.info('开始验证二维码');

      // 1. 解析二维码数据
      let parsedData;
      try {
        parsedData = JSON.parse(qrCodeData);
      } catch (parseError) {
        return {
          valid: false,
          reason: '二维码数据格式错误',
          error: 'invalid_format'
        };
      }

      // 2. 验证必要字段
      const requiredFields = ['codeId', 'accessToken', 'expiryDate', 'version'];
      const missingFields = requiredFields.filter(field => !parsedData[field]);

      if (missingFields.length > 0) {
        return {
          valid: false,
          reason: `缺少必要字段: ${missingFields.join(', ')}`,
          error: 'missing_fields'
        };
      }

      // 3. 验证访问令牌
      const tokenValidation = this.validateAccessToken(
        parsedData.accessToken,
        parsedData.codeId
      );

      if (!tokenValidation.valid) {
        return {
          valid: false,
          reason: tokenValidation.reason,
          error: 'invalid_token'
        };
      }

      // 4. 查找家庭信息
      const household = await Household.findOne({
        codeId: parsedData.codeId,
        status: 'active'
      }).populate('householder.userId');

      if (!household) {
        return {
          valid: false,
          reason: '家庭不存在或状态不活跃',
          error: 'household_not_found'
        };
      }

      // 5. 检查二维码是否过期
      if (new Date() > household.qrCode.expiryDate) {
        return {
          valid: false,
          reason: '二维码已过期',
          error: 'expired'
        };
      }

      // 6. 检查使用次数限制
      if (household.qrCode.usageCount >= household.qrCode.maxUsage) {
        return {
          valid: false,
          reason: '二维码使用次数已达上限',
          error: 'usage_limit_exceeded'
        };
      }

      // 7. 获取用户权限级别
      const userPermission = await this.getUserPermissionLevel(
        options.requesterId,
        household
      );

      // 8. 根据权限级别过滤数据
      const filteredData = this.filterDataByPermission(household, userPermission);

      // 9. 更新使用统计
      await this.updateQRCodeUsage(household, options);

      // 10. 记录访问历史
      await this.recordQRCodeAccess(household, options, userPermission);

      logger.info(`二维码验证成功: ${household.codeId}, 权限级别: ${userPermission}`);

      return {
        valid: true,
        household: filteredData,
        permissionLevel: userPermission,
        usageCount: household.qrCode.usageCount + 1,
        remainingUsage: household.qrCode.maxUsage - household.qrCode.usageCount - 1,
        expiryDate: household.qrCode.expiryDate
      };

    } catch (error) {
      logger.error('验证二维码失败:', error);
      return {
        valid: false,
        reason: '服务器内部错误',
        error: 'server_error'
      };
    }
  }

  /**
   * 创建二维码数据结构
   * @param {Object} household - 家庭信息
   * @param {string} accessToken - 访问令牌
   * @returns {Object} 二维码数据
   */
  createQRCodeData(household, accessToken) {
    return {
      codeId: household.codeId,
      accessToken,
      expiryDate: household.qrCode.expiryDate.toISOString(),
      version: household.qrCode.version,
      generatedAt: new Date().toISOString(),
      platform: 'smart-village-platform',
      metadata: {
        householdType: 'rural_household',
        dataVersion: '1.0'
      }
    };
  }

  /**
   * 生成访问令牌
   * @param {Object} household - 家庭信息
   * @param {Object} options - 选项
   * @returns {string} 访问令牌
   */
  generateAccessToken(household, options = {}) {
    const payload = {
      codeId: household.codeId,
      householdId: household._id.toString(),
      villageId: household.villageId,
      generatedAt: Math.floor(Date.now() / 1000),
      issuer: this.tokenConfig.issuer,
      audience: 'smart-village-platform'
    };

    // 添加自定义选项
    if (options.customData) {
      payload.customData = options.customData;
    }

    // 生成签名
    const signature = crypto
      .createHmac('sha256', process.env.QR_CODE_SECRET || 'default-secret')
      .update(JSON.stringify(payload))
      .digest('hex');

    return `${Buffer.from(JSON.stringify(payload)).toString('base64')}.${signature}`;
  }

  /**
   * 验证访问令牌
   * @param {string} token - 访问令牌
   * @param {string} codeId - 户码ID
   * @returns {Object} 验证结果
   */
  validateAccessToken(token, codeId) {
    try {
      const [payloadBase64, signature] = token.split('.');

      if (!payloadBase64 || !signature) {
        return { valid: false, reason: '令牌格式错误' };
      }

      // 验证签名
      const expectedSignature = crypto
        .createHmac('sha256', process.env.QR_CODE_SECRET || 'default-secret')
        .update(payloadBase64)
        .digest('hex');

      if (signature !== expectedSignature) {
        return { valid: false, reason: '令牌签名无效' };
      }

      // 解析载荷
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

      // 验证基本字段
      if (payload.codeId !== codeId) {
        return { valid: false, reason: '户码ID不匹配' };
      }

      if (payload.issuer !== this.tokenConfig.issuer) {
        return { valid: false, reason: '令牌发行者无效' };
      }

      // 检查令牌时效性（可选）
      const now = Math.floor(Date.now() / 1000);
      const maxAge = 365 * 24 * 60 * 60; // 1年

      if (now - payload.generatedAt > maxAge) {
        return { valid: false, reason: '令牌已过期' };
      }

      return { valid: true, payload };

    } catch (error) {
      return { valid: false, reason: '令牌解析失败' };
    }
  }

  /**
   * 判断是否需要重新生成二维码
   * @param {Object} household - 家庭信息
   * @param {Object} options - 选项
   * @returns {boolean} 是否需要重新生成
   */
  shouldRegenerateQRCode(household, options) {
    // 强制重新生成
    if (options.forceRegenerate) {
      return true;
    }

    // 检查是否有现有的二维码
    if (!household.qrCode || !household.qrCode.accessToken) {
      return true;
    }

    // 检查是否过期
    if (new Date() > household.qrCode.expiryDate) {
      return true;
    }

    // 检查是否接近使用上限（剩余10%）
    const remainingPercentage = (household.qrCode.maxUsage - household.qrCode.usageCount) / household.qrCode.maxUsage;
    if (remainingPercentage < 0.1) {
      return true;
    }

    return false;
  }

  /**
   * 计算过期日期
   * @param {number} days - 有效天数
   * @returns {Date} 过期日期
   */
  calculateExpiryDate(days) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  /**
   * 生成二维码图片
   * @param {string} data - 二维码数据
   * @returns {Promise<string>} Base64编码的图片
   */
  async generateQRCodeImage(data) {
    try {
      const qrCodeBuffer = await qrcode.toBuffer(data, this.qrConfig);
      return `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;
    } catch (error) {
      logger.error('生成二维码图片失败:', error);
      throw new Error('二维码图片生成失败');
    }
  }

  /**
   * 获取用户权限级别
   * @param {string} requesterId - 请求者ID
   * @param {Object} household - 家庭信息
   * @returns {Promise<number>} 权限级别
   */
  async getUserPermissionLevel(requesterId, household) {
    if (!requesterId) {
      return this.permissionLevels.PUBLIC;
    }

    try {
      const user = await User.findById(requesterId);

      if (!user) {
        return this.permissionLevels.PUBLIC;
      }

      // 管理员权限
      if (user.role === 'super_admin' || user.role === 'village_admin') {
        return this.permissionLevels.ADMIN;
      }

      // 村委权限（同村）
      if (user.role === 'department_head' && user.village.villageId === household.villageId) {
        return this.permissionLevels.ADMIN;
      }

      // 家庭成员权限
      if (user._id.equals(household.householder.userId) ||
          household.members.some(m => m.userId && m.userId.equals(user._id))) {
        return this.permissionLevels.FAMILY;
      }

      // 亲属权限（通过血缘关系验证）
      const bloodRelationService = require('./bloodRelationService');
      const userHousehold = await Household.findFamilyByIdCard(user.profile.idCard);

      if (userHousehold) {
        const relation = await bloodRelationService.verifyBloodRelationship(
          user.profile.idCard,
          household.householder.idCard
        );

        if (relation.valid && relation.confidence > 0.7) {
          return this.permissionLevels.RELATIVE;
        }
      }

      // 邻居权限（同村同组）
      if (user.village.villageId === household.villageId &&
          user.village.address.group === household.address.group) {
        return this.permissionLevels.NEIGHBOR;
      }

      // 同村村民权限
      if (user.village.villageId === household.villageId) {
        return this.permissionLevels.PUBLIC;
      }

      return this.permissionLevels.PUBLIC;

    } catch (error) {
      logger.error('获取用户权限级别失败:', error);
      return this.permissionLevels.PUBLIC;
    }
  }

  /**
   * 根据权限过滤数据
   * @param {Object} household - 家庭信息
   * @param {number} permissionLevel - 权限级别
   * @returns {Object} 过滤后的数据
   */
  filterDataByPermission(household, permissionLevel) {
    const data = household.sanitizeData('villager');

    // 根据权限级别进一步过滤
    switch (permissionLevel) {
    case this.permissionLevels.PUBLIC:
      // 公开信息
      return {
        codeId: data.codeId,
        householder: {
          name: data.householder.name
        },
        address: {
          province: data.address.province,
          city: data.address.city,
          county: data.address.county,
          township: data.address.township,
          village: data.address.village
        },
        specialTags: data.specialTags,
        demographics: data.demographics,
        totalMembers: data.totalFamilyMembers
      };

    case this.permissionLevels.NEIGHBOR:
      // 邻居信息
      return {
        ...this.filterDataByPermission(household, this.permissionLevels.PUBLIC),
        address: {
          ...data.address,
          group: data.address.group
        },
        specialTags: data.specialTags
      };

    case this.permissionLevels.RELATIVE:
      // 亲属信息
      return {
        codeId: data.codeId,
        householder: {
          name: data.householder.name,
          phone: data.householder.phone ? this.maskPhone(data.householder.phone) : null
        },
        members: data.members.map(member => ({
          name: member.name,
          relationship: member.relationship,
          phone: member.phone ? this.maskPhone(member.phone) : null
        })),
        address: data.address,
        specialTags: data.specialTags,
        demographics: data.demographics
      };

    case this.permissionLevels.FAMILY:
      // 家庭成员信息
      return data;

    case this.permissionLevels.ADMIN:
      // 管理员信息
      return household.toObject();

    default:
      return this.filterDataByPermission(household, this.permissionLevels.PUBLIC);
    }
  }

  /**
   * 手机号脱敏
   * @param {string} phone - 手机号
   * @returns {string} 脱敏后的手机号
   */
  maskPhone(phone) {
    if (!phone || phone.length !== 11) return phone;
    return `${phone.substring(0, 3)  }****${  phone.substring(7)}`;
  }

  /**
   * 更新二维码使用统计
   * @param {Object} household - 家庭信息
   * @param {Object} options - 选项
   */
  async updateQRCodeUsage(household, options = {}) {
    try {
      household.qrCode.usageCount += 1;
      await household.save();
    } catch (error) {
      logger.error('更新二维码使用统计失败:', error);
    }
  }

  /**
   * 记录二维码生成历史
   * @param {Object} household - 家庭信息
   * @param {Object} options - 选项
   */
  async recordQRCodeGeneration(household, options = {}) {
    try {
      const history = {
        householdId: household._id,
        codeId: household.codeId,
        action: 'generate_qr_code',
        timestamp: new Date(),
        operatorId: options.operatorId,
        operatorName: options.operatorName,
        details: {
          version: household.qrCode.version,
          expiryDate: household.qrCode.expiryDate,
          maxUsage: household.qrCode.maxUsage
        }
      };

      // TODO: 保存到审计日志表
      logger.info('二维码生成历史记录:', history);
    } catch (error) {
      logger.error('记录二维码生成历史失败:', error);
    }
  }

  /**
   * 记录二维码访问历史
   * @param {Object} household - 家庭信息
   * @param {Object} options - 选项
   * @param {number} permissionLevel - 权限级别
   */
  async recordQRCodeAccess(household, options = {}, permissionLevel) {
    try {
      const access = {
        householdId: household._id,
        codeId: household.codeId,
        action: 'qr_code_access',
        timestamp: new Date(),
        requesterId: options.requesterId,
        permissionLevel,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        details: {
          usageCount: household.qrCode.usageCount,
          remainingUsage: household.qrCode.maxUsage - household.qrCode.usageCount
        }
      };

      // TODO: 保存到访问日志表
      logger.info('二维码访问历史记录:', access);
    } catch (error) {
      logger.error('记录二维码访问历史失败:', error);
    }
  }

  /**
   * 批量生成二维码
   * @param {Array} householdIds - 家庭ID数组
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 批量结果
   */
  async batchGenerateQRCodes(householdIds, options = {}) {
    try {
      logger.info(`开始批量生成二维码: ${householdIds.length}个家庭`);

      const results = [];

      for (const householdId of householdIds) {
        try {
          const result = await this.generateHouseholdQRCode(householdId, options);
          results.push({
            householdId,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            householdId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      logger.info(`批量生成二维码完成: 成功${successCount}个, 失败${failureCount}个`);

      return {
        total: householdIds.length,
        success: successCount,
        failure: failureCount,
        results
      };

    } catch (error) {
      logger.error('批量生成二维码失败:', error);
      throw error;
    }
  }

  /**
   * 获取二维码统计信息
   * @param {string} villageId - 村庄ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计信息
   */
  async getQRCodeStatistics(villageId, filters = {}) {
    try {
      const matchConditions = {
        villageId,
        status: 'active'
      };

      if (filters.codeId) {
        matchConditions.codeId = filters.codeId;
      }

      if (filters.householderName) {
        matchConditions['householder.name'] = { $regex: filters.householderName, $options: 'i' };
      }

      const households = await Household.find(matchConditions);

      const statistics = {
        totalHouseholds: households.length,
        householdsWithQRCode: 0,
        totalUsageCount: 0,
        averageUsage: 0,
        expiredQRCodeCount: 0,
        nearExpiryQRCodeCount: 0,
        highUsageQRCodeCount: 0,
        qrCodesByVersion: {},
        qrCodesByMonth: {}
      };

      const now = new Date();
      const nearExpiryThreshold = new Date();
      nearExpiryThreshold.setDate(nearExpiryThreshold.getDate() + 30); // 30天内过期

      households.forEach(household => {
        if (household.qrCode && household.qrCode.accessToken) {
          statistics.householdsWithQRCode++;
          statistics.totalUsageCount += household.qrCode.usageCount;

          // 统计过期二维码
          if (now > household.qrCode.expiryDate) {
            statistics.expiredQRCodeCount++;
          }

          // 统计接近过期的二维码
          if (household.qrCode.expiryDate <= nearExpiryThreshold) {
            statistics.nearExpiryQRCodeCount++;
          }

          // 统计高使用量二维码
          const usagePercentage = household.qrCode.usageCount / household.qrCode.maxUsage;
          if (usagePercentage > 0.8) {
            statistics.highUsageQRCodeCount++;
          }

          // 按版本统计
          const version = household.qrCode.version || 'unknown';
          statistics.qrCodesByVersion[version] = (statistics.qrCodesByVersion[version] || 0) + 1;

          // 按月份统计
          const month = household.qrCode.lastGenerated.toISOString().substring(0, 7);
          statistics.qrCodesByMonth[month] = (statistics.qrCodesByMonth[month] || 0) + 1;
        }
      });

      // 计算平均使用量
      if (statistics.householdsWithQRCode > 0) {
        statistics.averageUsage = statistics.totalUsageCount / statistics.householdsWithQRCode;
      }

      return statistics;

    } catch (error) {
      logger.error('获取二维码统计信息失败:', error);
      throw error;
    }
  }
}

module.exports = QRCodeService;