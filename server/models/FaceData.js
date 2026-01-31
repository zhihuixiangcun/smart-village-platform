/**
 * FaceData Model
 * 存储用户人脸特征数据
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const faceDataSchema = new Schema({
  // 关联用户
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 人脸特征向量（128维或256维，取决于使用的算法）
  features: {
    type: [Number],
    required: true
  },

  // 村庄ID
  villageId: {
    type: String,
    default: 'default',
    index: true
  },

  // 是否激活
  isActive: {
    type: Boolean,
    default: true
  },

  // 注册元数据
  metadata: {
    // 注册设备信息
    deviceInfo: {
      type: String,
      default: ''
    },

    // 图像质量分数
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    },

    // 亮度和模糊度评估
    imageMetrics: {
      brightness: Number,
      sharpness: Number,
      noise: Number
    }
  },

  // 活体检测数据
  livenessData: {
    // 是否经过活体检测
    checked: {
      type: Boolean,
      default: false
    },

    // 检测方法（action、passive等）
    method: {
      type: String,
      enum: ['none', 'passive', 'action', '3d'],
      default: 'none'
    },

    // 检测分数
    score: {
      type: Number,
      min: 0,
      max: 1
    }
  },

  // 更新历史
  updateHistory: [{
    updatedAt: {
      type: Date,
      default: Date.now
    },

    reason: {
      type: String,
      enum: ['initial', 'update', 're_register', 'admin_update'],
      default: 'initial'
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },

    previousFeatures: [Number]
  }],

  // 安全标记
  securityFlags: {
    // 是否被管理员标记
    isFlagged: {
      type: Boolean,
      default: false
    },

    // 标记原因
    flagReason: {
      type: String
    },

    // 标记时间
    flaggedAt: {
      type: Date
    },

    // 标记者
    flaggedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // 软删除
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'face_data'
});

// 索引
faceDataSchema.index({ userId: 1, isActive: 1 });
faceDataSchema.index({ villageId: 1, isActive: 1 });
faceDataSchema.index({ createdAt: -1 });

// 虚拟字段：特征向量维度
faceDataSchema.virtual('featureDimension').get(function() {
  return this.features.length;
});

// 虚拟字段：年龄（天数）
faceDataSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// 实例方法：添加更新记录
faceDataSchema.methods.addUpdateRecord = function(reason, updatedBy) {
  this.updateHistory.push({
    updatedAt: new Date(),
    reason,
    updatedBy,
    previousFeatures: [...this.features]
  });
  return this.save();
};

// 实例方法：标记为可疑
faceDataSchema.methods.flag = function(reason, flaggedBy) {
  this.securityFlags.isFlagged = true;
  this.securityFlags.flagReason = reason;
  this.securityFlags.flaggedAt = new Date();
  this.securityFlags.flaggedBy = flaggedBy;
  return this.save();
};

// 静态方法：获取村庄所有人脸数据
faceDataSchema.statics.getAllByVillage = function(villageId) {
  return this.find({
    villageId,
    isActive: true,
    deletedAt: null
  }).populate('userId', 'name phone role');
};

// 静态方法：批量更新特征
faceDataSchema.statics.batchUpdateFeatures = async function(updates) {
  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: { _id: update._id },
      update: {
        $set: {
          features: update.features,
          updatedAt: new Date()
        },
        $push: {
          updateHistory: {
            updatedAt: new Date(),
            reason: update.reason || 'update',
            updatedBy: update.updatedBy,
            previousFeatures: update.previousFeatures
          }
        }
      }
    }
  }));

  return this.bulkWrite(bulkOps);
};

// 中间件：更新前记录历史
faceDataSchema.pre('save', function(next) {
  if (this.isModified('features') && !this.isNew) {
    const previousFeatures = this._doc.features;
    this.updatedAt = new Date();
  }
  next();
});

// 中间件：软删除
faceDataSchema.methods.softDelete = function() {
  this.isActive = false;
  this.deletedAt = new Date();
  return this.save();
};

const FaceData = mongoose.model('FaceData', faceDataSchema);

module.exports = FaceData;
