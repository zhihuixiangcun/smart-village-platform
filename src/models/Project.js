/**
 * 工程项目模型（阳光村务）
 * P2功能 - 阳光村务系统
 */

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
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
    enum: ['road', 'water', 'building', 'environment', 'other'],
    required: true
  },
  description: String,
  budget: {
    type: Number,
    required: true
  },
  actualCost: {
    type: Number,
    default: 0
  },
  startDate: Date,
  endDate: Date,
  actualEndDate: Date,
  contractor: {
    name: String,
    phone: String,
    company: String
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  beforePhoto: String,
  afterPhoto: String,
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'completed', 'suspended', 'cancelled'],
    default: 'planning'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
