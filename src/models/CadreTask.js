/**
 * CadreTask Model
 * 村干部四象限任务管理模型 - 基于艾森豪威尔矩阵
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cadreTaskSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['governance', 'emergency', 'finance', 'service', 'infrastructure', 'agriculture', 'other'],
    default: 'governance'
  },
  quadrant: {
    type: String,
    enum: ['urgent-important', 'important-not-urgent', 'urgent-not-important', 'not-urgent-not-important'],
    required: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'pending'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  dueDate: Date,
  startDate: Date,
  completedAt: Date,
  estimatedHours: Number,
  actualHours: { type: Number, default: 0 },
  assignee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assigneeName: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  creatorName: String,
  collaborators: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    role: { type: String, enum: ['observer', 'contributor', 'reviewer'], default: 'contributor' }
  }],
  relatedVillage: { type: Schema.Types.ObjectId, ref: 'Village' },
  subtasks: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    dueDate: Date
  }],
  attachments: [{
    name: String, url: String, type: String, size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String, content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [String],
  completionCriteria: { type: String, maxlength: 500 },
  reviewers: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String, approved: { type: Boolean, default: false },
    feedback: String, reviewedAt: Date
  }],
  performanceScore: { type: Number, min: 0, max: 100 },
  villageId: { type: Schema.Types.ObjectId, ref: 'Village', required: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

cadreTaskSchema.index({ villageId: 1, status: 1 });
cadreTaskSchema.index({ assignee: 1, status: 1 });
cadreTaskSchema.index({ quadrant: 1, status: 1 });
cadreTaskSchema.index({ dueDate: 1, status: 1 });
cadreTaskSchema.index({ isDeleted: 1 });

cadreTaskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.status !== 'completed' && this.status !== 'cancelled' ? new Date() > this.dueDate : false;
});

cadreTaskSchema.statics.getTasksByQuadrant = function(villageId, quadrant, options = {}) {
  const query = { villageId, quadrant, isDeleted: false };
  if (options.status) query.status = options.status;
  return this.find(query).populate('assignee', 'username profile.nickName profile.avatar');
};

cadreTaskSchema.statics.getMyTasks = function(userId, villageId, options = {}) {
  const query = {
    villageId, isDeleted: false,
    : [{ assignee: userId }, { 'collaborators.user': userId }, { createdBy: userId }]
  };
  if (options.status) query.status = options.status;
  return this.find(query).populate('assignee', 'username profile.nickName profile.avatar');
};

module.exports = mongoose.model('CadreTask', cadreTaskSchema);
