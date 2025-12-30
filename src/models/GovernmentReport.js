/**
 * 政府上报报表模型
 * P2功能 - 上级联动枢纽
 */

const mongoose = require('mongoose');

const governmentReportSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  reportType: {
    type: String,
    enum: ['population', 'finance', 'infrastructure', 'agriculture', 'emergency', 'population_sync'],
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  data: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'submitted', 'rejected'],
    default: 'pending_review'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: Date,
  approvalNotes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('GovernmentReport', governmentReportSchema);
