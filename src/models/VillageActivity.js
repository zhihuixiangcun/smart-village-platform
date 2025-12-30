/**
 * 乡村活动模型
 * P2功能 - 乡村生活服务圈
 */

const mongoose = require('mongoose');

const villageActivitySchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['cultural', 'sports', 'education', 'welfare', 'agriculture', 'other'],
    required: true
  },
  description: String,
  images: [String],
  video: String,
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  location: String,
  maxParticipants: Number,
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('VillageActivity', villageActivitySchema);
