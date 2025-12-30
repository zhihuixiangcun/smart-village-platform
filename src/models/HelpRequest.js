/**
 * 邻里互助请求模型
 * P2功能 - 乡村生活服务圈
 */

const mongoose = require('mongoose');

const helpRequestSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['farm_help', 'elderly_care', 'childcare', 'transport', 'repair', 'other'],
    required: true
  },
  description: String,
  points: {
    type: Number,
    default: 10
  },
  urgentUntil: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  respondents: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    respondedAt: {
      type: Date,
      default: Date.now
    }
  }],
  selectedRespondent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('HelpRequest', helpRequestSchema);
