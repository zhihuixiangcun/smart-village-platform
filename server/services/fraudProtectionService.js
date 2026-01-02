/**
 * 防诈骗服务
 * 提供诈骗电话检测、号码库管理、反诈平台对接等功能
 */

const FraudNumber = require('../models/FraudNumber');
const SecurityAudit = require('../models/SecurityAudit');
const axios = require('axios');

class FraudProtectionService {
  constructor() {
    // 反诈平台API配置（示例）
    this.antiFraudAPI = {
      baseURL: process.env.ANTI_FRAUD_API_URL || 'https://api.antifraud.example.com',
      apiKey: process.env.ANTI_FRAUD_API_KEY || '',
      timeout: 5000
    };

    // 本地缓存
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 检测来电号码是否为诈骗号码
   * @param {String} phoneNumber - 电话号码
   * @param {Object} user - 检测用户信息
   * @returns {Object} 检测结果
   */
  async checkPhoneNumber(phoneNumber, user = null) {
    try {
      // 1. 检查本地缓存
      const cacheKey = `fraud_${phoneNumber}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // 2. 查询本地数据库
      const localFraud = await FraudNumber.findOne({
        phoneNumber,
        status: 'active'
      });

      if (localFraud) {
        const result = {
          isFraud: true,
          riskLevel: localFraud.riskLevel,
          riskLevelName: localFraud.riskLevelName,
          fraudType: localFraud.fraudType,
          fraudTypeName: localFraud.fraudTypeName,
          reportCount: localFraud.reportCount,
          description: localFraud.description,
          preventionTips: localFraud.caseDetails?.preventionTips || [],
          source: 'local_database'
        };

        // 记录拦截
        await localFraud.recordBlock();

        // 更新缓存
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        // 记录审计日志
        if (user) {
          await SecurityAudit.log({
            operationType: 'fraud_detected',
            operationName: '检测到诈骗电话',
            operator: {
              userId: user._id,
              userName: user.name,
              userRole: user.role
            },
            ipAddress: user.ip || 'unknown',
            operationDetails: {
              phoneNumber,
              fraudType: localFraud.fraudType,
              riskLevel: localFraud.riskLevel
            },
            sensitivityLevel: 'medium',
            result: 'success'
          });
        }

        return result;
      }

      // 3. 查询反诈平台API（如果配置了）
      if (this.antiFraudAPI.apiKey) {
        const apiResult = await this.queryAntiFraudAPI(phoneNumber);
        if (apiResult.isFraud) {
          return apiResult;
        }
      }

      // 4. 未检测到风险
      const safeResult = {
        isFraud: false,
        riskLevel: 'low',
        riskLevelName: '低风险',
        phoneNumber,
        source: 'safe'
      };

      this.cache.set(cacheKey, {
        data: safeResult,
        timestamp: Date.now()
      });

      return safeResult;
    } catch (error) {
      console.error('Error checking phone number:', error);
      // 发生错误时，为了安全起见，返回中风险提示
      return {
        isFraud: false,
        riskLevel: 'medium',
        riskLevelName: '无法确定',
        phoneNumber,
        error: error.message
      };
    }
  }

  /**
   * 查询反诈平台API
   * @param {String} phoneNumber - 电话号码
   * @returns {Object} API查询结果
   */
  async queryAntiFraudAPI(phoneNumber) {
    try {
      const response = await axios.post(
        `${this.antiFraudAPI.baseURL}/check`,
        { phoneNumber },
        {
          headers: {
            'Authorization': `Bearer ${this.antiFraudAPI.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.antiFraudAPI.timeout
        }
      );

      if (response.data && response.data.isFraud) {
        // 如果API返回诈骗号码，同步到本地数据库
        await this.syncToLocalDatabase(phoneNumber, response.data);

        return {
          isFraud: true,
          ...response.data,
          source: 'anti_fraud_api'
        };
      }

      return { isFraud: false, source: 'anti_fraud_api' };
    } catch (error) {
      console.error('Error querying anti-fraud API:', error.message);
      return { isFraud: false, error: error.message };
    }
  }

  /**
   * 同步诈骗号码到本地数据库
   * @param {String} phoneNumber - 电话号码
   * @param {Object} apiData - API返回的数据
   */
  async syncToLocalDatabase(phoneNumber, apiData) {
    try {
      // 检查是否已存在
      const existing = await FraudNumber.findOne({ phoneNumber });

      if (existing) {
        // 更新现有记录
        existing.reportCount += apiData.reportCount || 1;
        existing.dataSource = 'police_api';
        existing.verified = true;
        existing.verifiedAt = new Date();
        await existing.save();
      } else {
        // 创建新记录
        await FraudNumber.create({
          phoneNumber,
          fraudType: apiData.fraudType || 'other',
          fraudTypeName: apiData.fraudTypeName || '其他',
          riskLevel: apiData.riskLevel || 'medium',
          riskLevelName: apiData.riskLevelName || '中风险',
          reportCount: apiData.reportCount || 1,
          description: apiData.description,
          dataSource: 'police_api',
          verified: true,
          verifiedAt: new Date(),
          status: 'active'
        });
      }
    } catch (error) {
      console.error('Error syncing to local database:', error);
    }
  }

