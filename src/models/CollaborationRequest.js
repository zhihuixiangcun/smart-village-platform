/**
 * 跨村协作模型
 * P2功能 - 上级联动枢纽
 */

const mongoose = require('mongoose');

const collaborationRequestSchema = new mongoose.Schema({
  fromVillageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  toVillageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  type: {
    type: String,
    enum: ['resource_sharing', 'emergency_aid', 'personnel_exchange', 'joint_project', 'other'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  resources: [{
    type: String,
    quantity: Number
  }],
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CollaborationRequest', collaborationRequestSchema);
