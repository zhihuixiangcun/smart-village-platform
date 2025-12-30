/**
 * 政策分发模型
 * P2功能 - 上级联动枢纽
 */

const mongoose = require('mongoose');

const policyDistributionSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['agriculture', 'welfare', 'infrastructure', 'education', 'health', 'other'],
    required: true
  },
  content: String,
  source: String,
  receivedDate: {
    type: Date,
    default: Date.now
  },
  effectiveDate: Date,
  expiryDate: Date,
  status: {
    type: String,
    enum: ['pending', 'distributed', 'expired'],
    default: 'pending'
  },
  targetGroups: [String],
  distributedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  distributedAt: Date,
  distributionMessage: String
}, {
  timestamps: true
});

module.exports = mongoose.model('PolicyDistribution', policyDistributionSchema);