  /**
   * 举报诈骗号码
   * @param {String} phoneNumber - 电话号码
   * @param {Object} reporter - 举报人信息
   * @param {Object} reportData - 举报详情
   * @returns {Object} 举报结果
   */
  async reportFraudNumber(phoneNumber, reporter, reportData) {
    try {
      // 1. 查找或创建诈骗号码记录
      let fraudNumber = await FraudNumber.findOne({ phoneNumber });

      if (fraudNumber) {
        // 添加举报记录
        await fraudNumber.addReport({
          userId: reporter._id,
          userName: reporter.name,
          reason: reportData.reason,
          lossAmount: reportData.lossAmount
        });
      } else {
        // 创建新记录
        fraudNumber = await FraudNumber.create({
          phoneNumber,
          fraudType: reportData.fraudType || 'other',
          fraudTypeName: reportData.fraudTypeName || '其他',
          riskLevel: 'medium',
          riskLevelName: '中风险',
          reportCount: 1,
          reporters: [{
            userId: reporter._id,
            userName: reporter.name,
            reportTime: new Date(),
            reportReason: reportData.reason,
            lossAmount: reportData.lossAmount || 0
          }],
          description: reportData.description,
          dataSource: 'user_report',
          status: 'active',
          createdBy: reporter._id
        });
      }

      // 2. 提交到反诈平台（如果配置了）
      if (this.antiFraudAPI.apiKey) {
        await this.submitToAntiFraudPlatform(phoneNumber, reportData);
      }

      // 3. 清除缓存
      this.cache.delete(`fraud_${phoneNumber}`);

      // 4. 记录审计日志
      await SecurityAudit.log({
        operationType: 'fraud_detected',
        operationName: '举报诈骗号码',
        operator: {
          userId: reporter._id,
          userName: reporter.name,
          userRole: reporter.role
        },
        ipAddress: reporter.ip || 'unknown',
        operationDetails: {
          phoneNumber,
          fraudType: fraudNumber.fraudType,
          reportReason: reportData.reason
        },
        sensitivityLevel: 'low',
        result: 'success'
      });

      return {
        success: true,
        message: '举报成功，感谢您的反馈',
        fraudNumber
      };
    } catch (error) {
      console.error('Error reporting fraud number:', error);
      return {
        success: false,
        message: '举报失败，请稍后重试',
        error: error.message
      };
    }
  }

  /**
   * 提交到反诈平台
   * @param {String} phoneNumber - 电话号码
   * @param {Object} reportData - 举报数据
   */
  async submitToAntiFraudPlatform(phoneNumber, reportData) {
    try {
      await axios.post(
        `${this.antiFraudAPI.baseURL}/report`,
        {
          phoneNumber,
          ...reportData
        },
        {
          headers: {
            'Authorization': `Bearer ${this.antiFraudAPI.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.antiFraudAPI.timeout
        }
      );
    } catch (error) {
      console.error('Error submitting to anti-fraud platform:', error.message);
    }
  }

  /**
   * 获取诈骗号码列表
   * @param {Object} filters - 过滤条件
   * @returns {Array} 诈骗号码列表
   */
  async getFraudNumbers(filters = {}) {
    const {
      fraudType,
      riskLevel,
      status = 'active',
      verified,
      page = 1,
      limit = 20,
      sortBy = 'reportCount',
      sortOrder = 'desc'
    } = filters;

    const query = { status };

    if (fraudType) query.fraudType = fraudType;
    if (riskLevel) query.riskLevel = riskLevel;
    if (verified !== undefined) query.verified = verified;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [numbers, total] = await Promise.all([
      FraudNumber.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      FraudNumber.countDocuments(query)
    ]);

    return {
      data: numbers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取诈骗类型统计
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Array} 统计数据
   */
  async getFraudStats(startDate, endDate) {
    const stats = await FraudNumber.getFraudTypeStats();

    // 获取趋势数据
    const trendData = await FraudNumber.getTrendData(
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    );

    return {
      byType: stats,
      trend: trendData
    };
  }

  /**
   * 验证诈骗号码
   * @param {String} fraudNumberId - 诈骗号码ID
   * @param {String} verifiedBy - 验证人ID
   * @returns {Object} 验证结果
   */
  async verifyFraudNumber(fraudNumberId, verifiedBy) {
    try {
      const fraudNumber = await FraudNumber.findById(fraudNumberId);

      if (!fraudNumber) {
        return {
          success: false,
          message: '诈骗号码记录不存在'
        };
      }

      await fraudNumber.verify(verifiedBy);

      return {
        success: true,
        message: '验证成功',
        fraudNumber
      };
    } catch (error) {
      return {
        success: false,
        message: '验证失败',
        error: error.message
      };
    }
  }

  /**
   * 获取高危号码列表
   * @returns {Array} 高危号码列表
   */
  async getHighRiskNumbers() {
    return FraudNumber.getHighRiskNumbers();
  }

  /**
   * 更新诈骗号码状态
   * @param {String} fraudNumberId - 诈骗号码ID
   * @param {String} status - 新状态
   * @param {String} reason - 原因
   * @returns {Object} 更新结果
   */
  async updateStatus(fraudNumberId, status, reason) {
    try {
      const fraudNumber = await FraudNumber.findById(fraudNumberId);

      if (!fraudNumber) {
        return {
          success: false,
          message: '诈骗号码记录不存在'
        };
      }

      fraudNumber.status = status;
      fraudNumber.notes = reason || fraudNumber.notes;
      await fraudNumber.save();

      // 清除缓存
      this.cache.delete(`fraud_${fraudNumber.phoneNumber}`);

      return {
        success: true,
        message: '状态更新成功',
        fraudNumber
      };
    } catch (error) {
      return {
        success: false,
        message: '状态更新失败',
        error: error.message
      };
    }
  }

  /**
   * 批量导入诈骗号码
   * @param {Array} numbers - 号码列表
   * @param {String} userId - 操作用户ID
   * @returns {Object} 导入结果
   */
  async bulkImport(numbers, userId) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const item of numbers) {
      try {
        await FraudNumber.create({
          ...item,
          createdBy: userId,
          status: 'active'
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          phoneNumber: item.phoneNumber,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

// 导出单例
module.exports = new FraudProtectionService();
