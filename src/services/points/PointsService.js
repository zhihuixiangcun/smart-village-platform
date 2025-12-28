/**
 * 村民积分服务
 * 提供积分计算、规则管理、交易记录等功能
 */

const { PointsTransaction, PointsRule, PointsRedemptionItem, PointsBalance } = require('../../models/Points');
const { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } = require('date-fns');
const logger = require('../logger');

class PointsService {
  /**
   * 获取用户积分余额
   * @param {string} userId - 用户ID
   * @param {string} villageId - 村ID
   * @returns {Promise<Object>} 积分余额信息
   */
  async getUserBalance(userId, villageId) {
    let balance = await PointsBalance.findOne({ userId, villageId });

    if (!balance) {
      balance = await PointsBalance.create({
        userId,
        villageId,
        balance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        level: this.calculateLevel(0)
      });
    }

    return balance;
  }

  /**
   * 增加积分
   * @param {string} userId - 用户ID
   * @param {string} villageId - 村ID
   * @param {string} category - 积分类别
   * @param {number} amount - 积分数量
   * @param {string} description - 描述
   * @param {Object} metadata - 额外信息
   * @returns {Promise<Object>} 交易记录
   */
  async addPoints(userId, villageId, category, amount, description, metadata = {}) {
    // 检查规则
    const rule = await PointsRule.findOne({
      villageId,
      category,
      isActive: true,
      validFrom: { $lte: new Date() },
      $or: [
        { validUntil: null },
        { validUntil: { $gte: new Date() } }
      ]
    });

    if (!rule) {
      throw new Error(`积分规则不存在或已失效: ${category}`);
    }

    // 检查限额
    await this.checkLimits(userId, villageId, category, amount, rule);

    // 更新余额
    const balance = await this.getUserBalance(userId, villageId);
    const newBalance = balance.balance + amount;
    const newTotalEarned = balance.totalEarned + amount;
    const newLevel = this.calculateLevel(newTotalEarned);

    await PointsBalance.updateOne(
      { userId, villageId },
      {
        balance: newBalance,
        totalEarned: newTotalEarned,
        level: newLevel,
        lastUpdated: new Date()
      }
    );

    // 创建交易记录
    const transaction = await PointsTransaction.create({
      userId,
      villageId,
      type: 'earn',
      amount,
      balance: newBalance,
      category,
      description,
      metadata
    });

    return transaction;
  }

  /**
   * 扣减积分（兑换）
   * @param {string} userId - 用户ID
   * @param {string} villageId - 村ID
   * @param {string} itemId - 兑换商品ID
   * @returns {Promise<Object>} 兑换记录
   */
  async redeemPoints(userId, villageId, itemId) {
    const item = await PointsRedemptionItem.findOne({
      _id: itemId,
      villageId,
      isActive: true,
      $or: [
        { validUntil: null },
        { validUntil: { $gte: new Date() } }
      ]
    });

    if (!item) {
      throw new Error('兑换商品不存在或已下架');
    }

    // 检查库存
    if (!item.stockUnlimited && item.stock <= 0) {
      throw new Error('商品库存不足');
    }

    // 检查余额
    const balance = await this.getUserBalance(userId, villageId);
    if (balance.balance < item.pointsRequired) {
      throw new Error(`积分不足，需要 ${item.pointsRequired} 积分，当前余额 ${balance.balance}`);
    }

    // 扣减积分
    const newBalance = balance.balance - item.pointsRequired;
    const newTotalRedeemed = balance.totalRedeemed + item.pointsRequired;
    const newLevel = this.calculateLevel(balance.totalEarned);

    await PointsBalance.updateOne(
      { userId, villageId },
      {
        balance: newBalance,
        totalRedeemed: newTotalRedeemed,
        level: newLevel,
        lastUpdated: new Date()
      }
    );

    // 更新库存
    if (!item.stockUnlimited) {
      await PointsRedemptionItem.updateOne(
        { _id: itemId },
        {
          $inc: { stock: -1, redemptionCount: 1 }
        }
      );
    } else {
      await PointsRedemptionItem.updateOne(
        { _id: itemId },
        {
          $inc: { redemptionCount: 1 }
        }
      );
    }

    // 创建交易记录
    const transaction = await PointsTransaction.create({
      userId,
      villageId,
      type: 'redeem',
      amount: -item.pointsRequired,
      balance: newBalance,
      category: item.type,
      description: `兑换商品: ${item.name}`,
      metadata: {
        itemId: item._id,
        itemName: item.name,
        itemType: item.type
      }
    });

    return transaction;
  }

