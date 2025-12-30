/**
 * 工程进度上报模型
 * P2功能 - 阳光村务系统
 */

const mongoose = require('mongoose');

const projectProgressSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: String,
  photo: String,
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  issues: [{
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    photos: [String]
  }],
  reportDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProjectProgress', projectProgressSchema);
