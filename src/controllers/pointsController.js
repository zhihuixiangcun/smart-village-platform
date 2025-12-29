/**
 * 积分系统控制器
 * 处理积分相关的HTTP请求
 */

const pointsService = require('../services/pointsService');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== 积分账户 ====================

/**
 * 获取我的积分信息（综合）
 */
exports.getMyPoints = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pointsService.getMyPoints(userId);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取用户积分余额
 */
exports.getUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    const balance = await pointsService.getUserBalance(userId);

    return successResponse(res, balance);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 积分获取与消费 ====================

/**
 * 增加积分
 */
exports.addPoints = async (req, res) => {
  try {
    const operatorId = req.user.id;

    const transaction = await pointsService.addPoints(req.body.userId, req.body, operatorId);

    return successResponse(res, transaction, '积分添加成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 兑换积分
 */
exports.redeemPoints = async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemId, quantity } = req.body;

    const result = await pointsService.redeemItem(userId, itemId, quantity);

    return successResponse(res, result, '兑换成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 每日签到
 */
exports.dailyCheckin = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pointsService.dailyCheckin(userId);

    return successResponse(res, result, `签到成功，获得${result.checkin.pointsEarned}积分`);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 积分交易记录 ====================

/**
 * 获取积分交易记录
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const options = {
      transactionType: req.query.type,
      pointsType: req.query.category,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await pointsService.getTransactionHistory(userId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 积分排行榜 ====================

/**
 * 获取积分排行榜
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { villageId } = req.query;
    const options = {
      type: req.query.type || 'balance',
      period: req.query.period || 'all',
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await pointsService.getLeaderboard(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 积分统计 ====================

/**
 * 获取积分统计报告
 */
exports.getStatistics = async (req, res) => {
  try {
    const { villageId } = req.query;
    const period = req.query.period || 'monthly';

    const statistics = await pointsService.getStatistics(villageId, period);

    return successResponse(res, statistics);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 管理员调整积分
 */
exports.adminAdjustPoints = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const operatorId = req.user.id;

    const transaction = await pointsService.adminAdjustPoints(userId, amount, reason, operatorId);

    return successResponse(res, transaction, '积分调整成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 积分规则 ====================

/**
 * 创建默认积分规则
 */
exports.createDefaultRules = async (req, res) => {
  try {
    const { villageId } = req.body;

    const result = await pointsService.createDefaultRules(villageId);

    return successResponse(res, result, `成功创建${result.created}条默认规则`);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 兑换商品管理 ====================

/**
 * 获取可兑换商品列表
 */
exports.getRedemptionItems = async (req, res) => {
  try {
    const { villageId } = req.query;
    const options = {
      category: req.query.category,
      status: req.query.status,
      minPoints: req.query.minPoints,
      maxPoints: req.query.maxPoints,
      sortBy: req.query.sortBy,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await pointsService.getRedemptionItems(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建兑换商品
 */
exports.createRedemptionItem = async (req, res) => {
  try {
    const userId = req.user.id;

    const item = await pointsService.createRedemptionItem(req.body, userId);

    return successResponse(res, item, '商品创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新兑换商品
 */
exports.updateRedemptionItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await pointsService.updateRedemptionItem(itemId, req.body);

    return successResponse(res, item, '商品更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 删除兑换商品
 */
exports.deleteRedemptionItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    await pointsService.deleteRedemptionItem(itemId);

    return successResponse(res, null, '商品删除成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
