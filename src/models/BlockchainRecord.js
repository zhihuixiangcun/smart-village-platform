/**
 * 区块链存证模型
 * P2功能 - 阳光村务系统
 */

const mongoose = require('mongoose');

const blockchainRecordSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  recordType: {
    type: String,
    enum: ['financial', 'decision', 'project', 'contract', 'other'],
    required: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  data: mongoose.Schema.Types.Mixed,
  hash: {
    type: String,
    required: true,
    unique: true
  },
  blockchainHash: String,
  blockchainTimestamp: Date,
  timestamp: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BlockchainRecord', blockchainRecordSchema);
