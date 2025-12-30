/**
 * 发票模型（财务透明化）
 * P2功能 - 阳光村务系统
 */

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  invoiceNumber: String,
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['infrastructure', 'public_service', 'welfare', 'administrative', 'other'],
    required: true
  },
  description: String,
  vendor: String,
  date: {
    type: Date,
    default: Date.now
  },
  image: String,
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);
