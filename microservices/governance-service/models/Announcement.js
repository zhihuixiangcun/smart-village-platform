/**
 * 公告模型
 * 用于管理村务公告、政策宣传等信息发布
 */

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  summary: {
    type: String,
    maxlength: 500
  },

  // 分类和类型
  category: {
    type: String,
    required: true,
    enum: ['政策宣传', '村务通知', '会议通知', '活动公告', '紧急通知', '财务公开', '项目公示', '其他'],
    default: '村务通知'
  },
  type: {
    type: String,
    required: true,
    enum: ['普通公告', '重要公告', '紧急公告', '政策文件'],
    default: '普通公告'
  },

  // 目标受众
  targetAudience: {
    type: String,
    enum: ['全体村民', '党员', '村干部', '特定群体', '外部访问者'],
    default: '全体村民'
  },
  targetGroups: [{
    type: String,
    enum: ['老年人', '青年人', '学生', '企业主', '农户', '低保户', '党员', '团员']
  }],

  // 发布信息
  publisher: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    name: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    }
  },
  publishDate: {
    type: Date,
    default: Date.now
  },

  // 有效期
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },

  // 状态管理
  status: {
    type: String,
    enum: ['草稿', '待审核', '已发布', '已过期', '已撤回'],
    default: '草稿'
  },
  priority: {
    type: String,
    enum: ['低', '中', '高', '紧急'],
    default: '中'
  },

  // 审核流程
  reviewProcess: [{
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewerName: String,
    action: {
      type: String,
      enum: ['提交', '审核', '批准', '驳回', '撤回']
    },
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 附件和媒体
  attachments: [{
    type: {
      type: String,
      enum: ['图片', '文档', '视频', '音频'],
      required: true
    },
    name: String,
    url: String,
    size: Number,
    mimeType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // 位置信息
  locations: [{
    type: {
      type: String,
      enum: ['全村', '自然村', '小组', '具体地址'],
      required: true
    },
    name: String,
    code: String
  }],

  // 互动数据
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    readReceipts: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      },
      device: String,
      ip: String
    }]
  },

  // 评论和反馈
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement.comments'
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    status: {
      type: String,
      enum: ['正常', '已删除', '已隐藏'],
      default: '正常'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 语音播报
  voiceBroadcast: {
    enabled: {
      type: Boolean,
      default: false
    },
    audioUrl: String,
    audioText: String,
    broadcastTimes: [{
      time: String, // 格式: "08:00"
      repeat: {
        type: String,
        enum: ['每天', '工作日', '周末', '仅一次', '自定义'],
        default: '仅一次'
      },
      enabled: {
        type: Boolean,
        default: true
      }
    }],
    targetGroups: [String],
    lastBroadcast: Date
  },

  // 推送通知
  pushNotification: {
    enabled: {
      type: Boolean,
      default: true
    },
    title: String,
    content: String,
    scheduledTime: Date,
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    recipients: {
      type: Number,
      default: 0
    }
  },

  // 相关政策
  relatedPolicies: [{
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Policy'
    },
    title: String,
    relevance: {
      type: String,
      enum: ['直接相关', '间接相关', '参考'],
      default: '参考'
    }
  }],

  // 多语言支持
  translations: {
    'pcc': {
      title: String,
      content: String,
      summary: String
    },
    'pcc-qn': {
      title: String,
      content: String,
      summary: String
    },
    'en': {
      title: String,
      content: String,
      summary: String
    }
  },

  // 版本控制
  version: {
    type: Number,
    default: 1
  },
  history: [{
    version: Number,
    title: String,
    content: String,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changeReason: String
  }],

  // 标签和关键词
  tags: [String],
  keywords: [String],

  // 元数据
  metadata: {
    source: {
      type: String,
      enum: ['系统创建', '手动录入', '文件导入', '上级下发'],
      default: '手动录入'
    },
    sourceId: String,
    author: String,
    contact: String,
    reference: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
announcementSchema.index({ title: 'text', content: 'text', summary: 'text' });
announcementSchema.index({ category: 1, status: 1, publishDate: -1 });
announcementSchema.index({ publisher: 1, publishDate: -1 });
announcementSchema.index({ targetAudience: 1, status: 1 });
announcementSchema.index({ 'locations.code': 1 });
announcementSchema.index({ tags: 1 });
announcementSchema.index({ keywords: 1 });
announcementSchema.index({ effectiveDate: 1, expiryDate: 1 });

// 虚拟字段
announcementSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

announcementSchema.virtual('isEffective').get(function() {
  const now = new Date();
  return this.effectiveDate <= now && (!this.expiryDate || this.expiryDate > now);
});

announcementSchema.virtual('readRate').get(function() {
  // 这里需要根据目标村民总数来计算
  return this.metrics.views > 0 ? (this.metrics.readReceipts.length / this.metrics.views) * 100 : 0;
});

// 中间件
announcementSchema.pre('save', function(next) {
  // 自动生成摘要
  if (this.content && !this.summary) {
    this.summary = this.content.substring(0, 200) + '...';
  }

  // 设置过期状态
  if (this.isExpired && this.status === '已发布') {
    this.status = '已过期';
  }

  next();
});

// 静态方法
announcementSchema.statics.findByCategory = function(category, options = {}) {
  const query = { category, status: '已发布' };

  if (options.targetAudience) {
    query.targetAudience = options.targetAudience;
  }

  if (options.location) {
    query['locations.code'] = options.location;
  }

  return this.find(query)
    .sort({ publishDate: -1 })
    .limit(options.limit || 20);
};

announcementSchema.statics.findActiveAnnouncements = function(options = {}) {
  const now = new Date();
  const query = {
    status: '已发布',
    effectiveDate: { $lte: now },
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: now } }
    ]
  };

  if (options.category) {
    query.category = options.category;
  }

  if (options.priority) {
    query.priority = options.priority;
  }

  return this.find(query)
    .sort({ priority: -1, publishDate: -1 })
    .limit(options.limit || 50);
};

// 实例方法
announcementSchema.methods.addComment = function(userId, userName, content, parentId = null) {
  this.comments.push({
    userId,
    userName,
    content,
    parentId,
    createdAt: new Date()
  });
  return this.save();
};

announcementSchema.methods.incrementView = function(userId, device, ip) {
  this.metrics.views++;

  // 添加阅读回执
  if (userId && !this.metrics.readReceipts.some(receipt => receipt.userId.toString() === userId.toString())) {
    this.metrics.readReceipts.push({
      userId,
      readAt: new Date(),
      device,
      ip
    });
  }

  return this.save();
};

announcementSchema.methods.like = function(userId) {
  const comment = this.comments.id(userId);
  if (comment && !comment.likes.includes(userId)) {
    comment.likes.push(userId);
  }
  return this.save();
};

announcementSchema.methods.publish = function(publisherId) {
  this.status = '已发布';
  this.publishDate = new Date();
  if (publisherId) {
    this.publisher.userId = publisherId;
  }
  return this.save();
};

module.exports = mongoose.model('Announcement', announcementSchema);