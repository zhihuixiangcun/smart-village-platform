/**
 * 村民行为日志模型
 * 记录村民在平台上的所有行为数据
 */

const mongoose = require('mongoose');

const behaviorLogSchema = new mongoose.Schema({
  // 基础信息
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 行为信息
  action: {
    type: String,
    required: true,
    enum: [
      // 登录认证类
      'login', 'logout', 'register', 'password_change',

      // 信息浏览类
      'profile_view', 'announcement_read', 'policy_view', 'document_view',
      'financial_info_view', 'announcement_search', 'resident_search',

      // 互动参与类
      'vote_participate', 'comment_post', 'comment_reply', 'like_action',
      'share_action', 'follow_action', 'suggestion_submit', 'feedback_provide',

      // 服务办理类
      'document_apply', 'certificate_apply', 'benefit_apply', 'subsidy_apply',
      'service_request', 'appointment_book', 'payment_process',

      // 社区互动类
      'help_request', 'help_provide', 'neighbor_interact', 'message_send',
      'group_join', 'activity_participate', 'volunteer_register',

      // 内容创作类
      'announcement_create', 'article_publish', 'photo_upload', 'video_upload',
      'event_organize', 'poll_create',

      // 系统操作类
      'settings_update', 'preference_change', 'notification_manage',
      'data_export', 'report_generate', 'backup_create'
    ]
  },

  category: {
    type: String,
    required: true,
    enum: ['engagement', 'activity', 'participation', 'interaction', 'transaction', 'safety'],
    index: true
  },

  // 行为上下文
  context: {
    page: {
      type: String,
      required: true
    },
    module: {
      type: String,
      required: true,
      enum: [
        'dashboard', 'resident_management', 'village_affairs', 'financial_management',
        'emergency_response', 'community_services', 'announcements', 'documents',
        'voting', 'help_center', 'settings', 'mobile_app'
      ]
    },
    operation: {
      type: String,
      required: true
    },
    result: {
      type: String,
      enum: ['success', 'failure', 'partial', 'pending'],
      default: 'success'
    },
    error: {
      type: String
    },
    duration: {
      type: Number, // 操作耗时（毫秒）
      min: 0
    }
  },

  // 元数据
  metadata: {
    // 技术信息
    ip: {
      type: String,
      index: true
    },
    userAgent: String,
    sessionId: String,
    referrer: String,
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown']
      },
      os: String,
      browser: String
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },

    // 业务信息
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      // 可以关联到任何模型
    },
    relatedEntityType: {
      type: String,
      enum: ['announcement', 'document', 'financial_record', 'emergency_event', 'vote', 'help_request']
    },
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    }
  },

  // 行为量化
  metrics: {
    score: {
      type: Number,
      default: 1,
      min: 0
    },
    importance: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    engagementLevel: {
      type: String,
      enum: ['passive', 'active', 'proactive', 'leadership'],
      default: 'active'
    },
    communityImpact: {
      type: String,
      enum: ['individual', 'family', 'neighborhood', 'village', 'external'],
      default: 'individual'
    }
  },

  // 时间信息
  timestamp: {
    type: Date,
    default: Date.now
    // 索引在 schema.index() 中定义，避免重复
  },

  // 会话信息
  sessionInfo: {
    sessionStart: Date,
    sessionDuration: Number,
    pagesViewed: Number,
    actionsInSession: Number
  },

  // 用户状态
  userState: {
    previousAction: String,
    actionSequence: [String],
    intent: String,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    }
  }
}, {
  timestamps: true,
  collection: 'behavior_logs'
});

// 复合索引优化查询性能
behaviorLogSchema.index({ residentId: 1, timestamp: -1 });
behaviorLogSchema.index({ villageId: 1, action: 1, timestamp: -1 });
behaviorLogSchema.index({ category: 1, timestamp: -1 });
behaviorLogSchema.index({ 'metadata.ip': 1, timestamp: -1 });
behaviorLogSchema.index({ timestamp: -1, action: 1 });

// TTL索引 - 自动删除超过2年的行为日志
behaviorLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

