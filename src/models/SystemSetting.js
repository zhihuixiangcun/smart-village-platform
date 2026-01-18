/**
 * System Setting Model
 * 系统设置数据模型
 */

const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  // 设置键（唯一标识）
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },

  // 设置分类
  category: {
    type: String,
    required: true,
    enum: ['basic', 'notification', 'security', 'data', 'system'],
    default: 'system'
  },

  // 设置值（支持多种类型）
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 值类型（用于前端渲染）
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },

  // 设置标题
  title: {
    type: String,
    required: true,
    trim: true
  },

  // 设置描述
  description: {
    type: String,
    trim: true
  },

  // 设置选项（用于枚举值）
  options: [{
    label: String,
    value: mongoose.Schema.Types.Mixed
  }],

  // 是否敏感设置
  isSensitive: {
    type: Boolean,
    default: false
  },

  // 是否可编辑（某些设置只读）
  editable: {
    type: Boolean,
    default: true
  },

  // 是否需要重启才能生效
  requiresRestart: {
    type: Boolean,
    default: false
  },

  // 默认值
  defaultValue: {
    type: mongoose.Schema.Types.Mixed
  },

  // 验证规则
  validation: {
    required: {
      type: Boolean,
      default: true
    },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'email', 'url', 'phone']
    },
    min: Number,
    max: Number,
    pattern: String
  },

  // 更新历史
  history: [{
    value: mongoose.Schema.Types.Mixed,
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 村ID（租户隔离）
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },

  // 元数据
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// 索引
systemSettingSchema.index({ key: 1, villageId: 1 }, { unique: true });
systemSettingSchema.index({ category: 1 });
systemSettingSchema.index({ createdAt: -1 });

// 方法：获取默认设置
systemSettingSchema.statics.getDefaultSettings = async function() {
  return this.find({ isDefault: true });
};

// 方法：按分类获取设置
systemSettingSchema.statics.getByCategory = async function(category, villageId) {
  const query = { category };
  if (villageId) {
    query.villageId = villageId;
  }
  return this.find(query).sort({ key: 1 });
};

// 方法：批量更新设置
systemSettingSchema.statics.batchUpdate = async function(updates, userId) {
  const operations = updates.map(update => ({
    updateOne: {
      filter: { key: update.key, villageId: update.villageId },
      update: {
        $set: {
          value: update.value,
          updatedAt: new Date(),
          $push: {
            history: {
              value: update.previousValue,
              updatedAt: new Date(),
              updatedBy: userId
            }
          }
        }
      }
    }
  }));

  return this.bulkWrite(operations);
};

// 保存历史记录限制
systemSettingSchema.pre('save', function(next) {
  if (this.history && this.history.length > 20) {
    this.history = this.history.slice(-20);
  }
  next();
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
