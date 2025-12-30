/**
 * 资源申请模型
 * P2功能 - 上级联动枢纽
 */

const mongoose = require('mongoose');

const resourceRequestSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  resourceType: {
    type: String,
    enum: ['funding', 'materials', 'equipment', 'personnel', 'emergency_dispatch'],
    required: true
  },
  quantity: Number,
  reason: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  neededBy: Date,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'dispatching', 'completed'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  responseNotes: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

module.exports = mongoose.model('ResourceRequest', resourceRequestSchema);
