/**
 * Smart Village Platform - Subscription Model
 * 智慧乡村综合服务平台 - 订阅模型
 *
 * Purpose:
 * - Government subscription SaaS billing model
 * - Subscription plan management
 * - Automatic billing and renewal
 * - Invoice generation and payment tracking
 *
 * Pricing:
 * - Basic (基础版): ¥2,980/month or ¥29,800/year
 * - Standard (标准版): ¥9,980/month or ¥99,800/year
 * - Premium (高级版): ¥29,800/month or ¥298,000/year
 *
 * @module smart-village/models/Subscription
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Subscription Plan Definition
 * Embedded in SubscriptionPlan model, but also defined here for reference
 */
const SUBSCRIPTION_PLANS = {
  basic: {
    name: '基础版',
    nameEn: 'Basic',
    monthlyPrice: 2980,
    yearlyPrice: 29800,
    currency: 'CNY',
    quota: {
      maxUsers: 100,
      maxStorage: 50, // GB
      maxVillages: 1,
      maxApiCallsPerDay: 10000,
      maxConcurrentSessions: 50
    },
    features: [
      '村民管理',
      '公告发布',
      '基础数据分析',
      '移动端访问',
      '在线客服'
    ]
  },
  standard: {
    name: '标准版',
    nameEn: 'Standard',
    monthlyPrice: 9980,
    yearlyPrice: 99800,
    currency: 'CNY',
    quota: {
      maxUsers: 500,
      maxStorage: 200, // GB
      maxVillages: 5,
      maxApiCallsPerDay: 50000,
      maxConcurrentSessions: 200
    },
    features: [
      '村民管理',
      '公告发布',
      '农资集采',
      '农产品交易',
      '农业技术服务',
      '财务分析',
      '移动端访问',
      '在线客服',
      '数据导出'
    ]
  },
  premium: {
    name: '高级版',
    nameEn: 'Premium',
    monthlyPrice: 29800,
    yearlyPrice: 298000,
    currency: 'CNY',
    quota: {
      maxUsers: -1, // unlimited
      maxStorage: -1,
      maxVillages: -1,
      maxApiCallsPerDay: -1,
      maxConcurrentSessions: -1
    },
    features: [
      '标准版所有功能',
      '供应链金融',
      'AI智能诊断',
      '私有化部署',
      '定制开发',
      '专属客户经理',
      '7x24小时技术支持',
      '数据安全审计'
    ]
  }
};

/**
 * Subscription Schema Definition
 */
