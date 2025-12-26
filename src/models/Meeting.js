/**
 * 会议模型
 */

const mongoose = require('mongoose');

// 会议类型
const MeetingTypes = {
  REGULAR: 'regular',         // 常规会议
  EMERGENCY: 'emergency',     // 紧急会议
  PUBLIC: 'public',         // 村民大会
  COMMITTEE: 'committee',     // 村委会议
  OTHER: 'other'            // 其他
};

// 会议状态
const MeetingStatus = {
  SCHEDULED: 'scheduled',     // 已安排
  IN_PROGRESS: 'in_progress', // 进行中
  COMPLETED: 'completed',     // 已完成
  CANCELLED: 'cancelled'      // 已取消
};

const MeetingSchema = new mongoose.Schema({
  // 基础信息
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: String,
  agenda: [String],

  // 分类信息
  type: {
    type: String,
    enum: Object.values(MeetingTypes),
    required: true
  },
  category: String,

  // 时间安排
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: Number, // 会议时长（分钟）

  // 会议地点
  location: {
    type: String,
    required: true,
    maxlength: 200
  },
  meetingMode: {
    type: String,
    enum: ['offline', 'online', 'hybrid'],
    default: 'offline'
  },
  onlineLink: String,
  meetingRoom: String,

  // 组织信息
  organizer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    name: String,
    department: String
  },

  // 参会人员
  participants: [{
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    name: String,
    phone: String,
    role: String, // 角色：主持人、记录员、参会人等
    required: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['invited', 'confirmed', 'attended', 'absent'],
      default: 'invited'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    confirmedAt: Date,
    attendedAt: Date,
    absenceReason: String
  }],

  // 会议材料
  materials: [{
    name: String,
    type: {
      type: String,
      enum: ['agenda', 'minutes', 'report', 'presentation', 'document']
    },
    url: String,
    uploadTime: {
      type: Date,
      default: Date.now
    }
  }],

  // 会议记录
  minutes: {
    summary: String,
    decisions: [String],
    actionItems: [{
      task: String,
      responsible: {
        userId: { type: mongoose.Schema.Types.ObjectId },
        name: String
      },
      deadline: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'overdue'],
        default: 'pending'
      }
    }],
    attachments: [{
      filename: String,
      path: String
    }]
  },

  // 会议状态
  status: {
    type: String,
    enum: Object.values(MeetingStatus),
    default: 'scheduled'
  },

  // 取消原因
  cancelReason: String,
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 关联信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 创建和更新信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
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
  collection: 'meetings'
});

// 索引定义
MeetingSchema.index({ villageId: 1, startTime: -1 });
MeetingSchema.index({ status: 1, startTime: -1 });
MeetingSchema.index({ organizer: 1 });
MeetingSchema.index({ 'participants.status': 1 });

module.exports = mongoose.model('Meeting', MeetingSchema);