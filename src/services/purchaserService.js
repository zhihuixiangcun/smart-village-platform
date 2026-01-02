/**
 * 采购商注册服务
 *
 * 核心功能：
 * - 处理采购商注册（个人/商家）
 * - 身份证OCR识别
 * - 智能推荐相关农产品信息
 */

const Purchaser = require('../models/Purchaser');
const identityCardOCRService = require('./identityCardOCRService');
const User = require('../models/User');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

class PurchaserService {
  /**
   * 采购商注册
   * @param {Object} registrationData - 注册数据
   * @param {Object} files - 上传的文件
   * @returns {Promise<Object>} 注册结果
   */
  async registerPurchaser(registrationData, files = {}) {
    try {
      logger.info('开始处理采购商注册', {
        type: registrationData.purchaserType,
        phone: registrationData.basicInfo?.phone
      });

      // 1. 验证必填字段
      this._validateRegistrationData(registrationData);

      // 2. 检查手机号是否已存在
      const phoneExists = await Purchaser.checkPhoneExists(registrationData.basicInfo.phone);
      if (phoneExists) {
        throw new Error('该手机号已注册');
      }

      // 3. 执行OCR识别（如果提供了身份证图片）
      let ocrResults = { verified: false };
      if (files.idCardFront && files.idCardBack) {
        ocrResults = await this._performOCRVerification(files);
      }

      // 4. 创建采购商记录
      const purchaserData = {
        ...registrationData,
        verification: {
          isVerified: false,
          ocrVerified: ocrResults.verified,
          confidenceScore: ocrResults.confidenceScore
        },
        metadata: {
          ...registrationData.metadata,
          ipAddress: registrationData.metadata?.ipAddress || 'unknown',
          userAgent: registrationData.metadata?.userAgent || 'unknown'
        }
      };

      // 处理上传的文件
      if (files.idCardFront) {
        purchaserData.basicInfo.idCardFront = {
          fileName: files.idCardFront.originalname || files.idCardFront.name,
          fileUrl: files.idCardFront.path || files.idCardFront.location
        };
      }
      if (files.idCardBack) {
        purchaserData.basicInfo.idCardBack = {
          fileName: files.idCardBack.originalname || files.idCardBack.name,
          fileUrl: files.idCardBack.path || files.idCardBack.location
        };
      }
      if (files.businessLicense && registrationData.purchaserType === 'business') {
        purchaserData.businessInfo.businessLicense = {
          fileName: files.businessLicense.originalname || files.businessLicense.name,
          fileUrl: files.businessLicense.path || files.businessLicense.location
        };
      }

      const purchaser = await Purchaser.create(purchaserData);

      logger.info('采购商注册成功', {
        purchaserId: purchaser._id,
        type: purchaser.purchaserType,
        status: purchaser.status
      });

      // 5. 创建对应的User账号用于登录
      const userData = await this._createUserAccount(purchaser);

      return {
        success: true,
        purchaserId: purchaser._id,
        userId: userData._id,
        token: userData.token,
        status: purchaser.status,
        message: '注册成功，等待审核'
      };

    } catch (error) {
      logger.error('采购商注册失败:', error);
      throw error;
    }
  }

