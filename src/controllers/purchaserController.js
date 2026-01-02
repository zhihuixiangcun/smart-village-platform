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

    const result = await purchaserService.getRecommendations(purchaserId);

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
