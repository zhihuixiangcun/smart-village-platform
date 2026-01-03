const mongoose = require('mongoose');

const documentCollectionSchema = new mongoose.Schema({
  // 基础信息
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  category: {
    type: String,
    enum: [
      'village_affairs',    // 村务
      'resident_info',      // 村民信息
      'financial',          // 财务
      'project',            // 项目
      'meeting',            // 会议
      'policy',             // 政策
      'emergency',          // 应急
      'statistics',         // 统计
      'construction',       // 建设
      'environment',        // 环境
      'social_welfare',     // 社会福利
      'public_service',     // 公共服务
      'other'               // 其他
    ],
    required: true
  },

  // 责任人信息
  collector: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    position: String,
    contact: String
  },

  // 收集时间
  collectionDate: {
    type: Date,
    required: true,
    index: true
  },
  deadline: Date,

  // 文档文件
  files: [{
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadTime: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    tags: [String],
    isPublic: {
      type: Boolean,
      default: false
    },
    accessLevel: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'secret'],
      default: 'internal'
    }
  }],

  // 关联信息
  relatedTo: [{
    type: {
      type: String,
      enum: ['task', 'meeting', 'project', 'resident', 'announcement', 'policy']
    },
    id: mongoose.Schema.Types.ObjectId,
    title: String
  }],

  // 数据字段（用于统计）
  dataFields: [{
    fieldName: String,
    fieldType: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'select', 'multiselect']
    },
    value: mongoose.Schema.Types.Mixed,
    unit: String,
    description: String
  }],

  // 处理状态
  status: {
    type: String,
    enum: ['collecting', 'reviewing', 'approved', 'rejected', 'archived'],
    default: 'collecting'
  },

  // 审核信息
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String,
    approved: Boolean
  },

  // 标签和关键词
  tags: [String],
  keywords: [String],

  // 位置信息（如果有实地收集）
  location: {
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    description: String
  },

  // 重要性和紧急程度
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // 统计数据（自动计算）
  statistics: {
    totalFiles: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    }
  },

  // 备注
  notes: String,

  // 创建和修改信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
documentCollectionSchema.index({ collector: 1, collectionDate: -1 });
documentCollectionSchema.index({ category: 1, status: 1 });
documentCollectionSchema.index({ tags: 1 });
documentCollectionSchema.index({ keywords: 1 });
documentCollectionSchema.index({ 'relatedTo.type': 1, 'relatedTo.id': 1 });
documentCollectionSchema.index({ deadline: 1 });
documentCollectionSchema.index({ priority: 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定

// 全文搜索索引
documentCollectionSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  keywords: 'text',
  'files.originalName': 'text',
  'files.description': 'text'
});

// 虚拟字段
documentCollectionSchema.virtual('isOverdue').get(function() {
  return this.deadline && new Date() > this.deadline && this.status !== 'completed';
});

documentCollectionSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.deadline) return null;
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

documentCollectionSchema.virtual('totalFileSize').get(function() {
  return this.files.reduce((total, file) => total + (file.size || 0), 0);
});

// 实例方法
documentCollectionSchema.methods.addFile = function(fileData, uploadedBy) {
  this.files.push({
    ...fileData,
    uploadedBy,
    uploadTime: new Date()
  });

  // 更新统计
  this.statistics.totalFiles = this.files.length;
  this.statistics.totalSize = this.files.reduce((total, file) => total + (file.size || 0), 0);

  return this.save();
};

documentCollectionSchema.methods.updateStatus = function(newStatus, reviewerId, notes) {
  this.status = newStatus;

  if (newStatus === 'approved' || newStatus === 'rejected') {
    this.review.reviewedBy = reviewerId;
    this.review.reviewedAt = new Date();
    this.review.reviewNotes = notes;
    this.review.approved = newStatus === 'approved';
  }

  return this.save();
};

documentCollectionSchema.methods.incrementView = function() {
  this.statistics.viewCount++;
  return this.save();
};

documentCollectionSchema.methods.incrementDownload = function() {
  this.statistics.downloadCount++;
  return this.save();
};

// 静态方法
documentCollectionSchema.statics.findByCollector = function(userId, startDate, endDate) {
  const query = { 'collector.userId': userId };

  if (startDate && endDate) {
    query.collectionDate = {
      $gte: startDate,
      $lte: endDate
    };
  }

  return this.find(query)
    .populate('collector.userId', 'name email phone')
    .populate('createdBy', 'name')
    .sort({ collectionDate: -1 });
};

documentCollectionSchema.statics.findByCategory = function(category, status) {
  const query = { category };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('collector.userId', 'name position')
    .sort({ collectionDate: -1 });
};

documentCollectionSchema.statics.findOverdue = function() {
  return this.find({
    deadline: { $lt: new Date() },
    status: { $nin: ['approved', 'archived', 'rejected'] }
  })
    .populate('collector.userId', 'name phone email')
    .sort({ deadline: 1 });
};

documentCollectionSchema.statics.search = function(searchTerm, filters = {}) {
  const query = {
    $text: { $search: searchTerm }
  };

  // 应用过滤器
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.collectorId) {
    query['collector.userId'] = filters.collectorId;
  }
  if (filters.dateFrom || filters.dateTo) {
    query.collectionDate = {};
    if (filters.dateFrom) query.collectionDate.$gte = filters.dateFrom;
    if (filters.dateTo) query.collectionDate.$lte = filters.dateTo;
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('collector.userId', 'name position')
    .sort({ score: { $meta: 'textScore' } });
};

documentCollectionSchema.statics.getStatistics = function(userId, startDate, endDate) {
  const matchStage = {
    'collector.userId': mongoose.Types.ObjectId(userId),
    collectionDate: {
      $gte: startDate,
      $lte: endDate
    }
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCollections: { $sum: 1 },
        approvedCollections: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejectedCollections: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        pendingCollections: {
          $sum: { $cond: [{ $in: ['$status', ['collecting', 'reviewing']] }, 1, 0] }
        },
        totalFiles: { $sum: '$statistics.totalFiles' },
        totalSize: { $sum: '$statistics.totalSize' },
        categoryBreakdown: {
          $push: {
            category: '$category',
            count: 1
          }
        }
      }
    },
    {
      $addFields: {
        approvalRate: {
          $multiply: [
            { $divide: ['$approvedCollections', '$totalCollections'] },
            100
          ]
        }
      }
    }
  ]);
};

documentCollectionSchema.statics.getDailyWorkload = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'collector.userId': mongoose.Types.ObjectId(userId),
        collectionDate: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$collectionDate' } },
          status: '$status'
        },
        count: { $sum: 1 },
        totalFiles: { $sum: '$statistics.totalFiles' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            files: '$totalFiles'
          }
        },
        totalCount: { $sum: '$count' },
        totalFiles: { $sum: '$totalFiles' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('DocumentCollection', documentCollectionSchema);