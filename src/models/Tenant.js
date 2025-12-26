/**
 * Smart Village Platform - Tenant Model
 * 智慧乡村综合服务平台 - 租户模型
 *
 * Purpose:
 * - Multi-tenant data model for SaaS architecture
 * - Hierarchical structure: province > city > county > township > village
 * - Tenant isolation and quota management
 * - Subscription and billing integration
 *
 * Hierarchy:
 * Province (省级)
 *   └── City (市级)
 *       └── County (区县级)
 *           └── Township (乡镇级)
 *               └── Village (村级) - Primary tenant type for most operations
 *
 * @module smart-village/models/Tenant
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Tenant Schema Definition
 */
const tenantSchema = new Schema({
  // Basic Information
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Format:行政区划代码 (6 digits for village level)
    // Example: 110112 (Beijing, Daxing District)
    validate: {
      validator: function(v) {
        return /^[0-9]{6,12}$/.test(v);
      },
      message: '租户代码格式无效'
    }
  },

  name: {
    type: String,
    required: true,
    trim: true,
    // Example: "某某村村委会", "某某乡人民政府"
    maxlength: 100
  },

  type: {
    type: String,
    required: true,
    enum: ['province', 'city', 'county', 'township', 'village'],
    default: 'village',
    index: true
  },

  // Hierarchical Structure
  parentId: {
    type: String,
    default: null,
    // References parent tenant's code (not _id for easier imports)
    index: true
  },

  path: {
    type: String,
    // Full path in hierarchy: province.city.county.township.village
    // Example: "11.1101.110112.110112001.110112001001"
    index: true
  },

  level: {
    type: Number,
    // 1=province, 2=city, 3=county, 4=township, 5=village
    min: 1,
    max: 5,
    required: true
  },

  // Geographic Information
  location: {
    country: { type: String, default: '中国' },
    province: { type: String, required: true },
    provinceCode: { type: String, maxlength: 2 },
    city: { type: String },
    cityCode: { type: String, maxlength: 4 },
    county: { type: String },
    countyCode: { type: String, maxlength: 6 },
    township: { type: String },
    townshipCode: { type: String, maxlength: 9 },
    village: { type: String },
    villageCode: { type: String, maxlength: 12 },

    // Coordinates
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },

    // Address
    address: { type: String },
    postalCode: { type: String }
  },

  // Contact Information
  contact: {
    primaryContact: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      position: { type: String } // 职务
    },
    secondaryContact: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      position: { type: String }
    },
    emergencyContact: {
      name: { type: String },
      phone: { type: String }
    }
  },

  // Subscription & Billing
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription'
  },

  // Quota & Limits
  quota: {
    maxUsers: {
      type: Number,
      default: 100,
      // -1 means unlimited
      min: -1
    },
    maxVillages: {
      type: Number,
      default: 1,
      min: -1
    },
    maxStorage: {
      type: Number,
      default: 50, // GB
      min: -1
    },
    maxApiCallsPerDay: {
      type: Number,
      default: 10000,
      min: -1
    },
    maxConcurrentSessions: {
      type: Number,
      default: 50,
      min: -1
    }
  },

  // Current Usage (updated periodically)
  usage: {
    userCount: { type: Number, default: 0 },
    villageCount: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // GB
    apiCallsToday: { type: Number, default: 0 },
    lastApiReset: { type: Date }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'expired', 'pending'],
    default: 'pending',
    index: true
  },

  // Configuration
  settings: {
    // Language preferences
    defaultLanguage: {
      type: String,
      default: 'zh-CN',
      enum: ['zh-CN', 'zh-TW', 'en-US', 'pcc', 'pcc-qn']
    },

    // Timezone
    timezone: {
      type: String,
      default: 'Asia/Shanghai'
    },

    // Currency
    currency: {
      type: String,
      default: 'CNY'
    },

    // Date format
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD'
    },

    // Features enabled
    features: [{
      name: String,
      enabled: Boolean,
      config: Schema.Types.Mixed
    }],

    // Custom branding (for white-label deployments)
    branding: {
      logoUrl: String,
      primaryColor: { type: String, default: '#409EFF' },
      customDomain: String,
      customName: String
    },

    // Notification preferences
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    }
  },

  // Security
  security: {
    // IP whitelist (null means no restriction)
    ipWhitelist: [String],

    // Two-factor authentication requirement
    requireTwoFactor: {
      type: Boolean,
      default: false
    },

    // Password policy
    passwordPolicy: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: true },
      expiryDays: { type: Number, default: 90 }
    },

    // Session timeout (minutes)
    sessionTimeout: {
      type: Number,
      default: 480 // 8 hours
    }
  },

  // Metadata
  metadata: {
    // External system IDs (for integration)
    externalIds: {
      governmentSystem: String,
      taxId: String,
      organizationCode: String // 统一社会信用代码
    },

    // Classification
    classification: {
      // Administrative division type
      divisionType: {
        type: String,
        enum: ['urban', 'rural', 'mixed'],
        default: 'rural'
      },

      // Economic level
      economicLevel: {
        type: String,
        enum: ['developed', 'developing', 'underdeveloped'],
        default: 'developing'
      },

      // Population category
      populationCategory: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      }
    },

    // Statistics
    statistics: {
      householdCount: { type: Number, default: 0 },
      populationCount: { type: Number, default: 0 },
      area: { type: Number }, // Square kilometers
      arableLand: { type: Number } // Hectares
    },

    // Tags
    tags: [String]
  },

  // Audit fields
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
  },

  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },

  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  collection: 'tenants',
  timestamps: true,
  // Add virtuals to JSON output
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Indexes
 */
