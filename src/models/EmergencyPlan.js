/**
 * 应急预案模型 - 简化版用于测试
 */

const mongoose = require('mongoose');

const EmergencyPlanStepSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    required: true,
    enum: ['notification', 'evacuation', 'resource_allocation', 'rescue', 'medical', 'security']
  },
  sequence: { type: Number, required: true }
});

const EmergencyPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  eventType: {
    type: String,
    required: true,
    enum: ['fire', 'flood', 'earthquake', 'accident', 'medical', 'weather', 'security']
  },
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'active', 'suspended'],
    default: 'draft'
  },
  steps: [EmergencyPlanStepSchema]
}, {
  timestamps: true,
  collection: 'emergency_plans'
});

module.exports = mongoose.model('EmergencyPlan', EmergencyPlanSchema);