// 虚拟字段
behaviorLogSchema.virtual('isRecent').get(function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.timestamp > oneHourAgo;
});

behaviorLogSchema.virtual('isToday').get(function() {
  const today = new Date();
  return this.timestamp.toDateString() === today.toDateString();
});

behaviorLogSchema.virtual('session').get(function() {
  return {
    id: this.metadata?.sessionId,
    duration: this.sessionInfo?.sessionDuration,
    actions: this.sessionInfo?.actionsInSession
  };
});

// 静态方法
behaviorLogSchema.statics.logBehavior = async function(behaviorData) {
  try {
    // 自动计算行为得分
    const score = this.calculateActionScore(behaviorData.action);

    const behavior = new this({
      ...behaviorData,
      metrics: {
        ...behaviorData.metrics,
        score,
        importance: this.calculateImportance(score)
      }
    });

    return await behavior.save();
  } catch (error) {
    console.error('记录行为日志失败:', error);
    throw error;
  }
};

behaviorLogSchema.statics.calculateActionScore = function(action) {
  const scoreMap = {
    // 基础行为
    'login': 1, 'logout': 1, 'register': 5, 'password_change': 2,

    // 浏览行为
    'profile_view': 2, 'announcement_read': 1, 'policy_view': 3, 'document_view': 2,
    'financial_info_view': 2, 'announcement_search': 2, 'resident_search': 2,

    // 互动行为
    'vote_participate': 4, 'comment_post': 3, 'comment_reply': 3, 'like_action': 1,
    'share_action': 2, 'follow_action': 1, 'suggestion_submit': 4, 'feedback_provide': 3,

    // 服务办理
    'document_apply': 5, 'certificate_apply': 5, 'benefit_apply': 4, 'subsidy_apply': 4,
    'service_request': 3, 'appointment_book': 3, 'payment_process': 3,

    // 社区互动
    'help_request': 4, 'help_provide': 5, 'neighbor_interact': 3, 'message_send': 2,
    'group_join': 3, 'activity_participate': 4, 'volunteer_register': 5,

    // 内容创作
    'announcement_create': 5, 'article_publish': 4, 'photo_upload': 2, 'video_upload': 3,
    'event_organize': 5, 'poll_create': 4,

    // 系统操作
    'settings_update': 2, 'preference_change': 1, 'notification_manage': 1,
    'data_export': 3, 'report_generate': 3, 'backup_create': 2
  };

  return scoreMap[action] || 1;
};

behaviorLogSchema.statics.calculateImportance = function(score) {
  if (score <= 2) return 'low';
  if (score <= 3) return 'medium';
  return 'high';
};

// 获取村民行为统计
behaviorLogSchema.statics.getResidentBehaviorStats = function(residentId, timeRange) {
  const matchStage = { residentId };

  if (timeRange) {
    matchStage.timestamp = {
      $gte: timeRange.start,
      $lte: timeRange.end
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        totalScore: { $sum: '$metrics.score' },
        avgScore: { $avg: '$metrics.score' },
        uniqueDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } },
        actionBreakdown: {
          $push: {
            action: '$action',
            category: '$category',
            timestamp: '$timestamp',
            score: '$metrics.score'
          }
        },
        modules: { $addToSet: '$context.module' },
        devices: { $addToSet: '$metadata.device.type' },
        engagementLevel: { $last: '$metrics.engagementLevel' }
      }
    },
    {
      $addFields: {
        uniqueDaysCount: { $size: '$uniqueDays' },
        avgActionsPerDay: { $divide: ['$totalActions', { $size: '$uniqueDays' }] },
        engagementTrend: {
          $cond: {
            if: { $gte: ['$engagementLevel', 'active'] },
            then: 'increasing',
            else: 'stable'
          }
        }
      }
    }
  ]);
};