tenantSchema.index({ code: 1, status: 1 });
tenantSchema.index({ type: 1, status: 1 });
tenantSchema.index({ parentId: 1 });
tenantSchema.index({ path: 1 });
tenantSchema.index({ level: 1, status: 1 });
tenantSchema.index({ 'location.provinceCode': 1 });
tenantSchema.index({ deletedAt: 1 });

/**
 * Virtuals
 */

// Virtual for subscription
tenantSchema.virtual('subscription', {
  ref: 'Subscription',
  localField: 'subscriptionId',
  foreignField: '_id',
  justOne: true
});

// Virtual for parent tenant
tenantSchema.virtual('parent', {
  ref: 'Tenant',
  localField: 'parentId',
  foreignField: 'code',
  justOne: true
});

// Virtual for child tenants
tenantSchema.virtual('children', {
  ref: 'Tenant',
  localField: 'code',
  foreignField: 'parentId',
  justOne: false
});

// Virtual for active status
tenantSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for usage percentage
tenantSchema.virtual('storageUsagePercent').get(function() {
  if (this.quota.maxStorage === -1) return 0;
  return Math.round((this.usage.storageUsed / this.quota.maxStorage) * 100);
});

tenantSchema.virtual('userUsagePercent').get(function() {
  if (this.quota.maxUsers === -1) return 0;
  return Math.round((this.usage.userCount / this.quota.maxUsers) * 100);
});

/**
 * Pre-save middleware
 */
tenantSchema.pre('save', function(next) {
  // Update path based on parent
  if (this.isModified('parentId') || this.isNew) {
    this.updatePath();
  }

  // Update level based on type
  if (this.isModified('type') || this.isNew) {
    const levelMap = {
      province: 1,
      city: 2,
      county: 3,
      township: 4,
      village: 5
    };
    this.level = levelMap[this.type];
  }

  this.updatedAt = new Date();
  next();
});

/**
 * Instance methods
 */

/**
 * Update tenant path based on parent
 */
