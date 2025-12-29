/**
 * ï6»ûß¡B
 * ï·Öˆ9Qb’LœIŸý
 */

const {
  PointsAccount,
  PointsRule,
  PointsTransaction,
  RedemptionItem,
  RedemptionRecord,
  PointsStatistics,
  PointsType
} = require('../models/Points');
const { Resident } = require('../models/Resident');
const webSocketService = require('./webSocketService');

// ==================== ï&7¡ ====================

/**
 * ·Öúï&7
 */
exports.getOrCreateAccount = async (userId, villageId) => {
  let account = await PointsAccount.findOne({ userId });

  if (!account) {
    // å~sT„Qáo
    const resident = await Resident.findOne({ userId });
    account = new PointsAccount({
      userId,
      residentId: resident?._id,
      villageId
    });
    await account.save();
  }

  return account;
};

/**
 * ·Ö(7ïY
 */
exports.getUserBalance = async (userId) => {
  const account = await PointsAccount.findOne({ userId });

  if (!account) {
    return {
      balance: 0,
      level: 'bronze',
      totalEarned: 0,
      totalSpent: 0
    };
  }

  return {
    balance: account.balance,
    level: account.level,
    levelProgress: account.levelProgress,
    totalEarned: account.totalEarned,
    totalSpent: account.totalSpent
  };
};

// ==================== ï·Öˆ9 ====================

/**
 * ž ï
 */
exports.addPoints = async (userId, pointsData, operatorId) => {
  const { type, amount, relatedId, relatedType, description, metadata } = pointsData;

  const account = await PointsAccount.findOne({ userId });
  if (!account) {
    throw new Error('ï&7X(');
  }

  if (account.status !== 'active') {
    throw new Error('&7ò«»Ó');
  }

  // ÀåïÄ
  const rule = await PointsRule.findOne({
    ruleType: type,
    status: 'active',
    $or: [
      { villageId: account.villageId },
      { villageId: null }
    ]
  });

  if (rule) {
    // ÀåP6aö
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (rule.conditions.dailyLimit) {
      const todayEarned = await PointsTransaction.countDocuments({
        userId,
        pointsType: type,
        transactionType: 'earn',
        createdAt: { $gte: today }
      });

      if (todayEarned >= rule.conditions.dailyLimit) {
        throw new Error(`ò¾0Ïå${rule.ruleName}
P`);
      }
    }

    // (ÄMn„ïÏ
    const pointsAmount = rule.points.amount || amount;

    const transaction = await account.addPoints(type, {
      description: description || rule.ruleName,
      relatedId,
      relatedType,
      metadata,
      createdBy: operatorId
    });

    return transaction;
  }

  // ¡	Äô¥û 
  const transaction = await account.addPoints(type, {
    description,
    relatedId,
    relatedType,
    metadata,
    createdBy: operatorId
  });

  return transaction;
};

/**
 * cÏï
 */
exports.deductPoints = async (userId, pointsData, operatorId) => {
  const { type, amount, relatedId, relatedType, description, metadata } = pointsData;

  const account = await PointsAccount.findOne({ userId });
  if (!account) {
    throw new Error('ï&7X(');
  }

  if (account.status !== 'active') {
    throw new Error('&7ò«»Ó');
  }

  const transaction = await account.deductPoints(type, {
    description,
    relatedId,
    relatedType,
    metadata,
    createdBy: operatorId
  });

  return transaction;
};

/**
 * Ïå~0
 */
exports.dailyCheckin = async (userId) => {
  const account = await PointsAccount.findOne({ userId });
  if (!account) {
    throw new Error('ï&7X(');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ÀåÊ)/&ò~0
  if (account.checkin.lastCheckinDate) {
    const lastCheckin = new Date(account.checkin.lastCheckinDate);
    lastCheckin.setHours(0, 0, 0, 0);

    if (lastCheckin.getTime() === today.getTime()) {
      throw new Error('Ê)ò~0');
    }
  }

  // ¡—Þí~0)p
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (account.checkin.lastCheckinDate) {
    const lastCheckin = new Date(account.checkin.lastCheckinDate);
    lastCheckin.setHours(0, 0, 0, 0);

    if (lastCheckin.getTime() === yesterday.getTime()) {
      account.checkin.continuousDays += 1;
    } else {
      account.checkin.continuousDays = 1;
    }
  } else {
    account.checkin.continuousDays = 1;
  }

  // ¡—~0ïÞí~0V±	
  let points = 10; // ú@ï
  const bonusDays = [7, 14, 21, 30]; // Þí~0V±)p

  for (const bonusDay of bonusDays) {
    if (account.checkin.continuousDays === bonusDay) {
      points += bonusDay; // V±
      break;
    }
  }

  account.checkin.lastCheckinDate = today;
  account.checkin.totalDays += 1;
  account.checkin.monthDays += 1;

  await account.save();

  // û ï
  const transaction = await account.addPoints(PointsType.DAILY_CHECKIN, {
    description: `Ïå~0Þí${account.checkin.continuousDays})	`,
    metadata: {
      continuousDays: account.checkin.continuousDays,
      bonus: points > 10 ? points - 10 : 0
    },
    createdBy: userId
  });

  return {
    transaction,
    checkin: {
      continuousDays: account.checkin.continuousDays,
      totalDays: account.checkin.totalDays,
      pointsEarned: points
    }
  };
};

