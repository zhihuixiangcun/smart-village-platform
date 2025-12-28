/**
 * 村民积分模型
 * 用于管理村民积分余额、积分记录和交易历史
 */

const mongoose = require('mongoose');

/**
 * 积分交易记录 Schema
 */
const PointsTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['earn', 'redeem', 'admin_adjust', 'expire', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: [
      // 获得积分类别
      'forum_post', 'forum_comment', 'forum_like',
      'meeting_attend', 'meeting_speak',
      'volunteer', 'environment_clean', 'security_patrol',
      'policy_feedback', 'suggestion_adopted',
      'daily_checkin', 'referral',
      // 兑换积分类别
      'goods', 'service', 'coupon',
      // 管理调整
      'admin_bonus', 'admin_deduct',
      // 过期
      'expired',
      // 转账
      'transfer_in', 'transfer_out'
    ]
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

/**
 * 积分规则配置 Schema
 */
const PointsRuleSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'forum_post', 'forum_comment', 'forum_like',
      'meeting_attend', 'meeting_speak',
      'volunteer', 'environment_clean', 'security_patrol',
      'policy_feedback', 'suggestion_adopted',
      'daily_checkin', 'referral'
    ]
  },
  points: {
    type: Number,
    required: true,
    default: 0
  },
  maxDaily: {
    type: Number,
    default: null
  },
  maxWeekly: {
    type: Number,
    default: null
  },
  maxMonthly: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

/**
 * 积分兑换商品 Schema
 */
const PointsRedemptionItemSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['goods', 'service', 'coupon'],
    required: true
  },
  pointsRequired: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: null
  },
  stockUnlimited: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  },
  imageUrl: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null
  },
  redemptionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

/**
 * 用户积分汇总 Schema
 */
const PointsBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    required: true,
    default: 0
  },
  totalRedeemed: {
    type: Number,
    required: true,
    default: 0
  },
  rank: {
    type: Number,
    default: null
  },
  level: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引优化
PointsTransactionSchema.index({ userId: 1, createdAt: -1 });
PointsTransactionSchema.index({ villageId: 1, type: 1, createdAt: -1 });
PointsTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

PointsRuleSchema.index({ villageId: 1, category: 1, isActive: 1 });
PointsRedemptionItemSchema.index({ villageId: 1, isActive: 1, pointsRequired: 1 });

// 虚拟字段：积分余额的完整信息
PointsBalanceSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 导出模型
const PointsTransaction = mongoose.model('PointsTransaction', PointsTransactionSchema);
const PointsRule = mongoose.model('PointsRule', PointsRuleSchema);
const PointsRedemptionItem = mongoose.model('PointsRedemptionItem', PointsRedemptionItemSchema);
const PointsBalance = mongoose.model('PointsBalance', PointsBalanceSchema);

module.exports = {
  PointsTransaction,
  PointsRule,
  PointsRedemptionItem,
  PointsBalance
};