  /**
   * 检查限额
   * @private
   */
  async checkLimits(userId, villageId, category, amount, rule) {
    const now = new Date();

    // 检查日限额
    if (rule.maxDaily) {
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);
      const dayTotal = await PointsTransaction.aggregate([
        {
          $match: {
            userId,
            villageId,
            category,
            type: 'earn',
            createdAt: { $gte: dayStart, $lte: dayEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const currentDayTotal = dayTotal[0]?.total || 0;
      if (currentDayTotal + amount > rule.maxDaily) {
        throw new Error(`超出每日限额，每日最多可获得 ${rule.maxDaily} 积分`);
      }
    }

    // 检查周限额
    if (rule.maxWeekly) {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const weekTotal = await PointsTransaction.aggregate([
        {
          $match: {
            userId,
            villageId,
            category,
            type: 'earn',
            createdAt: { $gte: weekStart, $lte: weekEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const currentWeekTotal = weekTotal[0]?.total || 0;
      if (currentWeekTotal + amount > rule.maxWeekly) {
        throw new Error(`超出每周限额，每周最多可获得 ${rule.maxWeekly} 积分`);
      }
    }

    // 检查月限额
    if (rule.maxMonthly) {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const monthTotal = await PointsTransaction.aggregate([
        {
          $match: {
            userId,
            villageId,
            category,
            type: 'earn',
            createdAt: { $gte: monthStart, $lte: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const currentMonthTotal = monthTotal[0]?.total || 0;
      if (currentMonthTotal + amount > rule.maxMonthly) {
        throw new Error(`超出每月限额，每月最多可获得 ${rule.maxMonthly} 积分`);
      }
    }
  }

  /**
   * 计算用户等级
   * @private
   */
  calculateLevel(totalEarned) {
    if (totalEarned >= 10000) return 'diamond';
    if (totalEarned >= 5000) return 'platinum';
    if (totalEarned >= 2000) return 'gold';
    if (totalEarned >= 500) return 'silver';
    return 'bronze';
  }

  /**
   * 获取积分历史记录
   * @param {string} userId - 用户ID
   * @param {string} villageId - 村ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 历史记录
   */
  async getTransactionHistory(userId, villageId, options = {}) {
    const {
      type,
      category,
      page = 1,
      limit = 20,
      startDate,
      endDate
    } = options;

    const query = { userId, villageId };
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      PointsTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PointsTransaction.countDocuments(query)
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取积分排行榜
   * @param {string} villageId - 村ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 排行榜
   */
  async getLeaderboard(villageId, options = {}) {
    const {
      type = 'balance',
      period = 'all',
      page = 1,
      limit = 50
    } = options;

    let startDate;
    const now = new Date();

    switch (period) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const skip = (page - 1) * limit;

    let aggregation;

    if (type === 'balance') {
      // 按余额排名
      aggregation = PointsBalance.aggregate([
        { $match: { villageId } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: 1,
            balance: 1,
            totalEarned: 1,
            level: 1,
            'user.realName': 1,
            'user.avatar': 1
          }
        },
        { $sort: { balance: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]);
    } else {
      // 按获得积分排名（特定时期）
      const matchStage = {
        villageId,
        type: 'earn'
      };
      if (startDate) {
        matchStage.createdAt = { $gte: startDate };
      }

      aggregation = PointsTransaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$userId',
            earned: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            earned: 1,
            count: 1,
            'user.realName': 1,
            'user.avatar': 1
          }
        },
        { $sort: { earned: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]);
    }

    const leaderboard = await aggregation;
    const total = await PointsBalance.countDocuments({ villageId });

    return {
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取积分统计报告
   * @param {string} villageId - 村ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 统计报告
   */
  async getStatistics(villageId, options = {}) {
    const { period = 'month' } = options;
    const now = new Date();
    let startDate, groupBy;

    switch (period) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'month':
        startDate = startOfMonth(now);
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        startDate = startOfMonth(now);
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    // 总体统计
    const [totalStats, categoryStats, timeSeries, topEarners, topRedeemers] = await Promise.all([
      // 总体统计
      PointsTransaction.aggregate([
        { $match: { villageId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalEarned: {
              $sum: { $cond: [{ $eq: ['$type', 'earn'] }, '$amount', 0] }
            },
            totalRedeemed: {
              $sum: { $cond: [{ $eq: ['$type', 'redeem'] }, { $abs: '$amount' }, 0] }
            },
            transactionCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            totalEarned: 1,
            totalRedeemed: 1,
            transactionCount: 1,
            uniqueUsersCount: { $size: '$uniqueUsers' }
          }
        }
      ]),

      // 按类别统计
      PointsTransaction.aggregate([
        { $match: { villageId, type: 'earn', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),

      // 时间序列
      PointsTransaction.aggregate([
        { $match: { villageId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: groupBy,
            earned: {
              $sum: { $cond: [{ $eq: ['$type', 'earn'] }, '$amount', 0] }
            },
            redeemed: {
              $sum: { $cond: [{ $eq: ['$type', 'redeem'] }, { $abs: '$amount' }, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 获得积分最多的用户
      PointsTransaction.aggregate([
        { $match: { villageId, type: 'earn', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$userId',
            total: { $sum: '$amount' }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            total: 1,
            'user.realName': 1
          }
        }
      ]),

      // 兑换积分最多的用户
      PointsTransaction.aggregate([
        { $match: { villageId, type: 'redeem', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$userId',
            total: { $sum: { $abs: '$amount' } }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            total: 1,
            'user.realName': 1
          }
        }
      ])
    ]);

    return {
      summary: totalStats[0] || {
        totalEarned: 0,
        totalRedeemed: 0,
        transactionCount: 0,
        uniqueUsersCount: 0
      },
      byCategory: categoryStats,
      timeSeries,
      topEarners,
      topRedeemers,
      period
    };
  }

  /**
   * 管理员调整积分
   * @param {string} adminId - 管理员ID
   * @param {string} userId - 用户ID
   * @param {string} villageId - 村ID
   * @param {number} amount - 调整数量（正数为增加，负数为扣减）
   * @param {string} reason - 原因
   * @returns {Promise<Object>} 交易记录
   */
  async adminAdjustPoints(adminId, userId, villageId, amount, reason) {
    const balance = await this.getUserBalance(userId, villageId);
    const newBalance = balance.balance + amount;

    if (newBalance < 0) {
      throw new Error('扣减后积分不能为负数');
    }

    const newTotalEarned = amount > 0 ? balance.totalEarned + amount : balance.totalEarned;
    const newTotalRedeemed = amount < 0 ? balance.totalRedeemed + Math.abs(amount) : balance.totalRedeemed;
    const newLevel = this.calculateLevel(newTotalEarned);

    await PointsBalance.updateOne(
      { userId, villageId },
      {
        balance: newBalance,
        totalEarned: newTotalEarned,
        totalRedeemed: newTotalRedeemed,
        level: newLevel,
        lastUpdated: new Date()
      }
    );

    const transaction = await PointsTransaction.create({
      userId,
      villageId,
      type: 'admin_adjust',
      amount,
      balance: newBalance,
      category: amount > 0 ? 'admin_bonus' : 'admin_deduct',
      description: reason,
      metadata: {
        adminId,
        adminAction: true
      }
    });

    return transaction;
  }

  /**
   * 创建默认积分规则
   * @param {string} villageId - 村ID
   * @returns {Promise<Array>} 创建的规则列表
   */
  async createDefaultRules(villageId) {
    const defaultRules = [
      {
        villageId,
        category: 'daily_checkin',
        points: 5,
        maxDaily: 5,
        description: '每日签到'
      },
      {
        villageId,
        category: 'forum_post',
        points: 10,
        maxDaily: 50,
        description: '发布帖子'
      },
      {
        villageId,
        category: 'forum_comment',
        points: 2,
        maxDaily: 20,
        description: '评论帖子'
      },
      {
        villageId,
        category: 'forum_like',
        points: 1,
        maxDaily: 10,
        description: '点赞帖子'
      },
      {
        villageId,
        category: 'meeting_attend',
        points: 20,
        maxWeekly: 60,
        description: '参加会议'
      },
      {
        villageId,
        category: 'meeting_speak',
        points: 10,
        maxWeekly: 50,
        description: '会议发言'
      },
      {
        villageId,
        category: 'volunteer',
        points: 50,
        maxMonthly: 500,
        description: '参与志愿服务'
      },
      {
        villageId,
        category: 'environment_clean',
        points: 20,
        maxMonthly: 200,
        description: '参与环境整治'
      },
      {
        villageId,
        category: 'security_patrol',
        points: 30,
        maxMonthly: 300,
        description: '参与治安巡逻'
      },
      {
        villageId,
        category: 'policy_feedback',
        points: 5,
        maxDaily: 25,
        description: '政策反馈'
      },
      {
        villageId,
        category: 'suggestion_adopted',
        points: 100,
        description: '建议被采纳'
      },
      {
        villageId,
        category: 'referral',
        points: 50,
        description: '推荐新村民'
      }
    ];

    return await PointsRule.insertMany(defaultRules);
  }

  /**
   * 创建示例兑换商品
   * @param {string} villageId - 村ID
   * @returns {Promise<Array>} 创建的商品列表
   */
  async createSampleRedemptionItems(villageId) {
    const items = [
      {
        villageId,
        name: '村超市5元优惠券',
        type: 'coupon',
        pointsRequired: 100,
        stock: 50,
        stockUnlimited: false,
        description: '可在村超市使用，满20元可用'
      },
      {
        villageId,
        name: '免费理发一次',
        type: 'service',
        pointsRequired: 200,
        stock: 20,
        stockUnlimited: false,
        description: '村合作理发店免费理发服务'
      },
      {
        villageId,
        name: '大米5公斤',
        type: 'goods',
        pointsRequired: 500,
        stock: 30,
        stockUnlimited: false,
        description: '优质大米5公斤装'
      },
      {
        villageId,
        name: '食用油1升',
        type: 'goods',
        pointsRequired: 300,
        stock: 40,
        stockUnlimited: false,
        description: '优质食用油1升装'
      },
      {
        villageId,
        name: '村医院免费体检',
        type: 'service',
        pointsRequired: 1000,
        stock: 10,
        stockUnlimited: false,
        description: '包含基础体检项目'
      },
      {
        villageId,
        name: '荣誉村民称号',
        type: 'goods',
        pointsRequired: 10000,
        stock: null,
        stockUnlimited: true,
        description: '月度积分榜前10名获得，享受体检优先等福利'
      }
    ];

    return await PointsRedemptionItem.insertMany(items);
  }

  /**
   * 获取可兑换商品列表
   * @param {string} villageId - 村ID
   * @returns {Promise<Array>} 商品列表
   */
  async getRedemptionItems(villageId) {
    return await PointsRedemptionItem.find({
      villageId,
      isActive: true,
      $or: [
        { validUntil: null },
        { validUntil: { $gte: new Date() } }
      ]
    }).sort({ pointsRequired: 1 });
  }

  /**
   * 创建兑换商品
   * @param {Object} itemData - 商品数据
   * @returns {Promise<Object>} 创建的商品
   */
  async createRedemptionItem(itemData) {
    return await PointsRedemptionItem.create(itemData);
  }

  /**
   * 更新兑换商品
   * @param {string} itemId - 商品ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的商品
   */
  async updateRedemptionItem(itemId, updateData) {
    return await PointsRedemptionItem.findByIdAndUpdate(
      itemId,
      updateData,
      { new: true }
    );
  }

  /**
   * 删除兑换商品
   * @param {string} itemId - 商品ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteRedemptionItem(itemId) {
    const result = await PointsRedemptionItem.findByIdAndDelete(itemId);
    return !!result;
  }
}

module.exports = new PointsService();
