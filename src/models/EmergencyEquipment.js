/**
 * 应急救援设备模型
 * P2功能 - 村级应急响应系统
 */

const mongoose = require('mongoose');

const emergencyEquipmentSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['pump', 'fire_extinguisher', 'generator', 'rescue_boat', 'medical', 'shelter', 'other'],
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  location: String,
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' }
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'unavailable'],
    default: 'available'
  },
  expiryDate: Date,
  notes: String
}, {
  timestamps: true
});

// 为地理空间查询创建索引
emergencyEquipmentSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('EmergencyEquipment', emergencyEquipmentSchema);
