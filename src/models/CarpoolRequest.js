/**
 * 拼车请求模型
 * P2功能 - 乡村生活服务圈
 */

const mongoose = require('mongoose');

const carpoolRequestSchema = new mongoose.Schema({
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
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  departureTime: {
    type: Date,
    required: true
  },
  seats: {
    type: Number,
    required: true,
    min: 1
  },
  cost: {
    type: Number,
    default: 0
  },
  notes: String,
  status: {
    type: String,
    enum: ['open', 'full', 'completed', 'cancelled'],
    default: 'open'
  },
  passengers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    pickupLocation: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('CarpoolRequest', carpoolRequestSchema);