  /**
   * 采购商登录
   * @param {String} phone - 手机号
   * @param {String} idCard - 身份证号
   * @returns {Promise<Object>} 登录结果
   */
  async loginPurchaser(phone, idCard) {
    try {
      // 查找采购商
      const purchaser = await Purchaser.findOne({
        'basicInfo.phone': phone,
        status: { $in: ['active', 'pending'] }
      }).select('+basicInfo.idCard');

      if (!purchaser) {
        throw new Error('采购商不存在或账号已禁用');
      }

      // 验证身份证号
      if (purchaser.basicInfo.idCard !== idCard) {
        throw new Error('身份证号不正确');
      }

      // 更新最后登录信息
      purchaser.lastLogin = {
        date: new Date()
      };
      await purchaser.save();

      // 查找关联的User账号
      const user = await User.findOne({ phone, role: 'purchaser' });

      if (!user) {
        throw new Error('用户账号不存在');
      }

      // 生成JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          phone: user.phone,
          role: user.role,
          purchaserId: purchaser._id
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      logger.info('采购商登录成功', {
        purchaserId: purchaser._id,
        phone
      });

      return {
        success: true,
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          purchaserId: purchaser._id,
          purchaserType: purchaser.purchaserType
        },
        purchaser: {
          id: purchaser._id,
          type: purchaser.purchaserType,
          name: purchaser.basicInfo.name,
          status: purchaser.status,
          isVerified: purchaser.verification.isVerified,
          purchaseCategories: purchaser.purchaseCategories
        }
      };

    } catch (error) {
      logger.error('采购商登录失败:', error);
      throw error;
    }
  }

  /**
   * 获取采购商信息
   * @param {String} purchaserId - 采购商ID
   * @returns {Promise<Object>} 采购商信息
   */
  async getPurchaserInfo(purchaserId) {
    try {
      const purchaser = await Purchaser.findById(purchaserId);

      if (!purchaser) {
        throw new Error('采购商不存在');
      }

      return {
        success: true,
        data: purchaser
      };

    } catch (error) {
      logger.error('获取采购商信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新采购商信息
   * @param {String} purchaserId - 采购商ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updatePurchaser(purchaserId, updateData) {
    try {
      const purchaser = await Purchaser.findByIdAndUpdate(
        purchaserId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!purchaser) {
        throw new Error('采购商不存在');
      }

      logger.info('采购商信息更新成功', {
        purchaserId
      });

      return {
        success: true,
        data: purchaser
      };

    } catch (error) {
      logger.error('更新采购商信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取智能推荐
   * @param {String} purchaserId - 采购商ID
   * @returns {Promise<Object>} 推荐结果
   */
  async getRecommendations(purchaserId) {
    try {
      const purchaser = await Purchaser.findById(purchaserId);

      if (!purchaser) {
        throw new Error('采购商不存在');
      }

      const recommendationQuery = purchaser.getRecommendationQuery();

      // 这里调用智能推荐服务
      const recommendationService = require('./recommendationService');
      const recommendations = await recommendationService.getRecommendationsForPurchaser(recommendationQuery);

      return {
        success: true,
        data: recommendations
      };

    } catch (error) {
      logger.error('获取推荐失败:', error);
      throw error;
    }
  }

  /**
   * 验证注册数据
   * @private
   */
  _validateRegistrationData(data) {
    if (!data.purchaserType || !['individual', 'business'].includes(data.purchaserType)) {
      throw new Error('无效的采购商类型');
    }

    if (!data.basicInfo?.name || !data.basicInfo?.phone || !data.basicInfo?.idCard) {
      throw new Error('缺少必填的基本信息');
    }

    // 个人采购商验证
    if (data.purchaserType === 'individual') {
      if (!data.individualInfo?.location) {
        throw new Error('个人采购商必须提供位置信息');
      }
      if (!data.individualInfo?.purchaseCategories || data.individualInfo.purchaseCategories.length === 0) {
        throw new Error('个人采购商必须提供采购类目');
      }
    }

    // 商家采购商验证
    if (data.purchaserType === 'business') {
      if (!data.businessInfo?.companyName) {
        throw new Error('商家采购商必须提供企业名称');
      }
      if (!data.businessInfo?.location) {
        throw new Error('商家采购商必须提供位置信息');
      }
      if (!data.businessInfo?.purchaseCategories || data.businessInfo.purchaseCategories.length === 0) {
        throw new Error('商家采购商必须提供采购类目');
      }
    }
  }

  /**
   * 执行OCR验证
   * @private
   */
  async _performOCRVerification(files) {
    try {
      const results = await identityCardOCRService.recognizeIdCard({
        front: files.idCardFront,
        back: files.idCardBack
      });

      return {
        verified: results.verified,
        confidenceScore: results.confidence
      };

    } catch (error) {
      logger.error('OCR识别失败:', error);
      return { verified: false, confidenceScore: 0 };
    }
  }

  /**
   * 创建User账号
   * @private
   */
  async _createUserAccount(purchaser) {
    try {
      const user = await User.create({
        username: purchaser.basicInfo.phone,
        phone: purchaser.basicInfo.phone,
        name: purchaser.basicInfo.name,
        role: 'purchaser',
        status: purchaser.status === 'active' ? 'active' : 'pending',
        purchaserProfile: {
          purchaserId: purchaser._id,
          purchaserType: purchaser.purchaserType
        }
      });

      // 生成JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          phone: user.phone,
          role: user.role,
          purchaserId: purchaser._id
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      // 关联采购商ID到用户
      purchaser.metadata = purchaser.metadata || {};
      purchaser.metadata.userId = user._id;
      await purchaser.save();

      return { ...user.toObject(), token };

    } catch (error) {
      logger.error('创建用户账号失败:', error);
      throw new Error(`创建用户账号失败: ${error.message}`);
    }
  }
}

module.exports = new PurchaserService();
