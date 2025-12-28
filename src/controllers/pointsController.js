/**
 * 积分系统控制器
 * 处理积分相关的HTTP请求
 */

const pointsService = require('../services/points/PointsService');
const { asyncHandler } = require('../middleware/asyncHandler');
const logger = require('../services/logger');

/**
 * 获取用户积分余额
 */
const getUserBalance = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { villageId } = req.query;

  // 如果没有传userId，使用当前登录用户
  const targetUserId = userId || req.user?.id;

  if (!targetUserId) {
    return res.status(400).json({
      success: false,
      message: '用户ID不能为空'
    });
  }

  if (!villageId && !req.villageId) {
    return res.status(400).json({
      success: false,
      message: '村ID不能为空'
    });
  }

  const balance = await pointsService.getUserBalance(targetUserId, villageId || req.villageId);

  res.json({
    success: true,
    data: balance
  });
});

/**
 * 增加积分
 */
const addPoints = asyncHandler(async (req, res) => {
  const { userId, villageId, category, amount, description, metadata } = req.body;

  // 验证必填字段
  if (!userId || !villageId || !category || amount === undefined) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段: userId, villageId, category, amount'
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      message: '积分数量必须大于0'
    });
  }

  const transaction = await pointsService.addPoints(
    userId,
    villageId,
    category,
    amount,
    description || `获得积分: ${category}`,
    metadata || {}
  );

  res.status(201).json({
    success: true,
    message: '积分添加成功',
    data: transaction
  });
});

/**
 * 兑换积分
 */
const redeemPoints = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { itemId } = req.body;

  if (!itemId) {
    return res.status(400).json({
      success: false,
      message: '缺少商品ID'
    });
  }

  const transaction = await pointsService.redeemPoints(
    userId || req.user?.id,
    req.villageId,
    itemId
  );

  res.json({
    success: true,
    message: '兑换成功',
    data: transaction
  });
});

/**
 * 获取积分历史记录
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { type, category, page = 1, limit = 20, startDate, endDate } = req.query;

  const history = await pointsService.getTransactionHistory(
    userId || req.user?.id,
    req.villageId,
    {
      type,
      category,
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate
    }
  );

  res.json({
    success: true,
    data: history
  });
});

/**
 * 获取积分排行榜
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const { type = 'balance', period = 'all', page = 1, limit = 50 } = req.query;

  const leaderboard = await pointsService.getLeaderboard(req.villageId, {
    type,
    period,
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.json({
    success: true,
    data: leaderboard
  });
});

/**
 * 获取积分统计报告
 */
const getStatistics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

  const statistics = await pointsService.getStatistics(req.villageId, { period });

  res.json({
    success: true,
    data: statistics
  });
});

/**
 * 管理员调整积分
 */
const adminAdjustPoints = asyncHandler(async (req, res) => {
  const { userId, amount, reason } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段: userId, amount'
    });
  }

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: '请提供调整原因'
    });
  }

  const transaction = await pointsService.adminAdjustPoints(
    req.user?.id,
    userId,
    req.villageId,
    amount,
    reason
  );

  res.json({
    success: true,
    message: '积分调整成功',
    data: transaction
  });
});

/**
 * 创建默认积分规则
 */
const createDefaultRules = asyncHandler(async (req, res) => {
  const rules = await pointsService.createDefaultRules(req.villageId);

  res.status(201).json({
    success: true,
    message: `成功创建 ${rules.length} 条默认规则`,
    data: rules
  });
});

/**
 * 获取可兑换商品列表
 */
const getRedemptionItems = asyncHandler(async (req, res) => {
  const items = await pointsService.getRedemptionItems(req.villageId);

  res.json({
    success: true,
    data: items
  });
});

/**
 * 创建兑换商品
 */
const createRedemptionItem = asyncHandler(async (req, res) => {
  const itemData = {
    ...req.body,
    villageId: req.villageId
  };

  const item = await pointsService.createRedemptionItem(itemData);

  res.status(201).json({
    success: true,
    message: '商品创建成功',
    data: item
  });
});

/**
 * 更新兑换商品
 */
const updateRedemptionItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const item = await pointsService.updateRedemptionItem(itemId, req.body);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: '商品不存在'
    });
  }

  res.json({
    success: true,
    message: '商品更新成功',
    data: item
  });
});

/**
 * 删除兑换商品
 */
const deleteRedemptionItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const success = await pointsService.deleteRedemptionItem(itemId);

  if (!success) {
    return res.status(404).json({
      success: false,
      message: '商品不存在'
    });
  }

  res.json({
    success: true,
    message: '商品删除成功'
  });
});

/**
 * 快速签到
 */
const dailyCheckin = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: '未登录'
    });
  }

  try {
    const transaction = await pointsService.addPoints(
      userId,
      req.villageId,
      'daily_checkin',
      5,
      '每日签到'
    );

    res.json({
      success: true,
      message: '签到成功，获得5积分',
      data: transaction
    });
  } catch (error) {
    if (error.message.includes('超出每日限额')) {
      return res.status(400).json({
        success: false,
        message: '今日已签到'
      });
    }
    throw error;
  }
});

/**
 * 获取我的积分信息（综合接口）
 */
const getMyPoints = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: '未登录'
    });
  }

  const [balance, recentTransactions, rank] = await Promise.all([
    pointsService.getUserBalance(userId, req.villageId),
    pointsService.getTransactionHistory(userId, req.villageId, { limit: 5 }),
    // 获取用户排名
    pointsService.getLeaderboard(req.villageId, { type: 'balance', limit: 1000 })
      .then(result => {
        const index = result.leaderboard.findIndex(u => u.userId.toString() === userId);
        return index >= 0 ? index + 1 : null;
      })
  ]);

  res.json({
    success: true,
    data: {
      balance,
      recentTransactions: recentTransactions.transactions,
      rank
    }
  });
});

module.exports = {
  getUserBalance,
  addPoints,
  redeemPoints,
  getTransactionHistory,
  getLeaderboard,
  getStatistics,
  adminAdjustPoints,
  createDefaultRules,
  getRedemptionItems,
  createRedemptionItem,
  updateRedemptionItem,
  deleteRedemptionItem,
  dailyCheckin,
  getMyPoints
};
