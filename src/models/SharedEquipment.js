/**
 * 共享设备模型
 * P2功能 - 乡村生活服务圈
 */

const mongoose = require('mongoose');

const sharedEquipmentSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['farm_machinery', 'tool', 'vehicle', 'other'],
    required: true
  },
  description: String,
  image: String,
  dailyCost: Number,
  deposit: Number,
  status: {
    type: String,
    enum: ['available', 'borrowed', 'maintenance'],
    default: 'available'
  },
  currentBorrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  borrowedAt: Date,
  expectedReturnDate: Date,
  condition: String
}, {
  timestamps: true
});

module.exports = mongoose.model('SharedEquipment', sharedEquipmentSchema);