const subscriptionSchema = new Schema({
  // Reference to tenant
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // Plan Information
  plan: {
    type: String,
    required: true,
    enum: ['basic', 'standard', 'premium'],
    default: 'basic'
  },

  // Billing Cycle
  billingCycle: {
    type: String,
    required: true,
    enum: ['monthly', 'yearly'],
    default: 'yearly'
  },

  // Pricing
  pricing: {
    basePrice: { type: Number, required: true }, // Base price in cents/fen
    currency: { type: String, default: 'CNY' },
    taxRate: { type: Number, default: 0.06 }, // 6% VAT
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true } // Including tax
  },

  // Subscription Period
  period: {
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true
    },
    trialEndDate: Date // For trial subscriptions
  },

  // Auto-renewal
  autoRenew: {
    type: Boolean,
    default: true
  },

  // Grace period (days after expiration before service suspension)
  gracePeriodDays: {
    type: Number,
    default: 7
  },

  // Status
  status: {
    type: String,
    required: true,
    enum: [
      'trial',           // Trial period
      'active',          // Active subscription
      'past_due',        // Payment overdue
      'suspended',       // Service suspended
      'cancelled',       // Cancelled by user
      'expired',         // Subscription expired
      'pending'          // Pending activation
    ],
    default: 'pending',
    index: true
  },

  // Payment Information
  payment: {
    method: {
      type: String,
      enum: ['alipay', 'wechat', 'bank_transfer', 'credit_card', 'other'],
      default: 'bank_transfer'
    },
    accountName: String, // Account holder name
    accountNumber: String, // Last 4 digits only for security
    bankName: String,

    // For bank transfer
    paymentVoucherUrl: String,

    // For digital payments
    transactionId: String,
    prepayId: String // For WeChat Pay
  },

  // Billing Contact
  billingContact: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: String,
    organization: String // Organization name for invoice
  },

  // Invoice Settings
  invoiceSettings: {
    enabled: { type: Boolean, default: true },
    type: {
      type: String,
      enum: ['individual', 'company'],
      default: 'company'
    },
    title: String, // Invoice title
    taxNumber: String, // Tax ID number
    email: String, // Invoice delivery email
    autoSend: { type: Boolean, default: true }
  },

  // Renewal Information
  renewal: {
    lastRenewalDate: Date,
    nextBillingDate: Date,
    renewalCount: { type: Number, default: 0 },
    totalRenewals: { type: Number, default: 0 }
  },

  // Discounts and Promotions
  discount: {
    code: String,
    percent: { type: Number, min: 0, max: 100, default: 0 },
    amount: { type: Number, default: 0 },
    description: String
  },

  // Upgrade/Downgrade History
  planChanges: [{
    from: String,
    to: String,
    changedAt: { type: Date, default: Date.now },
    reason: String,
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Usage Statistics (for overage billing)
  usage: {
    currentUsers: { type: Number, default: 0 },
    currentStorage: { type: Number, default: 0 }, // GB
    currentVillages: { type: Number, default: 0 },
    apiCallsThisPeriod: { type: Number, default: 0 },
    overageFees: { type: Number, default: 0 }
  },

  // Quota Override (for custom plans)
  customQuota: {
    maxUsers: Number,
    maxStorage: Number,
    maxVillages: Number,
    maxApiCallsPerDay: Number,
    maxConcurrentSessions: Number
  },

  // Notes
  notes: {
    internal: String, // Internal notes
    customer: String  // Notes visible to customer
  },

  // Metadata
  metadata: {
    source: { type: String, default: 'self_signup' }, // self_signup, sales, referral
    referralCode: String,
    salesRepresentative: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    campaign: String,
    tags: [String]
  },

  // Cancellation Information
  cancellation: {
    requestedAt: Date,
    effectiveDate: Date,
    reason: {
      type: String,
      enum: [
        'too_expensive',
        'not_enough_features',
        'technical_issues',
        'switched_competitor',
        'project_cancelled',
        'other'
      ]
    },
    reasonDetails: String,
    feedback: String,
    retentionOffer: {
      made: { type: Boolean, default: false },
      accepted: { type: Boolean, default: false },
      discount: Number
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Audit
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  collection: 'subscriptions',
  timestamps: true
});

/**
 * Indexes
 */
subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ status: 1, 'period.endDate': 1 });
subscriptionSchema.index({ 'period.endDate': 1 }); // For finding expiring subscriptions
subscriptionSchema.index({ 'payment.transactionId': 1 });
subscriptionSchema.index({ 'invoiceSettings.taxNumber': 1 });

/**
 * Virtuals
 */