// ==================== ï¤°U ====================

/**
 * ·Öï¤°U
 */
exports.getTransactionHistory = async (userId, options = {}) => {
  const {
    transactionType,
    pointsType,
    startDate,
    endDate,
    limit = 20,
    skip = 0
  } = options;

  const query = { userId };
  if (transactionType) query.transactionType = transactionType;
  if (pointsType) query.pointsType = pointsType;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const transactions = await PointsTransaction.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await PointsTransaction.countDocuments(query);

  return {
    transactions,
    total,
    hasMore: skip + transactions.length < total
  };
};

// ==================== ï’Lœ ====================

/**
 * ·Öï’Lœ
 */
exports.getLeaderboard = async (villageId, options = {}) => {
  const {
    type = 'balance', // balance, earned, spent
    period = 'all',   // all, week, month, year
    limit = 50,
    skip = 0
  } = options;

  let startDate;
  const now = new Date();

  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  if (period === 'all' || type === 'balance') {
    // úŽSMY„’Lœ
    const query = villageId ? { villageId } : {};
    const accounts = await PointsAccount.find(query)
      .populate('userId', 'name avatar')
      .sort('-balance')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await PointsAccount.countDocuments(query);

    return {
      type: 'balance',
      period: 'all',
      leaderboard: accounts.map((acc, index) => ({
        rank: skip + index + 1,
        userId: acc.userId._id,
        userName: acc.userId.name,
        userAvatar: acc.userId.avatar,
        balance: acc.balance,
        level: acc.level
      })),
      total
    };
  } else {
    // úŽ¤ß¡„’Lœ
    const matchQuery = {
      transactionType: type === 'earned' ? 'earn' : 'spend'
    };
    if (villageId) matchQuery.villageId = villageId;
    if (startDate) matchQuery.createdAt = { $gte: startDate };

    const transactions = await PointsTransaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$userId',
          totalAmount: { $sum: { $abs: '$amount' } },
          transactionCount: { $sum: 1 }
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
      { $sort: { totalAmount: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    return {
      type,
      period,
      leaderboard: transactions.map((t, index) => ({
        rank: skip + index + 1,
        userId: t._id,
        userName: t.user.name,
        userAvatar: t.user.avatar,
        amount: t.totalAmount,
        transactionCount: t.transactionCount
      }))
    };
  }
};

// ==================== QbFÁ¡ ====================

/**
 * ·ÖïQbFÁh
 */
exports.getRedemptionItems = async (villageId, options = {}) => {
  const {
    category,
    status = 'active',
    minPoints,
    maxPoints,
    sortBy = 'sortOrder',
    limit = 50,
    skip = 0
  } = options;

  const query = { villageId };
  if (category) query['itemInfo.category'] = category;
  if (status) query.status = status;
  if (minPoints) query.pointsPrice = { ...query.pointsPrice, $gte: minPoints };
  if (maxPoints) query.pointsPrice = { ...query.pointsPrice, $lte: maxPoints };

  const items = await RedemptionItem.find(query)
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await RedemptionItem.countDocuments(query);

  return {
    items,
    total
  };
};

/**
 * úQbFÁ
 */
exports.createRedemptionItem = async (itemData, userId) => {
  const item = new RedemptionItem({
    ...itemData,
    createdBy: userId
  });

  await item.save();

  return item;
};

/**
 * ô°QbFÁ
 */
exports.updateRedemptionItem = async (itemId, updates) => {
  const item = await RedemptionItem.findById(itemId);

  if (!item) {
    throw new Error('FÁX(');
  }

  Object.keys(updates).forEach(key => {
    item[key] = updates[key];
  });

  await item.save();

  return item;
};

/**
 *  dQbFÁ
 */
exports.deleteRedemptionItem = async (itemId) => {
  const item = await RedemptionItem.findById(itemId);

  if (!item) {
    throw new Error('FÁX(');
  }

  await RedemptionItem.deleteOne({ _id: itemId });

  return { success: true };
};

// ==================== ïQb ====================

/**
 * QbFÁ
 */
exports.redeemItem = async (userId, itemId, quantity = 1) => {
  const account = await PointsAccount.findOne({ userId });
  if (!account) {
    throw new Error('ï&7X(');
  }

  if (account.status !== 'active') {
    throw new Error('&7ò«»Ó');
  }

  const item = await RedemptionItem.findById(itemId);

  if (!item) {
    throw new Error('FÁX(');
  }

  if (item.status !== 'active') {
    throw new Error('FÁ‚ïQb');
  }

  // Àå“X
  if (!item.inventory.unlimited && item.inventory.available < quantity) {
    throw new Error('“X³');
  }

  // Àå(7P6
  if (item.limits.levelRequired && account.level !== item.limits.levelRequired) {
    throw new Error(` ${item.limits.levelRequired}I§MýQb`);
  }

  if (item.limits.perUser) {
    const userRedemptions = await RedemptionRecord.countDocuments({
      userId,
      itemId,
      status: { $in: ['pending', 'processing', 'completed'] }
    });

    if (userRedemptions + quantity > item.limits.perUser) {
      throw new Error(`…úÏºPQpÏ`);
    }
  }

  // ¡—@ ï
  const totalPoints = item.pointsPrice * quantity;

  if (account.balance < totalPoints) {
    throw new Error('ïY³');
  }

  // cÏï
  const transaction = await account.deductPoints(PointsType.REDEMPTION, {
    description: `QbFÁ${item.itemInfo.name}`,
    relatedId: itemId,
    relatedType: 'redemption',
    metadata: { quantity, itemCode: item.itemCode },
    createdBy: userId
  });

  // úQb°U
  const redemptionNumber = await RedemptionRecord.generateRedemptionNumber();
  const record = new RedemptionRecord({
    redemptionNumber,
    userId,
    residentId: account.residentId,
    villageId: account.villageId,
    itemId: item._id,
    itemInfo: {
      name: item.itemInfo.name,
      category: item.itemInfo.category,
      image: item.itemInfo.images?.[0]
    },
    pointsSpent: totalPoints,
    quantity,
    status: item.delivery.method === 'automatic' ? 'completed' : 'pending'
  });

  // ê¨Ñ>„FÁ
  if (item.delivery.method === 'automatic') {
    // ÙÌïåæÑê¨Ñ>;‘
    record.status = 'completed';
  }

  await record.save();

  // ô°“XŒß¡
  if (!item.inventory.unlimited) {
    item.inventory.available -= quantity;
  }
  item.statistics.totalRedeemed += quantity;
  item.statistics.totalRedemptions += 1;
  await item.save();

  // Ñå
  if (webSocketService) {
    webSocketService.broadcastToUser(userId.toString(), {
      type: 'points_redeemed',
      data: {
        itemName: item.itemInfo.name,
        pointsSpent: totalPoints,
        status: record.status
      }
    });
  }

  return {
    transaction,
    record,
    item
  };
};

// ==================== ïÄ¡ ====================

/**
 * úØ¤ïÄ
 */
exports.createDefaultRules = async (villageId) => {
  const defaultRules = [
    {
      ruleCode: 'DAILY_CHECKIN',
      ruleName: 'Ïå~0',
      ruleType: PointsType.DAILY_CHECKIN,
      villageId,
      points: { amount: 10 },
      description: 'Ïå{U~0·Öï',
      conditions: { dailyLimit: 1 }
    },
    {
      ruleCode: 'VOTING',
      ruleName: 'Â•h',
      ruleType: PointsType.VOTING,
      villageId,
      points: { amount: 5 },
      description: 'ÂQ¡•h'
    },
    {
      ruleCode: 'FEEDBACK',
      ruleName: 'ÁÍˆ',
      ruleType: PointsType.FEEDBACK,
      villageId,
      points: { amount: 10 },
      description: 'Ð¤Q¡Áú®'
    },
    {
      ruleCode: 'VOLUNTEER',
      ruleName: '×?¡',
      ruleType: PointsType.VOLUNTEER,
      villageId,
      points: { amount: 50 },
      description: 'ÂQ„×?¡;¨'
    },
    {
      ruleCode: 'ENVIRONMENT',
      ruleName: '¯ƒt»',
      ruleType: PointsType.ENVIRONMENT,
      villageId,
      points: { amount: 30 },
      description: 'ÂQ„¯ƒt»;¨'
    },
    {
      ruleCode: 'MEETING',
      ruleName: 'Â®',
      ruleType: PointsType.MEETING_ATTENDANCE,
      villageId,
      points: { amount: 20 },
      description: 'Â Q'QÔ®'
    },
    {
      ruleCode: 'TRAINING',
      ruleName: 'Â ù­',
      ruleType: PointsType.TRAINING,
      villageId,
      points: { amount: 40 },
      description: 'Â €ýù­þ'
    },
    {
      ruleCode: 'HELP_OTHERS',
      ruleName: '»Ì’©',
      ruleType: PointsType.HELP_OTHERS,
      villageId,
      points: { amount: 25 },
      description: '.©»Ìã³ð¾'
    }
  ];

  const rules = [];
  for (const ruleData of defaultRules) {
    const existingRule = await PointsRule.findOne({ ruleCode: ruleData.ruleCode });
    if (!existingRule) {
      const rule = new PointsRule(ruleData);
      await rule.save();
      rules.push(rule);
    }
  }

  return {
    success: true,
    created: rules.length,
    rules
  };
};

// ==================== ïß¡ ====================

/**
 * ·Öïß¡
 */
exports.getStatistics = async (villageId, period = 'monthly') => {
  const now = new Date();
  let startDate, endDate;

  if (period === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else if (period === 'weekly') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    endDate = now;
  } else if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (period === 'yearly') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  }

  // å~úß¡°U
  let statistics = await PointsStatistics.findOne({
    villageId,
    'period.type': period,
    'period.date': startDate
  });

  if (!statistics) {
    // ·Öï
    const earnResult = await PointsTransaction.aggregate([
      {
        $match: {
          villageId,
          transactionType: 'earn',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$pointsType',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // ˆ9ï
    const spendResult = await PointsTransaction.aggregate([
      {
        $match: {
          villageId,
          transactionType: 'spend',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$pointsType',
          amount: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      }
    ]);

    // ;Ã(7
    const activeUsers = await PointsTransaction.distinct('userId', {
      villageId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // I§
    const levelDist = await PointsAccount.aggregate([
      { $match: { villageId } },
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      }
    ]);

    // íèFÁ
    const popularItems = await RedemptionRecord.aggregate([
      {
        $match: {
          villageId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$itemId',
          count: { $sum: '$quantity' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    statistics = new PointsStatistics({
      period: { type: period, date: startDate, startDate, endDate },
      villageId,
      earning: {
        totalAmount: earnResult.reduce((sum, item) => sum + item.amount, 0),
        totalCount: earnResult.reduce((sum, item) => sum + item.count, 0),
        byType: earnResult.map(r => ({
          type: r._id,
          amount: r.amount,
          count: r.count
        }))
      },
      spending: {
        totalAmount: spendResult.reduce((sum, item) => sum + item.amount, 0),
        totalCount: spendResult.reduce((sum, item) => sum + item.count, 0),
        redemptions: spendResult.filter(r => r._id === PointsType.REDEMPTION).reduce((sum, r) => sum + r.count, 0),
        byType: spendResult.map(r => ({
          type: r._id,
          amount: r.amount,
          count: r.count
        }))
      },
      users: {
        active: activeUsers.length,
        newAccounts: await PointsAccount.countDocuments({
          villageId,
          createdAt: { $gte: startDate, $lte: endDate }
        })
      },
      levelDistribution: levelDist.map(d => ({
        level: d._id,
        count: d.count
      })),
      items: {
        mostPopular: popularItems.map(item => ({
          itemId: item._id,
          count: item.count
        }))
      }
    });

    await statistics.save();
  }

  return statistics;
};

/**
 * ¡Xtï
 */
exports.adminAdjustPoints = async (userId, amount, reason, operatorId) => {
  const account = await PointsAccount.findOne({ userId });

  if (!account) {
    throw new Error('ï&7X(');
  }

  if (amount > 0) {
    return await account.addPoints(PointsType.ADMIN_ADJUST, {
      description: `¡Xt${reason}`,
      metadata: { adjustmentType: 'admin', reason },
      createdBy: operatorId
    });
  } else {
    return await account.deductPoints(PointsType.ADMIN_ADJUST, {
      description: `¡Xt${reason}`,
      metadata: { adjustmentType: 'admin', reason },
      createdBy: operatorId
    });
  }
};

/**
 * ·Ö„ïáoü	
 */
exports.getMyPoints = async (userId) => {
  const account = await PointsAccount.findOne({ userId })
    .populate('residentId', 'name phone');

  if (!account) {
    throw new Error('ï&7X(');
  }

  // ·Ö Ñ„¤°U
  const recentTransactions = await PointsTransaction.find({ userId })
    .sort('-createdAt')
    .limit(10)
    .lean();

  // ·ÖsÇ„ï
  const expiringPoints = account.expiringPoints.filter(p => p.expireDate > new Date());

  // ¡—’
  const rank = await PointsAccount.countDocuments({
    villageId: account.villageId,
    balance: { $gt: account.balance }
  });

  return {
    account: {
      balance: account.balance,
      level: account.level,
      levelProgress: account.levelProgress,
      totalEarned: account.totalEarned,
      totalSpent: account.totalSpent,
      rank: rank + 1
    },
    checkin: account.checkin,
    expiringPoints,
    recentTransactions
  };
};
