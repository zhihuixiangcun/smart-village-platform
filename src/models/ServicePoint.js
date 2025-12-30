/**
 * 便民服务点模型
 * P2功能 - 乡村生活服务圈
 */

const mongoose = require('mongoose');

const servicePointSchema = new mongoose.Schema({
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
    enum: ['medical', 'postal', 'financial', 'logistics', 'retail', 'other'],
    required: true
  },
  address: String,
  phone: String,
  hours: String,
  services: [String],
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ServicePoint', servicePointSchema);
