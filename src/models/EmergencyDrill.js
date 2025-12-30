/**
 * 应急演练记录模型
 * P2功能 - 村级应急响应系统
 */

const mongoose = require('mongoose');

const emergencyDrillSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['flood', 'fire', 'earthquake', 'epidemic', 'other'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  summary: String,
  evaluation: {
    score: Number,
    strengths: [String],
    weaknesses: [String],
    improvements: [String]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyDrill', emergencyDrillSchema);
