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

      // 3. 验证验证码
      if (registrationData.verifyCode) {
        const smsService = require('./smsService');
        const isValidCode = smsService.verifyCode(registrationData.basicInfo.phone, registrationData.verifyCode);
        if (!isValidCode) {
          throw new Error('验证码不正确或已过期');
        }
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
      const userData = await this._createUserAccount(purchaser, registrationData.password);

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
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 推荐结果
   */
  async getRecommendations(purchaserId, options = {}) {
    try {
      const purchaser = await Purchaser.findById(purchaserId);

      if (!purchaser) {
        throw new Error('采购商不存在');
      }

      const recommendationQuery = purchaser.getRecommendationQuery();

      // 这里调用智能推荐服务
      const recommendationService = require('./recommendationService');
      const recommendations = await recommendationService.getRecommendationsForPurchaser(recommendationQuery, options);

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
   * 获取采购商统计数据
   * @param {String} purchaserId - 采购商ID
   * @returns {Promise<Object>} 统计数据
   */
  async getPurchaserStats(purchaserId) {
    try {
      const purchaser = await Purchaser.findById(purchaserId);

      if (!purchaser) {
        throw new Error('采购商不存在');
      }

      const Order = require('../models/Order');
      const PurchaseRequirement = require('../models/PurchaseRequirement');
      const SupplierFollow = require('../models/SupplierFollow');
      const Message = require('../models/Message');

      // 获取订单统计
      const pendingOrders = await Order.countDocuments({
        purchaserId,
        status: 'pending'
      });
      const activeOrders = await Order.countDocuments({
        purchaserId,
        status: { $in: ['confirmed', 'shipping'] }
      });

      // 获取未读消息数
      const unreadMessages = await Message.countDocuments({
        recipient: purchaserId,
        read: false
      });

      // 获取新关注供应商数（最近7天）
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const newSuppliers = await SupplierFollow.countDocuments({
        purchaserId,
        createdAt: { $gte: sevenDaysAgo }
      });

      return {
        success: true,
        data: {
          totalOrders: purchaser.statistics?.totalOrders || 0,
          pendingOrders,
          activeOrders,
          suppliers: await SupplierFollow.countDocuments({ purchaserId }),
          newSuppliers,
          totalAmount: purchaser.statistics?.totalPurchaseAmount || 0,
          rating: purchaser.statistics?.averageRating || 0,
          unreadMessages
        }
      };

    } catch (error) {
      logger.error('获取统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取采购商订单列表
   * @param {String} purchaserId - 采购商ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 订单列表
   */
  async getPurchaserOrders(purchaserId, options = {}) {
    try {
      const Order = require('../models/Order');

      const { page = 1, limit = 10, status } = options;

      const query = { purchaserId };
      if (status && status !== 'all') {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('product', 'name images price unit')
          .populate('supplier', 'name avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query)
      ]);

      return {
        success: true,
        data: {
          orders,
          total,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      };

    } catch (error) {
      logger.error('获取订单列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取采购需求列表
   * @param {String} purchaserId - 采购商ID
   * @returns {Promise<Object>} 需求列表
   */
  async getPurchaseRequirements(purchaserId) {
    try {
      const PurchaseRequirement = require('../models/PurchaseRequirement');

      const requirements = await PurchaseRequirement.find({ purchaserId })
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        data: requirements
      };

    } catch (error) {
      logger.error('获取采购需求失败:', error);
      throw error;
    }
  }

  /**
   * 创建采购需求
   * @param {String} purchaserId - 采购商ID
   * @param {Object} requirementData - 需求数据
   * @returns {Promise<Object>} 创建结果
   */
  async createPurchaseRequirement(purchaserId, requirementData) {
    try {
      const PurchaseRequirement = require('../models/PurchaseRequirement');

      const requirement = await PurchaseRequirement.create({
        ...requirementData,
        purchaserId,
        status: 'pending'
      });

      logger.info('创建采购需求成功', { purchaserId, requirementId: requirement._id });

      return {
        success: true,
        data: requirement
      };

    } catch (error) {
      logger.error('创建采购需求失败:', error);
      throw error;
    }
  }

  /**
   * 删除采购需求
   * @param {String} purchaserId - 采购商ID
   * @param {String} requirementId - 需求ID
   * @returns {Promise<Object>} 删除结果
   */
  async deletePurchaseRequirement(purchaserId, requirementId) {
    try {
      const PurchaseRequirement = require('../models/PurchaseRequirement');

      const requirement = await PurchaseRequirement.findOneAndDelete({
        _id: requirementId,
        purchaserId,
        status: 'pending'
      });

      if (!requirement) {
        throw new Error('需求不存在或无法删除');
      }

      logger.info('删除采购需求成功', { purchaserId, requirementId });

      return {
        success: true,
        message: '删除成功'
      };

    } catch (error) {
      logger.error('删除采购需求失败:', error);
      throw error;
    }
  }

  /**
   * 获取关注的供应商列表
   * @param {String} purchaserId - 采购商ID
   * @returns {Promise<Object>} 供应商列表
   */
  async getFollowedSuppliers(purchaserId) {
    try {
      const SupplierFollow = require('../models/SupplierFollow');
      const User = require('../models/User');

      const follows = await SupplierFollow.find({ purchaserId })
        .populate('supplierId', 'name phone avatar location productCategories rating reviewCount verified')
        .sort({ createdAt: -1 })
        .lean();

      const suppliers = follows.map(f => ({
        _id: f.supplierId._id,
        ...f.supplierId,
        followedAt: f.createdAt
      }));

      return {
        success: true,
        data: suppliers
      };

    } catch (error) {
      logger.error('获取供应商列表失败:', error);
      throw error;
    }
  }

  /**
   * 取消关注供应商
   * @param {String} purchaserId - 采购商ID
   * @param {String} supplierId - 供应商ID
   * @returns {Promise<Object>} 取消关注结果
   */
  async followSupplier(purchaserId, supplierId) {
    try {
      const SupplierFollow = require('../models/SupplierFollow');

      // 检查是否已经关注
      const existingFollow = await SupplierFollow.findOne({
        purchaserId,
        supplierId
      });

      if (existingFollow) {
        return {
          success: true,
          message: '已关注'
        };
      }

      // 创建关注记录
      await SupplierFollow.create({
        purchaserId,
        supplierId,
        followTime: new Date()
      });

      logger.info('关注供应商成功', { purchaserId, supplierId });

      return {
        success: true,
        message: '关注成功'
      };

    } catch (error) {
      logger.error('关注失败:', error);
      throw error;
    }
  }

  async unfollowSupplier(purchaserId, supplierId) {
    try {
      const SupplierFollow = require('../models/SupplierFollow');

      await SupplierFollow.findOneAndDelete({
        purchaserId,
        supplierId
      });

      logger.info('取消关注供应商成功', { purchaserId, supplierId });

      return {
        success: true,
        message: '已取消关注'
      };

    } catch (error) {
      logger.error('取消关注失败:', error);
      throw error;
    }
  }

  /**
   * 获取收藏列表
   * @param {String} purchaserId - 采购商ID
   * @returns {Promise<Object>} 收藏列表
   */
  async getFavorites(purchaserId) {
    try {
      const Favorite = require('../models/Favorite');
      const FarmProductSupply = require('../models/FarmProductSupply');

      const favorites = await Favorite.find({ purchaserId })
        .populate('productId')
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        data: favorites
      };

    } catch (error) {
      logger.error('获取收藏列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除收藏
   * @param {String} purchaserId - 采购商ID
   * @param {String} favoriteId - 收藏ID
   * @returns {Promise<Object>} 删除结果
   */
  async removeFavorite(purchaserId, favoriteId) {
    try {
      const Favorite = require('../models/Favorite');

      await Favorite.findOneAndDelete({
        _id: favoriteId,
        purchaserId
      });

      logger.info('删除收藏成功', { purchaserId, favoriteId });

      return {
        success: true,
        message: '已移除收藏'
      };

    } catch (error) {
      logger.error('删除收藏失败:', error);
      throw error;
    }
  }

  /**
   * 获取消息列表
   * @param {String} purchaserId - 采购商ID
   * @returns {Promise<Object>} 消息列表
   */
  async getMessages(purchaserId) {
    try {
      const Message = require('../models/Message');

      const messages = await Message.find({ recipient: purchaserId })
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        data: messages
      };

    } catch (error) {
      logger.error('获取消息列表失败:', error);
      throw error;
    }
  }

  /**
   * 标记消息已读
   * @param {String} purchaserId - 采购商ID
   * @param {String} messageId - 消息ID
   * @returns {Promise<Object>} 标记结果
   */
  async markMessageRead(purchaserId, messageId) {
    try {
      const Message = require('../models/Message');

      await Message.findOneAndUpdate(
        { _id: messageId, recipient: purchaserId },
        { read: true }
      );

      return {
        success: true
      };

    } catch (error) {
      logger.error('标记消息失败:', error);
      throw error;
    }
  }

  /**
   * 标记所有消息已读
   * @param {String} purchaserId - 采购商ID
   * @returns {Promise<Object>} 标记结果
   */
  async markAllMessagesRead(purchaserId) {
    try {
      const Message = require('../models/Message');

      await Message.updateMany(
        { recipient: purchaserId, read: false },
        { read: true }
      );

      return {
        success: true,
        message: '已全部标记为已读'
      };

    } catch (error) {
      logger.error('标记消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取最近动态
   * @param {String} purchaserId - 采购商ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 动态列表
   */
  async getRecentActivities(purchaserId, options = {}) {
    try {
      const { limit = 10 } = options;

      const Order = require('../models/Order');
      const Message = require('../models/Message');

      // 获取最近订单动态
      const recentOrders = await Order.find({ purchaserId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      // 组装动态数据
      const activities = recentOrders.map(order => ({
        _id: order._id,
        type: 'order',
        content: `订单 ${order.orderNumber} 状态更新为 ${this._getOrderStatusLabel(order.status)}`,
        action: '/orders/' + order._id,
        actionText: '查看详情',
        createdAt: order.updatedAt
      }));

      return {
        success: true,
        data: activities
      };

    } catch (error) {
      logger.error('获取动态失败:', error);
      throw error;
    }
  }

  /**
   * 更新偏好设置
   * @param {String} purchaserId - 采购商ID
   * @param {Object} preferences - 偏好设置
   * @returns {Promise<Object>} 更新结果
   */
  async updatePreferences(purchaserId, preferences) {
    try {
      const purchaser = await Purchaser.findByIdAndUpdate(
        purchaserId,
        { $set: { preferences } },
        { new: true }
      );

      if (!purchaser) {
        throw new Error('采购商不存在');
      }

      logger.info('更新偏好设置成功', { purchaserId });

      return {
        success: true,
        data: purchaser.preferences
      };

    } catch (error) {
      logger.error('更新偏好设置失败:', error);
      throw error;
    }
  }

  /**
   * 修改密码
   * @param {String} purchaserId - 采购商ID
   * @param {String} currentPassword - 当前密码
   * @param {String} newPassword - 新密码
   * @returns {Promise<Object>} 修改结果
   */
  async changePassword(purchaserId, currentPassword, newPassword) {
    try {
      const User = require('../models/User');

      const user = await User.findOne({ 'purchaserProfile.purchaserId': purchaserId });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证当前密码
      const bcrypt = require('bcrypt');
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        throw new Error('当前密码不正确');
      }

      // 更新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      logger.info('修改密码成功', { purchaserId });

      return {
        success: true,
        message: '密码修改成功'
      };

    } catch (error) {
      logger.error('修改密码失败:', error);
      throw error;
    }
  }

  /**
   * 获取附近生活服务
   * @param {String} purchaserId - 采购商ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 生活服务列表
   */
  async getNearbyLifestyleServices(purchaserId, options = {}) {
    try {
      const purchaser = await Purchaser.findById(purchaserId);

      if (!purchaser) {
        throw new Error('采购商不存在');
      }

      const {
        category = 'all',
        subCategory = '',
        distance = 5,
        sortBy = 'distance',
        priceLevel = '',
        keyword = ''
      } = options;

      // 获取采购商位置
      const location = purchaser.purchaserType === 'individual'
        ? purchaser.individualInfo?.location
        : purchaser.businessInfo?.location;

      if (!location?.coordinates) {
        throw new Error('请先设置位置信息');
      }

      // 使用地理空间查询附近的商家
      const LifestyleService = require('../models/LifestyleService');
      const maxDistance = distance * 1000; // 转换为米

      let query = {
        location: {
          $near: location.coordinates,
          $maxDistance: maxDistance
        },
        status: 'active'
      };

      // 按分类筛选
      if (category !== 'all') {
        query.category = category;
      }

      // 按子分类筛选
      if (subCategory) {
        query.subCategory = subCategory;
      }

      // 按价格筛选
      if (priceLevel) {
        query.priceLevel = priceLevel;
      }

      // 关键词搜索
      if (keyword) {
        query.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { tags: { $in: [keyword] } },
          { description: { $regex: keyword, $options: 'i' } }
        ];
      }

      let services = await LifestyleService.find(query)
        .sort({ [sortBy]: sortBy === 'distance' ? -1 : -1 })
        .limit(50)
        .lean();

      // 计算距离
      services = services.map(service => {
        const serviceObj = service.toObject();
        serviceObj.distance = this._calculateDistance(
          location.coordinates[1],
          location.coordinates[0],
          serviceObj.location.coordinates[1],
          serviceObj.location.coordinates[0]
        );
        return serviceObj;
      });

      // 二次排序（前端排序）
      if (sortBy === 'rating') {
        services.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === 'price_asc') {
        services.sort((a, b) => (a.avgPrice || 0) - (b.avgPrice || 0));
      }

      logger.info('获取附近生活服务成功', {
        purchaserId,
        count: services.length,
        category
      });

      return {
        success: true,
        data: services
      };

    } catch (error) {
      logger.error('获取附近生活服务失败:', error);
      throw error;
    }
  }

  /**
   * 获取附近推荐商家
   * @param {String} purchaserId - 采购商ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 附近商家列表
   */
  async getNearbySuppliers(purchaserId, options = {}) {
    try {
      const purchaser = await Purchaser.findById(purchaserId);

      if (!purchaser) {
        throw new Error('采购商不存在');
      }

      const {
        latitude,
        longitude,
        radius = 20,
        category = '',
        sortBy = 'distance'
      } = options;

      // 如果没有提供位置坐标，尝试从采购商信息中获取
      let userLocation = { latitude, longitude };
      if (!latitude || !longitude) {
        const location = purchaser.purchaserType === 'individual'
          ? purchaser.individualInfo?.location
          : purchaser.businessInfo?.location;

        if (location?.coordinates) {
          userLocation = {
            latitude: location.coordinates[1],
            longitude: location.coordinates[0]
          };
        }
      }

      // TODO: 实际实现应该从Supplier模型查询
      // 这里返回模拟数据用于演示
      const mockSuppliers = [
        {
          _id: '1',
          name: '绿源农场',
          companyName: '绿源农产品有限公司',
          type: 'business',
          verified: true,
          avatar: '',
          rating: 4.8,
          salesCount: 1520,
          responseRate: 98,
          distance: 3.2,
          categories: ['蔬菜', '水果', '粮食'],
          address: '杭州市西湖区转塘街道',
          featuredProducts: [
            { _id: 'p1', name: '有机白菜', price: '3.5', unit: '斤', image: '' },
            { _id: 'p2', name: '新鲜草莓', price: '25', unit: '斤', image: '' }
          ]
        },
        {
          _id: '2',
          name: '张三种植户',
          type: 'individual',
          verified: true,
          avatar: '',
          rating: 4.6,
          salesCount: 580,
          responseRate: 92,
          distance: 5.8,
          categories: ['蔬菜'],
          address: '杭州市余杭区良渚街道',
          featuredProducts: [
            { _id: 'p3', name: '土鸡蛋', price: '1.5', unit: '个', image: '' }
          ]
        },
        {
          _id: '3',
          name: '丰收农业合作社',
          companyName: '丰收农业专业合作社',
          type: 'business',
          verified: true,
          avatar: '',
          rating: 4.9,
          salesCount: 2300,
          responseRate: 99,
          distance: 12.5,
          categories: ['粮食', '畜禽', '水产'],
          address: '杭州市萧山区瓜沥镇',
          featuredProducts: [
            { _id: 'p4', name: '生态大米', price: '6', unit: '斤', image: '' },
            { _id: 'p5', name: '土鸡', price: '80', unit: '只', image: '' }
          ]
        }
      ];

      // 按类目筛选
      let filteredSuppliers = mockSuppliers;
      if (category) {
        filteredSuppliers = mockSuppliers.filter(supplier =>
          supplier.categories.includes(category)
        );
      }

      // 按距离筛选
      filteredSuppliers = filteredSuppliers.filter(supplier =>
        supplier.distance <= radius
      );

      // 排序
      if (sortBy === 'distance') {
        filteredSuppliers.sort((a, b) => a.distance - b.distance);
      } else if (sortBy === 'rating') {
        filteredSuppliers.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'sales') {
        filteredSuppliers.sort((a, b) => b.salesCount - a.salesCount);
      }

      logger.info('获取附近商家成功', {
        purchaserId,
        count: filteredSuppliers.length,
        category,
        radius
      });

      return {
        success: true,
        data: filteredSuppliers
      };

    } catch (error) {
      logger.error('获取附近商家失败:', error);
      throw error;
    }
  }

  /**
   * 收藏生活服务
   * @param {String} purchaserId - 采购商ID
   * @param {String} serviceId - 服务ID
   * @returns {Promise<Object>} 收藏结果
   */
  async collectLifestyleService(purchaserId, serviceId) {
    try {
      const LifestyleService = require('../models/LifestyleService');

      // 检查服务是否存在
      const service = await LifestyleService.findById(serviceId);
      if (!service) {
        throw new Error('服务不存在');
      }

      // 添加到收藏列表
      const purchaser = await Purchaser.findById(purchaserId);
      if (!purchaser.preferences) {
        purchaser.preferences = {};
      }
      if (!purchaser.preferences.collectedServices) {
        purchaser.preferences.collectedServices = [];
      }

      if (!purchaser.preferences.collectedServices.includes(serviceId)) {
        purchaser.preferences.collectedServices.push(serviceId);
        await purchaser.save();
      }

      logger.info('收藏生活服务成功', { purchaserId, serviceId });

      return {
        success: true,
        message: '收藏成功'
      };

    } catch (error) {
      logger.error('收藏生活服务失败:', error);
      throw error;
    }
  }

  /**
   * 计算两点之间的距离（公里）
   * @private
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 获取订单状态标签
   * @private
   */
  _getOrderStatusLabel(status) {
    const labels = {
      pending: '待付款',
      confirmed: '待发货',
      shipping: '运输中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return labels[status] || status;
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
  async _createUserAccount(purchaser, password = null) {
    try {
      // 如果没有提供密码，使用默认密码（手机号后6位）
      const userPassword = password || purchaser.basicInfo.phone.slice(-6);

      const user = await User.create({
        username: purchaser.basicInfo.phone,
        phone: purchaser.basicInfo.phone,
        password: userPassword,
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
