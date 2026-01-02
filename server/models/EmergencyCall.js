const mongoose = require('mongoose');

const emergencyCallSchema = new mongoose.Schema({
  // 呼叫ID
  callId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'EC' + Date.now() + Math.random().toString(36).substr(2, 9)
  },

  // 村庄ID
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 呼叫者信息
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 响应者信息
  responderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 位置信息
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    qrCodeLocationId: {
      type: String
    }
  },

  // 紧急类型
  emergencyType: {
    type: String,
    enum: ['fire', 'medical', 'accident', 'security', 'disaster', 'other'],
    required: true
  },

  // 优先级（1-5，1最高）
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },

  // 描述信息
  description: {
    type: String,
    maxlength: 1000
  },

  // 附件（图片、语音等）
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'audio', 'video', 'document']
    },
    url: {
      type: String,
      required: true
    },
    filename: String,
    size: Number,
    duration: Number // 音频/视频时长（秒）
  }],

  // 呼叫状态
  status: {
    type: String,
    enum: ['active', 'responded', 'processing', 'resolved', 'cancelled', 'false_alarm'],
    default: 'active',
    index: true
  },

  // 时间记录
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  responseTime: {
    type: Date
  },
  processingTime: {
    type: Date
  },
  resolvedTime: {
    type: Date
  },

  // 处理备注
  notes: {
    type: String,
    maxlength: 2000
  },

  // 处理结果
  resolution: {
    type: String,
    enum: ['resolved', 'referred', 'false_alarm', 'cancelled'],
  },

  // 相关人员通知记录
  notifications: [{
    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['sms', 'push', 'email', 'phone']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    }
  }],

  // 是否需要升级通知
  escalated: {
    type: Boolean,
    default: false
  },

  // 升级级别
  escalationLevel: {
    type: Number,
    min: 0,
    max: 3,
    default: 0
  },

  // 匿名标记（保护隐私）
  anonymous: {
    type: Boolean,
    default: false
  },

  // 元数据
  metadata: {
    userAgent: String,
    ip: String,
    deviceId: String,
    qrCodeData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // 如果是匿名状态，隐藏呼叫者信息
      if (ret.anonymous) {
        delete ret.callerId;
      }
      return ret;
    }
  }
});

// 索引优化
emergencyCallSchema.index({ villageId: 1, status: 1 });
emergencyCallSchema.index({ villageId: 1, createdAt: -1 });
emergencyCallSchema.index({ emergencyType: 1, status: 1 });
emergencyCallSchema.index({ priority: 1, status: 1 });

// 虚拟字段：响应时长（秒）
emergencyCallSchema.virtual('responseDuration').get(function() {
  if (this.responseTime && this.createdAt) {
    return Math.floor((this.responseTime - this.createdAt) / 1000);
  }
  return null;
});

// 虚拟字段：处理总时长（秒）
emergencyCallSchema.virtual('totalDuration').get(function() {
  const endTime = this.resolvedTime || this.processingTime || new Date();
  return Math.floor((endTime - this.createdAt) / 1000);
});

// 预保存中间件
emergencyCallSchema.pre('save', async function(next) {
  // 自动设置响应时间
  if (this.isModified('status') && this.status === 'responded' && !this.responseTime) {
    this.responseTime = new Date();
  }

  // 自动设置处理开始时间
  if (this.isModified('status') && this.status === 'processing' && !this.processingTime) {
    this.processingTime = new Date();
  }

  // 自动设置解决时间
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedTime) {
    this.resolvedTime = new Date();
    this.resolution = 'resolved';
  }

  next();
});

// 静态方法：获取活跃的紧急呼叫
emergencyCallSchema.statics.getActiveCalls = function(villageId) {
  return this.find({
    villageId,
    status: { $in: ['active', 'responded', 'processing'] }
  }).populate('callerId', 'name phone')
    .populate('responderId', 'name position')
    .sort({ priority: 1, createdAt: -1 });
};

// 静态方法：获取呼叫统计
emergencyCallSchema.statics.getStats = function(villageId, dateFrom, dateTo) {
  const matchCondition = {};

  if (villageId) {
    matchCondition.villageId = mongoose.Types.ObjectId(villageId);
  }

  if (dateFrom || dateTo) {
    matchCondition.createdAt = {};
    if (dateFrom) matchCondition.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchCondition.createdAt.$lte = new Date(dateTo);
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: {
          type: '$emergencyType',
          status: '$status'
        },
        count: { $sum: 1 },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $ne: ['$responseTime', null] },
              { $subtract: ['$responseTime', '$createdAt'] },
              null
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        totalCalls: { $sum: '$count' },
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count',
            avgResponseTime: '$avgResponseTime'
          }
        }
      }
    }
  ]);
};

// 实例方法：添加通知记录
emergencyCallSchema.methods.addNotification = function(personnelId, type, status = 'sent') {
  this.notifications.push({
    personnelId,
    type,
    status
  });
  return this.save();
};

// 实例方法：升级通知
emergencyCallSchema.methods.escalate = function() {
  this.escalated = true;
  this.escalationLevel = Math.min(this.escalationLevel + 1, 3);
  return this.save();
};

// 实例方法：格式化位置信息
emergencyCallSchema.methods.formatLocation = function() {
  return {
    lat: this.location.latitude,
    lng: this.location.longitude,
    address: this.location.address,
    description: this.location.description
  };
};

module.exports = mongoose.model('EmergencyCall', emergencyCallSchema);