/**
 * 采购商控制器
 *
 * 处理采购商相关的HTTP请求
 */

const purchaserService = require('../services/purchaserService');
const logger = require('../utils/logger');

/**
 * 采购商注册
 * POST /api/v1/purchaser/register
 */
exports.register = async (req, res) => {
  try {
    const files = {
      idCardFront: req.files?.idCardFront?.[0],
      idCardBack: req.files?.idCardBack?.[0],
      businessLicense: req.files?.businessLicense?.[0]
    };

    const result = await purchaserService.registerPurchaser(req.body, files);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: result
    });

  } catch (error) {
    logger.error('采购商注册失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '注册失败'
    });
  }
};

/**
 * 采购商登录
 * POST /api/v1/purchaser/login
 */
exports.login = async (req, res) => {
  try {
    const { phone, idCard } = req.body;

    if (!phone || !idCard) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号和身份证号'
      });
    }

    const result = await purchaserService.loginPurchaser(phone, idCard);

    res.json({
      success: true,
      message: '登录成功',
      data: result
    });

  } catch (error) {
    logger.error('采购商登录失败:', error);
    res.status(401).json({
      success: false,
      message: error.message || '登录失败'
    });
  }
};

/**
 * 获取采购商信息
 * GET /api/v1/purchaser/me
 */
exports.getProfile = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.getPurchaserInfo(purchaserId);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取采购商信息失败:', error);
    res.status(404).json({
      success: false,
      message: error.message || '获取信息失败'
    });
  }
};

/**
 * 更新采购商信息
 * PUT /api/v1/purchaser/me
 */
exports.updateProfile = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.body.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.updatePurchaser(purchaserId, req.body);

    res.json({
      success: true,
      message: '更新成功',
      data: result.data
    });

  } catch (error) {
    logger.error('更新采购商信息失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新失败'
    });
  }
};

/**
 * 获取附近推荐商家
 * GET /api/v1/purchaser/nearby-suppliers
 */
exports.getNearbySuppliers = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const options = {
      latitude: parseFloat(req.query.latitude),
      longitude: parseFloat(req.query.longitude),
      radius: parseInt(req.query.radius) || 20,
      category: req.query.category,
      sortBy: req.query.sortBy || 'distance'
    };

    const result = await purchaserService.getNearbySuppliers(purchaserId, options);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取附近商家失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取附近商家失败'
    });
  }
};

/**
 * 获取智能推荐
 * GET /api/v1/purchaser/recommendations
 */
exports.getRecommendations = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const options = {
      limit: parseInt(req.query.limit) || 10
    };

    const result = await purchaserService.getRecommendations(purchaserId, options);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取推荐失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取推荐失败'
    });
  }
};

/**
 * 获取统计数据
 * GET /api/v1/purchaser/stats
 */
exports.getStats = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.getPurchaserStats(purchaserId);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取统计数据失败'
    });
  }
};

/**
 * 获取订单列表
 * GET /api/v1/purchaser/orders
 */
exports.getOrders = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status
    };

    const result = await purchaserService.getPurchaserOrders(purchaserId, options);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取订单列表失败'
    });
  }
};

/**
 * 确认收货
 * PUT /api/v1/purchaser/orders/:id/confirm
 */
exports.confirmOrder = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const orderId = req.params.id;

    const Order = require('../models/Order');
    const order = await Order.findOneAndUpdate(
      { _id: orderId, purchaserId },
      { status: 'completed' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 更新采购商统计
    const Purchaser = require('../models/Purchaser');
    await Purchaser.findByIdAndUpdate(purchaserId, {
      $inc: { 'statistics.totalOrders': 1 }
    });

    res.json({
      success: true,
      message: '确认收货成功'
    });

  } catch (error) {
    logger.error('确认收货失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '确认收货失败'
    });
  }
};

/**
 * 取消订单
 * PUT /api/v1/purchaser/orders/:id/cancel
 */
exports.cancelOrder = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const orderId = req.params.id;

    const Order = require('../models/Order');
    const order = await Order.findOneAndUpdate(
      { _id: orderId, purchaserId, status: { $in: ['pending', 'confirmed'] } },
      { status: 'cancelled' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在或无法取消'
      });
    }

    res.json({
      success: true,
      message: '订单已取消'
    });

  } catch (error) {
    logger.error('取消订单失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取消订单失败'
    });
  }
};

/**
 * 获取采购需求列表
 * GET /api/v1/purchaser/requirements
 */
exports.getRequirements = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.getPurchaseRequirements(purchaserId);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取采购需求失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取采购需求失败'
    });
  }
};

/**
 * 创建采购需求
 * POST /api/v1/purchaser/requirements
 */