// 获取村庄行为热力图
behaviorLogSchema.statics.getVillageBehaviorHeatmap = function(villageId, timeRange) {
  const matchStage = {
    villageId,
    'metadata.location.coordinates': { $exists: true, $ne: null }
  };

  if (timeRange) {
    matchStage.timestamp = {
      $gte: timeRange.start,
      $lte: timeRange.end
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          lng: { $round: [{ $arrayElemAt: ['$metadata.location.coordinates', 0] }, 4] },
          lat: { $round: [{ $arrayElemAt: ['$metadata.location.coordinates', 1] }, 4] }
        },
        actionCount: { $sum: 1 },
        totalScore: { $sum: '$metrics.score' },
        avgScore: { $avg: '$metrics.score' },
        topActions: { $push: '$action' },
        residents: { $addToSet: '$residentId' }
      }
    },
    {
      $addFields: {
        uniqueResidents: { $size: '$residents' },
        intensity: {
          $multiply: [
            { $divide: ['$actionCount', 10] },
            { $divide: ['$totalScore', '$actionCount'] }
          ]
        }
      }
    },
    {
      $project: {
        _id: 0,
        coordinates: '$_id',
        actionCount: 1,
        totalScore: 1,
        avgScore: 1,
        uniqueResidents: 1,
        intensity: 1,
        topActions: { $slice: ['$topActions', 5] }
      }
    },
    { $sort: { intensity: -1 } },
    { $limit: 1000 }
  ]);
};

// 行为模式分析
behaviorLogSchema.statics.analyzeBehaviorPatterns = function(villageId, timeRange) {
  const matchStage = { villageId };

  if (timeRange) {
    matchStage.timestamp = {
      $gte: timeRange.start,
      $lte: timeRange.end
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $addFields: {
        hour: { $hour: '$timestamp' },
        dayOfWeek: { $dayOfWeek: '$timestamp' },
        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
      }
    },
    {
      $facet: {
        // 时间分布模式
        timePatterns: [
          {
            $group: {
              _id: {
                hour: '$hour',
                dayOfWeek: '$dayOfWeek'
              },
              actionCount: { $sum: 1 },
              totalScore: { $sum: '$metrics.score' }
            }
          },
          {
            $group: {
              _id: '$_id.hour',
              avgActions: { $avg: '$actionCount' },
              totalActions: { $sum: '$actionCount' }
            }
          },
          { $sort: { '_id': 1 } }
        ],

        // 行为序列模式
        sequencePatterns: [
          {
            $sort: { residentId: 1, timestamp: 1 }
          },
          {
            $group: {
              _id: '$residentId',
              actionSequence: { $push: '$action' },
              avgScore: { $avg: '$metrics.score' },
              totalActions: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: '$actionSequence',
              frequency: { $sum: 1 },
              avgUserScore: { $avg: '$avgScore' }
            }
          },
          { $sort: { frequency: -1 } },
          { $limit: 10 }
        ],

        // 模块使用模式
        modulePatterns: [
          {
            $group: {
              _id: '$context.module',
              actionCount: { $sum: 1 },
              uniqueUsers: { $addToSet: '$residentId' },
              avgDuration: { $avg: '$context.duration' },
              successRate: {
                $avg: {
                  $cond: [{ $eq: ['$context.result', 'success'] }, 1, 0]
                }
              }
            }
          },
          {
            $addFields: {
              uniqueUserCount: { $size: '$uniqueUsers' },
              engagementRate: {
                $multiply: [
                  { $divide: ['$uniqueUserCount', 100] }, // 假设总村民数为100
                  100
                ]
              }
            }
          },
          { $sort: { actionCount: -1 } }
        ],

        // 用户活跃度模式
        activityPatterns: [
          {
            $group: {
              _id: {
                date: '$date',
                residentId: '$residentId'
              },
              dailyActions: { $sum: 1 },
              dailyScore: { $sum: '$metrics.score' }
            }
          },
          {
            $group: {
              _id: '$_id.date',
              activeUsers: { $sum: 1 },
              totalActions: { $sum: '$dailyActions' },
              totalScore: { $sum: '$dailyScore' },
              avgActionsPerUser: { $avg: '$dailyActions' }
            }
          },
          { $sort: { '_id': 1 } }
        ]
      }
    }
  ]);
};

module.exports = mongoose.model('BehaviorLog', behaviorLogSchema);