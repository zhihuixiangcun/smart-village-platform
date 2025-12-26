/**
 * 公告模型
 */

const mongoose = require('mongoose');

// 公告类型
const AnnouncementTypes = {
  NOTICE: 'notice',        // 通知公告
  POLICY: 'policy',        // 政策宣传
  ACTIVITY: 'activity',    // 活动通知
  MEETING: 'meeting',      // 会议通知
  EMERGENCY: 'emergency',  // 紧急通知
  OTHER: 'other'          // 其他
};

// 公告状态
const AnnouncementStatus = {
  DRAFT: 'draft',         // 草稿
  PUBLISHED: 'published',   // 已发布
  EXPIRED: 'expired',       // 已过期
  CANCELLED: 'cancelled'   // 已取消
};

const AnnouncementSchema = new mongoose.Schema({
  // 基础信息
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    maxlength: 500
  },

  // 分类信息
  type: {
    type: String,
    enum: Object.values(AnnouncementTypes),
    required: true,
    index: true
  },
  category: String,
  tags: [String],

  // 状态
  status: {
    type: String,
    enum: Object.values(AnnouncementStatus),
    default: 'draft',
    index: true
  },

  // 优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // 发布信息
  publishedAt: Date,
  expiresAt: Date,

  // 目标受众
  targetAudience: [{
    type: String,
    enum: ['all', 'residents', 'village_committee', 'party_members', 'elderly', 'children', 'women']
  }],
  targetVillages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  }],

  // 附件
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    type: String,
    size: Number,
    description: String
  }],

  // 阅读统计
  readCount: {
    type: Number,
    default: 0
  },
  readers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 评论互动
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 创建和更新信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'announcements'
});

// 索引定义
AnnouncementSchema.index({ status: 1, publishedAt: -1 });
AnnouncementSchema.index({ type: 1, status: 1 });
AnnouncementSchema.index({ villageId: 1, status: 1 });
AnnouncementSchema.index({ priority: -1, publishedAt: -1 });
AnnouncementSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Announcement', AnnouncementSchema);