exports.createRequirement = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.createPurchaseRequirement(purchaserId, req.body);

    res.status(201).json({
      success: true,
      message: '发布成功',
      data: result.data
    });

  } catch (error) {
    logger.error('创建采购需求失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '创建采购需求失败'
    });
  }
};

/**
 * 删除采购需求
 * DELETE /api/v1/purchaser/requirements/:id
 */
exports.deleteRequirement = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const requirementId = req.params.id;

    const result = await purchaserService.deletePurchaseRequirement(purchaserId, requirementId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('删除采购需求失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除采购需求失败'
    });
  }
};

/**
 * 获取供应商列表
 * GET /api/v1/purchaser/suppliers
 */
exports.getSuppliers = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.getFollowedSuppliers(purchaserId);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取供应商列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取供应商列表失败'
    });
  }
};

/**
 * 取消关注供应商
 * DELETE /api/v1/purchaser/suppliers/:id
 */
exports.unfollowSupplier = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const supplierId = req.params.id;

    const result = await purchaserService.unfollowSupplier(purchaserId, supplierId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('取消关注失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取消关注失败'
    });
  }
};

/**
 * 关注供应商
 * POST /api/v1/purchaser/suppliers/:id/follow
 */
exports.followSupplier = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const supplierId = req.params.id;

    const result = await purchaserService.followSupplier(purchaserId, supplierId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('关注失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '关注失败'
    });
  }
};

/**
 * 获取收藏列表
 * GET /api/v1/purchaser/favorites
 */
exports.getFavorites = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.getFavorites(purchaserId);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取收藏列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取收藏列表失败'
    });
  }
};

/**
 * 删除收藏
 * DELETE /api/v1/purchaser/favorites/:id
 */
exports.removeFavorite = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const favoriteId = req.params.id;

    const result = await purchaserService.removeFavorite(purchaserId, favoriteId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('删除收藏失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除收藏失败'
    });
  }
};

/**
 * 获取消息列表
 * GET /api/v1/purchaser/messages
 */
exports.getMessages = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.getMessages(purchaserId);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取消息列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取消息列表失败'
    });
  }
};

/**
 * 标记消息已读
 * PUT /api/v1/purchaser/messages/:id/read
 */
exports.markMessageRead = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const messageId = req.params.id;

    const result = await purchaserService.markMessageRead(purchaserId, messageId);

    res.json({
      success: true
    });

  } catch (error) {
    logger.error('标记消息失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '标记消息失败'
    });
  }
};

/**
 * 标记所有消息已读
 * PUT /api/v1/purchaser/messages/read-all
 */
exports.markAllMessagesRead = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;

    const result = await purchaserService.markAllMessagesRead(purchaserId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('标记消息失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '标记消息失败'
    });
  }
};

/**
 * 获取最近动态
 * GET /api/v1/purchaser/activities
 */
exports.getActivities = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const options = {
      limit: parseInt(req.query.limit) || 10
    };

    const result = await purchaserService.getRecentActivities(purchaserId, options);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取动态失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取动态失败'
    });
  }
};

/**
 * 更新偏好设置
 * PUT /api/v1/purchaser/preferences
 */
exports.updatePreferences = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.updatePreferences(purchaserId, req.body);

    res.json({
      success: true,
      message: '设置保存成功',
      data: result.data
    });

  } catch (error) {
    logger.error('更新偏好设置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新设置失败'
    });
  }
};

/**
 * 修改密码
 * PUT /api/v1/purchaser/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供当前密码和新密码'
      });
    }

    const result = await purchaserService.changePassword(purchaserId, currentPassword, newPassword);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('修改密码失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '修改密码失败'
    });
  }
};

/**
 * 获取附近生活服务
 * GET /api/v1/purchaser/lifestyle-services
 */
exports.getLifestyleServices = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId || req.query.purchaserId;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const options = {
      category: req.query.category,
      subCategory: req.query.subCategory,
      distance: parseInt(req.query.distance) || 5,
      sortBy: req.query.sortBy || 'distance',
      priceLevel: req.query.priceLevel,
      keyword: req.query.keyword
    };

    const result = await purchaserService.getNearbyLifestyleServices(purchaserId, options);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取附近生活服务失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取附近生活服务失败'
    });
  }
};

/**
 * 收藏生活服务
 * POST /api/v1/purchaser/lifestyle-services/:id/collect
 */
exports.collectLifestyleService = async (req, res) => {
  try {
    const purchaserId = req.user?.purchaserProfile?.purchaserId;
    const serviceId = req.params.id;

    if (!purchaserId) {
      return res.status(400).json({
        success: false,
        message: '缺少采购商ID'
      });
    }

    const result = await purchaserService.collectLifestyleService(purchaserId, serviceId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('收藏生活服务失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '收藏失败'
    });
  }
};
