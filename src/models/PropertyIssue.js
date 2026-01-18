const mongoose = require('mongoose');

const propertyIssueSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  type: {
    type: String,
    required: true,
    enum: ['facility', 'environment', 'security', 'noise', 'traffic', 'other']
  },
  
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  location: {
    area: {
      type: String,
      default: ''
    },
    building: String,
    unit: String,
    address: {
      type: String,
      default: ''
    }
  },
  
  photos: [{
    url: String,
    caption: String
  }],
  
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'closed', 'rejected'],
    default: 'pending'
  },
  
  handler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  assignedAt: Date,
  
  solution: {
    content: String,
    photos: [{
      url: String,
      caption: String
    }]
  },
  
  resolvedAt: Date,
  closedAt: Date,
  
  evaluation: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  },
  
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  likeCount: {
    type: Number,
    default: 0
  },
  
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  commentCount: {
    type: Number,
    default: 0
  },
  
  isPublic: {
    type: Boolean,
    default: true
  },
  
  anonymous: {
    type: Boolean,
    default: false
  },
  
  tags: [{
    type: String
  }],
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

propertyIssueSchema.index({ villageId: 1, status: 1, createdAt: -1 });
propertyIssueSchema.index({ villageId: 1, type: 1, status: 1 });
propertyIssueSchema.index({ userId: 1, status: 1 });

propertyIssueSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.userId.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ userId, createdAt: new Date() });
    this.likeCount = this.likes.length;
    return this.save();
  }
  return Promise.resolve(this);
};

propertyIssueSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.userId.toString() !== userId.toString());
  this.likeCount = this.likes.length;
  return this.save();
};

propertyIssueSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    userId,
    content,
    createdAt: new Date()
  });
  this.commentCount = this.comments.length;
  return this.save();
};

module.exports = mongoose.model('PropertyIssue', propertyIssueSchema);