// Virtual for tenant
subscriptionSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const endDate = new Date(this.period.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for is active
subscriptionSchema.virtual('isActive').get(function() {
  const now = new Date();
  const endDate = new Date(this.period.endDate);
  return this.status === 'active' && endDate > now;
});

// Virtual for is in grace period
subscriptionSchema.virtual('isInGracePeriod').get(function() {
  const now = new Date();
  const endDate = new Date(this.period.endDate);
  const graceEndDate = new Date(endDate.getTime() + this.gracePeriodDays * 24 * 60 * 60 * 1000);
  return this.status === 'past_due' && now <= graceEndDate;
});

// Virtual for effective price (after discount)
subscriptionSchema.virtual('effectivePrice').get(function() {
  let price = this.pricing.totalAmount;
  if (this.discount && this.discount.amount) {
    price -= this.discount.amount;
  }
  return Math.max(0, price);
});

/**
 * Pre-save middleware
 */
subscriptionSchema.pre('save', function(next) {
  // Calculate tax if pricing changed
  if (this.isModified('pricing.basePrice') || this.isModified('pricing.taxRate')) {
    this.pricing.taxAmount = Math.round(this.pricing.basePrice * this.pricing.taxRate);
    this.pricing.totalAmount = this.pricing.basePrice + this.pricing.taxAmount;
  }

  // Update next billing date
  if (this.isModified('period.startDate') || this.isNew) {
    const startDate = new Date(this.period.startDate);
    const nextBilling = new Date(startDate);

    if (this.billingCycle === 'monthly') {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }

    this.renewal.nextBillingDate = nextBilling;
  }

  this.updatedAt = new Date();
  next();
});

/**
 * Instance methods
 */

/**
 * Get subscription plan details
 */
subscriptionSchema.methods.getPlanDetails = function() {
  return SUBSCRIPTION_PLANS[this.plan] || null;
};

/**
 * Calculate next billing amount
 */
subscriptionSchema.methods.calculateNextBilling = function() {
  const planDetails = this.getPlanDetails();
  if (!planDetails) return null;

  const basePrice = this.billingCycle === 'monthly'
    ? planDetails.monthlyPrice
    : planDetails.yearlyPrice;

  let totalAmount = basePrice;

  // Apply discount if applicable
  if (this.discount && this.discount.percent) {
    totalAmount *= (1 - this.discount.percent / 100);
  } else if (this.discount && this.discount.amount) {
    totalAmount -= this.discount.amount;
  }

  // Calculate tax
  const taxAmount = Math.round(totalAmount * this.pricing.taxRate);
  totalAmount += taxAmount;

  return {
    basePrice,
    discount: this.discount,
    taxRate: this.pricing.taxRate,
    taxAmount,
    totalAmount: Math.max(0, totalAmount)
  };
};

/**
 * Renew subscription
 */
subscriptionSchema.methods.renew = async function(paymentDetails = {}) {
  const now = new Date();
  const oldEndDate = new Date(this.period.endDate);
  const planDetails = this.getPlanDetails();

  // Calculate new period
  const newEndDate = new Date(oldEndDate);
  if (this.billingCycle === 'monthly') {
    newEndDate.setMonth(newEndDate.getMonth() + 1);
  } else {
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
  }

  // Update period
  this.period.startDate = oldEndDate;
  this.period.endDate = newEndDate;

  // Update status
  this.status = 'active';

  // Update renewal info
  this.renewal.lastRenewalDate = now;
  this.renewal.nextBillingDate = newEndDate;
  this.renewal.renewalCount++;
  this.renewal.totalRenewals++;

  // Update pricing
  const nextBilling = this.calculateNextBilling();
  if (nextBilling) {
    this.pricing.basePrice = nextBilling.basePrice;
    this.pricing.taxAmount = nextBilling.taxAmount;
    this.pricing.totalAmount = nextBilling.totalAmount;
  }

  // Update payment info
  if (paymentDetails.transactionId) {
    this.payment.transactionId = paymentDetails.transactionId;
  }
  if (paymentDetails.paymentVoucherUrl) {
    this.payment.paymentVoucherUrl = paymentDetails.paymentVoucherUrl;
  }

  return this.save();
};

/**
 * Upgrade or downgrade plan
 */
subscriptionSchema.methods.changePlan = async function(newPlan, billingCycle, reason = '', userId) {
  const oldPlan = this.plan;

  // Record plan change
  this.planChanges.push({
    from: oldPlan,
    to: newPlan,
    changedAt: new Date(),
    reason,
    changedBy: userId
  });

  // Update plan
  this.plan = newPlan;
  if (billingCycle) {
    this.billingCycle = billingCycle;
  }

  // Update pricing
  const planDetails = this.getPlanDetails();
  if (planDetails) {
    this.pricing.basePrice = billingCycle === 'monthly'
      ? planDetails.monthlyPrice
      : planDetails.yearlyPrice;
  }

  return this.save();
};

/**
 * Cancel subscription
 */
subscriptionSchema.methods.cancel = async function(reason = '', reasonDetails = '', cancelledBy) {
  const now = new Date();

  this.status = 'cancelled';
  this.autoRenew = false;
  this.cancellation.requestedAt = now;
  this.cancellation.effectiveDate = this.period.endDate; // Cancel at period end
  this.cancellation.reason = reason;
  this.cancellation.reasonDetails = reasonDetails;
  this.cancellation.cancelledBy = cancelledBy;

  return this.save();
};

/**
 * Suspend subscription
 */
subscriptionSchema.methods.suspend = async function() {
  this.status = 'suspended';
  return this.save();
};

/**
 * Reactivate subscription
 */
subscriptionSchema.methods.reactivate = async function() {
  const now = new Date();

  if (this.status === 'suspended' || this.status === 'cancelled') {
    // Check if period has ended
    if (now > this.period.endDate) {
      // Create new period starting from now
      const newEndDate = new Date(now);
      if (this.billingCycle === 'monthly') {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      } else {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      }
      this.period.startDate = now;
      this.period.endDate = newEndDate;
    }

    this.status = 'active';
    this.autoRenew = true;
    this.cancellation.requestedAt = null;
  }

  return this.save();
};

/**
 * Check if subscription is expiring soon
 */
subscriptionSchema.methods.isExpiringSoon = function(daysThreshold = 7) {
  const daysRemaining = this.daysRemaining;
  return daysRemaining > 0 && daysRemaining <= daysThreshold;
};

/**
 * Get effective quota (considering custom overrides)
 */
subscriptionSchema.methods.getEffectiveQuota = function() {
  const planDetails = this.getPlanDetails();
  const baseQuota = planDetails ? planDetails.quota : {};

  return {
    maxUsers: this.customQuota?.maxUsers ?? baseQuota.maxUsers ?? 100,
    maxStorage: this.customQuota?.maxStorage ?? baseQuota.maxStorage ?? 50,
    maxVillages: this.customQuota?.maxVillages ?? baseQuota.maxVillages ?? 1,
    maxApiCallsPerDay: this.customQuota?.maxApiCallsPerDay ?? baseQuota.maxApiCallsPerDay ?? 10000,
    maxConcurrentSessions: this.customQuota?.maxConcurrentSessions ?? baseQuota.maxConcurrentSessions ?? 50
  };
};

/**
 * Static methods
 */

/**
 * Find active subscriptions
 */
subscriptionSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).populate('tenantId');
};

