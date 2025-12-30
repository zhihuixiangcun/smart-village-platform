/**
 * 应急队伍模型
 * P2功能 - 村级应急响应系统
 */

const mongoose = require('mongoose');

const emergencyTeamSchema = new mongoose.Schema({
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
    enum: ['rescue', 'medical', 'fire', 'security', 'logistics', 'command'],
    required: true
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  description: String,
  status: {
    type: String,
    enum: ['active', 'standby', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyTeam', emergencyTeamSchema);
