/**
 * 村务决策模型
 * P2功能 - 阳光村务系统
 */

const mongoose = require('mongoose');

const villageDecisionSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  proposer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['finance', 'infrastructure', 'welfare', 'policy', 'other'],
    required: true
  },
  description: String,
  options: [{
    _id: false,
    text: {
      type: String,
      required: true
    },
    description: String
  }],
  votingDeadline: Date,
  status: {
    type: String,
    enum: ['draft', 'voting', 'passed', 'rejected', 'cancelled'],
    default: 'voting'
  },
  votes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    selectedOption: String,
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  result: {
    winningOption: String,
    totalVotes: Number,
    announcedAt: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VillageDecision', villageDecisionSchema);