tenantSchema.methods.updatePath = async function() {
  if (!this.parentId) {
    this.path = this.code;
    return;
  }

  const parent = await this.constructor.findOne({ code: this.parentId });
  if (parent) {
    this.path = `${parent.path}.${this.code}`;
  } else {
    this.path = this.code;
  }
};

/**
 * Get tenant hierarchy (all ancestors)
 */
tenantSchema.methods.getAncestors = async function() {
  if (!this.parentId) return [];

  const ancestors = [];
  const pathParts = this.path.split('.');

  for (let i = 0; i < pathParts.length - 1; i++) {
    const ancestor = await this.constructor.findOne({ code: pathParts[i] });
    if (ancestor) {
      ancestors.push(ancestor);
    }
  }

  return ancestors;
};

/**
 * Get tenant descendants (all children, grandchildren, etc.)
 */
tenantSchema.methods.getDescendants = async function() {
  const descendants = await this.constructor.find({
    path: new RegExp(`^${this.path}\\.`)
  });

  return descendants;
};

/**
 * Check if tenant is ancestor of another tenant
 */
tenantSchema.methods.isAncestorOf = function(tenantCode) {
  return tenantCode.startsWith(`${this.path}.`);
};

/**
 * Check if tenant is descendant of another tenant
 */
tenantSchema.methods.isDescendantOf = function(tenantCode) {
  return this.path.startsWith(`${tenantCode}.`);
};

/**
 * Update usage statistics
 */
tenantSchema.methods.updateUsage = async function(updates) {
  Object.assign(this.usage, updates);
  return this.save();
};

/**
 * Check if quota is exceeded
 */
tenantSchema.methods.isQuotaExceeded = function(quotaType) {
  const max = this.quota[`max${quotaType.charAt(0).toUpperCase() + quotaType.slice(1)}`];
  const current = this.usage[quotaType];

  if (max === -1) return false; // Unlimited
  return current >= max;
};

/**
 * Activate tenant
 */
tenantSchema.methods.activate = async function() {
  this.status = 'active';
  return this.save();
};

/**
 * Suspend tenant
 */
tenantSchema.methods.suspend = async function(reason) {
  this.status = 'suspended';
  this.suspensionReason = reason;
  this.suspendedAt = new Date();
  return this.save();
};

/**
 * Static methods
 */

/**
 * Find tenant by code
 */
tenantSchema.statics.findByCode = function(code) {
  return this.findOne({ code, deletedAt: null });
};

/**
 * Find active tenants
 */
tenantSchema.statics.findActive = function() {
  return this.find({ status: 'active', deletedAt: null });
};

/**
 * Find tenants by type
 */
tenantSchema.statics.findByType = function(type) {
  return this.find({ type, deletedAt: null });
};

/**
 * Find tenants by parent
 */
tenantSchema.statics.findByParent = function(parentCode) {
  return this.find({ parentId: parentCode, deletedAt: null });
};

/**
 * Get tenant statistics
 */
tenantSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        byType: {
          $push: {
            type: '$type',
            status: '$status'
          }
        }
      }
    }
  ]);

  const result = stats[0] || { total: 0, active: 0, suspended: 0, expired: 0, byType: [] };

  // Count by type
  const typeCounts = {};
  result.byType.forEach(item => {
    if (!typeCounts[item.type]) {
      typeCounts[item.type] = { total: 0, active: 0 };
    }
    typeCounts[item.type].total++;
    if (item.status === 'active') {
      typeCounts[item.type].active++;
    }
  });

  return {
    total: result.total,
    active: result.active,
    suspended: result.suspended,
    expired: result.expired,
    byType: typeCounts
  };
};

/**
 * Soft delete tenant
 */
tenantSchema.methods.softDelete = async function(userId) {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.status = 'expired';
  return this.save();
};

/**
 * Restore tenant
 */
tenantSchema.methods.restore = async function() {
  this.deletedAt = null;
  this.deletedBy = null;
  this.status = 'active';
  return this.save();
};

/**
 * Create the Tenant model
 */
const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