/**
 * Find subscriptions expiring soon
 */
subscriptionSchema.statics.findExpiringSoon = function(daysThreshold = 7) {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  return this.find({
    status: 'active',
    autoRenew: true,
    'period.endDate': {
      $gte: now,
      $lte: thresholdDate
    }
  }).populate('tenantId');
};

/**
 * Find overdue subscriptions
 */
subscriptionSchema.statics.findOverdue = function() {
  const now = new Date();

  return this.find({
    status: { $in: ['active', 'past_due'] },
    'period.endDate': { $lt: now }
  }).populate('tenantId');
};

/**
 * Get subscription statistics
 */
subscriptionSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        trial: { $sum: { $cond: [{ $eq: ['$status', 'trial'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        pastDue: { $sum: { $cond: [{ $eq: ['$status', 'past_due'] }, 1, 0] } },
        suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        monthlyRevenue: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$status', 'active'] },
                { $eq: ['$billingCycle', 'monthly'] }
              ]},
              '$pricing.totalAmount',
              0
            ]
          }
        },
        yearlyRevenue: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$status', 'active'] },
                { $eq: ['$billingCycle', 'yearly'] }
              ]},
              { $divide: ['$pricing.totalAmount', 12] },
              0
            ]
          }
        }
      }
    }
  ]);

  const result = stats[0] || {
    total: 0,
    trial: 0,
    active: 0,
    pastDue: 0,
    suspended: 0,
    cancelled: 0,
    expired: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0
  };

  // Calculate by plan
  const byPlan = await this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        revenue: { $sum: {
          $cond: [
            { $eq: ['$billingCycle', 'monthly'] },
            '$pricing.totalAmount',
            { $divide: ['$pricing.totalAmount', 12] }
          ]
        }}
      }
    }
  ]);

  return {
    ...result,
    mrr: Math.round((result.monthlyRevenue + result.yearlyRevenue) * 100) / 100,
    arr: Math.round((result.monthlyRevenue * 12 + result.yearlyRevenue) * 100) / 100,
    byPlan: byPlan.reduce((acc, item) => {
      acc[item._id] = { count: item.count, revenue: item.revenue };
      return acc;
    }, {})
  };
};

/**
 * Get available plans
 */
subscriptionSchema.statics.getAvailablePlans = function() {
  return SUBSCRIPTION_PLANS;
};

/**
 * Create the Subscription model
 */
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
module.exports.SUBSCRIPTION_PLANS = SUBSCRIPTION_PLANS;
